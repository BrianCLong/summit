import { clamp, createDecisionRecord } from 'common-types';
import { PolicyEngine } from 'policy';
import { ProvenanceLedger } from 'prov-ledger';

import { BudgetGuardian } from './budget.js';
import { DiscoveryEngine } from './discovery.js';
import { MetricsRecorder } from './metrics.js';
import { OptimizationManager } from './optimizations.js';
import { ValueDensityRouter } from './router.js';

function simulateActual(pred, optimized) {
  const drift = (Math.random() - 0.5) * 0.05;
  const quality = clamp(pred.quality + drift, 0, 1);
  const latency = Math.max(1, optimized.latency * (0.9 + Math.random() * 0.2));
  const cost = Math.max(0, optimized.cost * (0.95 + Math.random() * 0.1));
  return { quality, lat: latency, cost };
}

export class ZeroSpendOrchestrator {
  constructor(options) {
    this.baselineCandidate = options.baselineCandidate;
    this.policyEngine =
      options.policyEngine ?? new PolicyEngine(options.policyConfig);
    this.discovery = new DiscoveryEngine({
      sources: options.discoverySources ?? [],
      policyEngine: this.policyEngine,
    });
    this.router = new ValueDensityRouter({
      baselineArmId: this.baselineCandidate?.id ?? 'baseline',
      qualityDeltaMin: this.policyEngine.config.qualityDeltaMin,
    });
    this.budgetGuardian = new BudgetGuardian(options.budget ?? {});
    this.optimizations = new OptimizationManager({
      policyEngine: this.policyEngine,
      kvCache: options.kvCache,
      memoCache: options.memoCache,
    });
    this.ledger =
      options.ledger ?? new ProvenanceLedger({ namespace: 'zero-spend' });
    this.metrics = new MetricsRecorder();
    this.concurrentLimit = options.N ?? 1;
    this.inFlight = 0;
    this.queue = [];
    this.provenanceBaseUri =
      options.provenanceBaseUri ?? 's3://zero-spend-ledger';
  }

  async bootstrap() {
    await this.discovery.sync();
    if (this.baselineCandidate) {
      this.discovery.catalog.set(
        this.baselineCandidate.id,
        this.baselineCandidate,
      );
    }
  }

  runTask(task) {
    return new Promise((resolve, reject) => {
      const execute = () => {
        this._executeTask(task)
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.inFlight -= 1;
            if (this.queue.length > 0) {
              const next = this.queue.shift();
              this.inFlight += 1;
              next();
            }
          });
      };
      if (this.inFlight < this.concurrentLimit) {
        this.inFlight += 1;
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  async _executeTask(task) {
    const cacheResult = this.optimizations.cacheLookup(task);
    if (cacheResult.hit) {
      const decision = createDecisionRecord({
        taskId: task.id,
        arms: [{ id: 'cache', V: Infinity }],
        chosen: 'cache',
        pred: {
          quality: cacheResult.value.quality,
          lat: cacheResult.value.latency,
          cost: 0,
        },
        actual: {
          quality: cacheResult.value.quality,
          lat: cacheResult.value.latency,
          cost: 0,
        },
        provenanceUri: `${this.provenanceBaseUri}/${task.id}`,
        budgetDeltaUSD: -cacheResult.value.cost,
      });
      this.budgetGuardian.reclaimSavings(cacheResult.value.cost);
      this.metrics.record({
        latency: cacheResult.value.latency,
        cost: 0,
        quality: cacheResult.value.quality,
        cacheHit: true,
      });
      const entry = this.ledger.record(decision, {
        policyTags: ['cache-hit'],
        savingsUSD: cacheResult.value.cost,
      });
      return entry;
    }

    const candidates = this.discovery.getBySkills(task.skills);
    if (
      !candidates.find(
        (candidate) => candidate.id === this.baselineCandidate?.id,
      ) &&
      this.baselineCandidate
    ) {
      candidates.push(this.baselineCandidate);
    }
    const budgetStatus = this.budgetGuardian.status();
    const decision = this.router.choose(task, candidates, budgetStatus);
    const candidate =
      candidates.find((item) => item.id === decision.chosen) ??
      this.baselineCandidate;
    const enforcement = this.policyEngine.enforceTaskPolicy(task, candidate);
    const optimized = this.optimizations.apply(
      { cost: decision.pred.cost, latency: decision.pred.latency },
      task,
    );
    const actual = simulateActual(decision.pred, optimized);
    this.router.registerOutcome(candidate.id, {
      ...actual,
      coverage: decision.pred.coverage ?? 1,
    });
    this.budgetGuardian.registerCost(actual.cost);
    if (optimized.savingsUSD > 0) {
      this.budgetGuardian.reclaimSavings(optimized.savingsUSD);
    }
    const memoValue = {
      latency: actual.lat,
      cost: actual.cost,
      quality: actual.quality,
    };
    if (cacheResult.key) {
      this.optimizations.cacheStore(cacheResult.key, memoValue);
    }
    this.metrics.record({
      latency: actual.lat,
      cost: actual.cost,
      quality: actual.quality,
      cacheHit: false,
    });
    const baselineCost =
      this.baselineCandidate?.cost?.estimate ?? decision.pred.cost;
    const budgetDeltaUSD = actual.cost - baselineCost;
    const ledgerEntry = this.ledger.record(
      createDecisionRecord({
        taskId: task.id,
        arms: decision.arms.map((arm) => ({ id: arm.id, V: arm.V })),
        chosen: candidate.id,
        pred: {
          quality: decision.pred.quality,
          lat: optimized.latency,
          cost: optimized.cost,
        },
        actual,
        provenanceUri: `${this.provenanceBaseUri}/${task.id}`,
        budgetDeltaUSD,
      }),
      {
        policyTags: enforcement.tags,
        savingsUSD: optimized.savingsUSD,
      },
    );
    return ledgerEntry;
  }

  budgetStatus() {
    return this.budgetGuardian.status();
  }

  metricsSnapshot() {
    return this.metrics.snapshot();
  }
}
