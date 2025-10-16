import {
  aggregateCoverage,
  computeValueDensity,
  normalizeLatency,
  percentile,
  updateEma,
} from 'common-types';

function normalSample() {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function gammaSample(shape) {
  if (shape <= 0) {
    return 0;
  }
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = normalSample();
    let v = 1 + c * x;
    if (v <= 0) {
      continue;
    }
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function betaSample(alpha, beta) {
  if (alpha <= 0 || beta <= 0) {
    return 0;
  }
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x + y === 0 ? 0 : x / (x + y);
}

function initHistory(candidate) {
  const latency = normalizeLatency(candidate.latencyMs ?? {});
  return {
    qualityAlpha: 1,
    qualityBeta: 1,
    costEma: candidate.cost?.estimate ?? 0.001,
    latencyEma: latency.p95 ?? 400,
    latencySamples: [],
    coverageEma: 0.8,
    decisions: 0,
  };
}

export class ValueDensityRouter {
  constructor(options = {}) {
    this.history = new Map();
    this.baselineArmId = options.baselineArmId ?? 'baseline';
    this.qualityDeltaMin = options.qualityDeltaMin ?? 0.05;
  }

  registerOutcome(candidateId, outcome) {
    const record =
      this.history.get(candidateId) ??
      initHistory({ latencyMs: { p95: outcome.lat } });
    record.qualityAlpha += outcome.quality ?? 0;
    record.qualityBeta += Math.max(0, 1 - (outcome.quality ?? 0));
    record.costEma = updateEma(record.costEma, outcome.cost);
    record.latencyEma = updateEma(record.latencyEma, outcome.lat);
    record.coverageEma = updateEma(record.coverageEma, outcome.coverage ?? 1);
    record.decisions += 1;
    record.latencySamples.push(outcome.lat);
    if (record.latencySamples.length > 100) {
      record.latencySamples.shift();
    }
    this.history.set(candidateId, record);
  }

  getHistory(candidateId) {
    return this.history.get(candidateId);
  }

  choose(task, candidates, budgetStatus) {
    const arms = [];
    const latencyLimit =
      task?.policy?.latencyP95Max ?? task?.latencyP95Max ?? 350;
    const costLimit =
      task?.policy?.unitCostMax ?? task?.unitCostMax ?? Infinity;
    for (const candidate of candidates) {
      const history = this.history.get(candidate.id) ?? initHistory(candidate);
      const qualitySample = betaSample(
        history.qualityAlpha,
        history.qualityBeta,
      );
      const coverage = this.estimateCoverage(task, candidate, history);
      const cost = this.estimateCost(candidate, history, budgetStatus);
      const latency = this.estimateLatency(candidate, history, budgetStatus);
      let V = computeValueDensity({
        quality: qualitySample,
        coverage,
        cost,
        latency,
      });
      if (latency > latencyLimit) {
        V = 0;
      }
      if (cost > costLimit) {
        V = 0;
      }
      arms.push({
        id: candidate.id,
        V,
        metrics: { quality: qualitySample, coverage, cost, latency },
      });
    }
    arms.sort((a, b) => b.V - a.V);
    const best = arms[0];
    const fallback = arms.find((arm) => arm.id === this.baselineArmId);
    const chosen = best && best.V > 0 ? best : (fallback ?? best);
    return {
      chosen: chosen?.id,
      arms,
      pred: chosen?.metrics ?? { quality: 0, coverage: 0, cost: 0, latency: 0 },
    };
  }

  estimateCoverage(task, candidate, history) {
    const skillMatches = Array.isArray(task?.skills)
      ? candidate.skills.filter((skill) => task.skills.includes(skill)).length
      : candidate.skills.length;
    const base = task?.coverageBaseline ?? 0.8;
    const coverage = aggregateCoverage([
      base,
      skillMatches > 0 ? 0.95 : 0.7,
      history.coverageEma,
    ]);
    return coverage;
  }

  estimateCost(candidate, history, budgetStatus) {
    let cost = candidate.cost?.estimate ?? history.costEma ?? 0.001;
    cost = updateEma(cost, history.costEma, 0.5);
    if (budgetStatus?.alert) {
      cost *= 0.9;
    }
    if (budgetStatus?.headroomPct < 0.2) {
      cost *= 0.95;
    }
    return Math.max(cost, 0.0001);
  }

  estimateLatency(candidate, history, budgetStatus) {
    const latency = normalizeLatency(candidate.latencyMs ?? {});
    let p95 = latency.p95 ?? history.latencyEma;
    if (history.latencySamples.length > 0) {
      p95 = percentile(history.latencySamples, 0.95);
    }
    if (budgetStatus?.alert) {
      p95 *= 1.05;
    }
    return p95;
  }
}
