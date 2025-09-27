import { randomUUID } from 'crypto';

export interface HFALabelRecord {
  sampleId: string;
  annotatorId: string;
  label: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  seededShift?: boolean;
}

export interface HFAGoldDecision {
  sampleId: string;
  label: string;
  adjudicator: string;
  rationale?: string;
  decidedAt: string;
}

export interface HFABiasAlert {
  id: string;
  datasetId: string;
  annotatorId: string;
  type: 'bias' | 'drift' | 'seeded-shift';
  magnitude: number;
  triggeredAt: string;
  details: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface HFADatasetDefinition {
  id: string;
  name: string;
  description?: string;
  labelOptions?: string[];
  createdAt: string;
  updatedAt: string;
  labels: HFALabelRecord[];
  goldDecisions: Map<string, HFAGoldDecision>;
  biasAlerts: HFABiasAlert[];
  annotatorBaselines: Map<string, Map<string, number>>;
}

export interface HFAMetrics {
  datasetId: string;
  krippendorffAlpha: number;
  averageCohenKappa: number | null;
  pairwiseKappa: Array<{
    annotators: [string, string];
    kappa: number;
    support: number;
  }>;
  totalAnnotations: number;
  annotatedSamples: number;
  unresolvedDisagreements: number;
  adjudicatedSamples: number;
  annotatorThroughput: Array<{
    annotatorId: string;
    count: number;
  }>;
}

export interface HFADisagreement {
  sampleId: string;
  entropy: number;
  totalAnnotations: number;
  labelHistogram: Record<string, number>;
  annotations: HFALabelRecord[];
}

export interface HFADatasetExport {
  dataset: Omit<HFADatasetDefinition, 'goldDecisions' | 'annotatorBaselines'> & {
    goldDecisions: HFAGoldDecision[];
    annotatorBaselines: Array<{
      annotatorId: string;
      distribution: Record<string, number>;
    }>;
  };
  metrics: HFAMetrics;
  biasAlerts: HFABiasAlert[];
}

const DRIFT_THRESHOLD = 0.25;
const BIAS_THRESHOLD = 0.35;
const MIN_BASELINE_SAMPLES = 5;

export class HumanFeedbackArbitrationService {
  private datasets: Map<string, HFADatasetDefinition> = new Map();

  listDatasets() {
    return Array.from(this.datasets.values()).map((dataset) => ({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      labelOptions: dataset.labelOptions,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
      totalAnnotations: dataset.labels.length,
      goldDecisions: dataset.goldDecisions.size,
    }));
  }

  getDataset(datasetId: string) {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset;
  }

  createDataset(input: { name: string; description?: string; labelOptions?: string[] }) {
    if (!input.name?.trim()) {
      throw new Error('Dataset name is required');
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const dataset: HFADatasetDefinition = {
      id,
      name: input.name.trim(),
      description: input.description,
      labelOptions: input.labelOptions,
      createdAt: now,
      updatedAt: now,
      labels: [],
      goldDecisions: new Map(),
      biasAlerts: [],
      annotatorBaselines: new Map(),
    };
    this.datasets.set(id, dataset);
    return dataset;
  }

  importDataset(exported: HFADatasetExport) {
    if (!exported?.dataset?.id) {
      throw new Error('Invalid export payload');
    }
    const dataset: HFADatasetDefinition = {
      id: exported.dataset.id,
      name: exported.dataset.name,
      description: exported.dataset.description,
      labelOptions: exported.dataset.labelOptions,
      createdAt: exported.dataset.createdAt,
      updatedAt: exported.dataset.updatedAt,
      labels: exported.dataset.labels ?? [],
      goldDecisions: new Map(
        (exported.dataset.goldDecisions ?? []).map((decision) => [decision.sampleId, decision]),
      ),
      biasAlerts: exported.biasAlerts ?? [],
      annotatorBaselines: new Map(
        (exported.dataset.annotatorBaselines ?? []).map((entry) => [entry.annotatorId, new Map(Object.entries(entry.distribution))]),
      ),
    };
    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  ingestLabels(datasetId: string, labels: HFALabelRecord[]) {
    if (!Array.isArray(labels) || !labels.length) {
      throw new Error('Labels payload must be a non-empty array');
    }
    const dataset = this.getDataset(datasetId);
    labels.forEach((label) => {
      if (!label.sampleId || !label.annotatorId || !label.label) {
        throw new Error('sampleId, annotatorId and label are required for each record');
      }
      dataset.labels.push({
        sampleId: label.sampleId,
        annotatorId: label.annotatorId,
        label: label.label,
        timestamp: label.timestamp ?? new Date().toISOString(),
        metadata: label.metadata,
        seededShift: label.seededShift,
      });
      this.updateAnnotatorBaselines(dataset, label.annotatorId);
      this.checkBiasSignals(dataset, label.annotatorId, label.seededShift === true);
    });
    dataset.updatedAt = new Date().toISOString();
    return this.computeMetrics(datasetId);
  }

  private updateAnnotatorBaselines(dataset: HFADatasetDefinition, annotatorId: string) {
    const records = dataset.labels.filter((label) => label.annotatorId === annotatorId);
    if (records.length < MIN_BASELINE_SAMPLES) {
      return;
    }
    if (dataset.annotatorBaselines.has(annotatorId)) {
      return;
    }
    const baseline = this.buildDistribution(records);
    dataset.annotatorBaselines.set(annotatorId, baseline);
  }

  private checkBiasSignals(dataset: HFADatasetDefinition, annotatorId: string, forcedShift: boolean) {
    const records = dataset.labels.filter((label) => label.annotatorId === annotatorId);
    const distribution = this.buildDistribution(records);
    const baseline = dataset.annotatorBaselines.get(annotatorId);
    if (!baseline && !forcedShift) {
      return;
    }
    const baselineDistribution = baseline ?? distribution;
    const driftMagnitude = this.jensenShannonDivergence(baselineDistribution, distribution);
    if (forcedShift && driftMagnitude < DRIFT_THRESHOLD) {
      this.raiseAlert(dataset, annotatorId, 'seeded-shift', 1, 'Seeded drift indicator detected.');
      return;
    }
    if (driftMagnitude >= DRIFT_THRESHOLD) {
      this.raiseAlert(
        dataset,
        annotatorId,
        'drift',
        driftMagnitude,
        `Label distribution drift detected (JSD=${driftMagnitude.toFixed(2)}).`,
      );
    } else {
      this.resolveAlerts(dataset, annotatorId, 'drift');
    }
    const overallDistribution = this.buildDistribution(dataset.labels);
    const biasMagnitude = this.jensenShannonDivergence(overallDistribution, distribution);
    if (biasMagnitude >= BIAS_THRESHOLD) {
      this.raiseAlert(
        dataset,
        annotatorId,
        'bias',
        biasMagnitude,
        `Annotator distribution deviates from corpus (JSD=${biasMagnitude.toFixed(2)}).`,
      );
    } else {
      this.resolveAlerts(dataset, annotatorId, 'bias');
    }
  }

  private raiseAlert(
    dataset: HFADatasetDefinition,
    annotatorId: string,
    type: HFABiasAlert['type'],
    magnitude: number,
    details: string,
  ) {
    const existing = dataset.biasAlerts.find(
      (alert) => alert.annotatorId === annotatorId && alert.type === type && !alert.resolved,
    );
    if (existing) {
      existing.magnitude = magnitude;
      existing.details = details;
      existing.triggeredAt = new Date().toISOString();
      return;
    }
    dataset.biasAlerts.push({
      id: randomUUID(),
      datasetId: dataset.id,
      annotatorId,
      type,
      magnitude,
      triggeredAt: new Date().toISOString(),
      details,
      resolved: false,
    });
  }

  private resolveAlerts(dataset: HFADatasetDefinition, annotatorId: string, type: HFABiasAlert['type']) {
    dataset.biasAlerts
      .filter((alert) => alert.annotatorId === annotatorId && alert.type === type && !alert.resolved)
      .forEach((alert) => {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
      });
  }

  private buildDistribution(records: HFALabelRecord[]) {
    const distribution = new Map<string, number>();
    records.forEach((record) => {
      distribution.set(record.label, (distribution.get(record.label) ?? 0) + 1);
    });
    const total = records.length || 1;
    distribution.forEach((value, key) => {
      distribution.set(key, value / total);
    });
    return distribution;
  }

  private jensenShannonDivergence(a: Map<string, number>, b: Map<string, number>) {
    const labels = new Set([...a.keys(), ...b.keys()]);
    const avg = new Map<string, number>();
    labels.forEach((label) => {
      const pa = a.get(label) ?? 0;
      const pb = b.get(label) ?? 0;
      avg.set(label, (pa + pb) / 2);
    });
    const kl = (p: Map<string, number>, q: Map<string, number>) => {
      let sum = 0;
      labels.forEach((label) => {
        const pp = p.get(label) ?? 0;
        const qq = q.get(label) ?? 0;
        if (pp === 0 || qq === 0) {
          return;
        }
        sum += pp * Math.log2(pp / qq);
      });
      return sum;
    };
    const divergence = (kl(a, avg) + kl(b, avg)) / 2;
    return Number.isFinite(divergence) ? divergence : 0;
  }

  computeMetrics(datasetId: string): HFAMetrics {
    const dataset = this.getDataset(datasetId);
    const totalAnnotations = dataset.labels.length;
    const sampleGroups = this.groupBySample(dataset.labels);
    const annotatedSamples = sampleGroups.size;
    const unresolvedDisagreements = Array.from(sampleGroups.entries()).filter(([sampleId, records]) => {
      const uniqueLabels = new Set(records.map((record) => record.label));
      return uniqueLabels.size > 1 && !dataset.goldDecisions.has(sampleId);
    }).length;
    const adjudicatedSamples = dataset.goldDecisions.size;
    const annotatorThroughput = this.buildAnnotatorThroughput(dataset.labels);
    const pairwiseKappa = this.computePairwiseKappa(dataset.labels);
    const averageCohenKappa =
      pairwiseKappa.length > 0
        ? pairwiseKappa.reduce((sum, entry) => sum + entry.kappa, 0) / pairwiseKappa.length
        : null;
    return {
      datasetId,
      krippendorffAlpha: this.computeKrippendorffAlpha(dataset.labels),
      averageCohenKappa,
      pairwiseKappa,
      totalAnnotations,
      annotatedSamples,
      unresolvedDisagreements,
      adjudicatedSamples,
      annotatorThroughput,
    };
  }

  getDisagreements(datasetId: string): HFADisagreement[] {
    const dataset = this.getDataset(datasetId);
    const groups = this.groupBySample(dataset.labels);
    const disagreements: HFADisagreement[] = [];
    groups.forEach((records, sampleId) => {
      const gold = dataset.goldDecisions.get(sampleId);
      const histogram: Record<string, number> = {};
      records.forEach((record) => {
        histogram[record.label] = (histogram[record.label] ?? 0) + 1;
      });
      const uniqueLabels = Object.keys(histogram);
      if (uniqueLabels.length <= 1) {
        return;
      }
      const entropy = this.calculateEntropy(histogram);
      disagreements.push({
        sampleId,
        entropy,
        totalAnnotations: records.length,
        labelHistogram: histogram,
        annotations: records,
      });
      if (gold) {
        // Annotated disagreements should surface gold context as well
        disagreements[disagreements.length - 1].annotations.push({
          sampleId,
          annotatorId: gold.adjudicator,
          label: gold.label,
          timestamp: gold.decidedAt,
          metadata: { rationale: gold.rationale, gold: true },
        });
      }
    });
    return disagreements.sort((a, b) => b.entropy - a.entropy || b.totalAnnotations - a.totalAnnotations);
  }

  adjudicate(
    datasetId: string,
    payload: { sampleId: string; label: string; adjudicator: string; rationale?: string },
  ) {
    const dataset = this.getDataset(datasetId);
    if (!payload.sampleId || !payload.label || !payload.adjudicator) {
      throw new Error('sampleId, label, and adjudicator are required for adjudication');
    }
    dataset.goldDecisions.set(payload.sampleId, {
      sampleId: payload.sampleId,
      label: payload.label,
      adjudicator: payload.adjudicator,
      rationale: payload.rationale,
      decidedAt: new Date().toISOString(),
    });
    dataset.updatedAt = new Date().toISOString();
    return {
      gold: Array.from(dataset.goldDecisions.values()),
      metrics: this.computeMetrics(datasetId),
      disagreements: this.getDisagreements(datasetId),
    };
  }

  getGold(datasetId: string) {
    const dataset = this.getDataset(datasetId);
    return Array.from(dataset.goldDecisions.values());
  }

  getBiasAlerts(datasetId: string) {
    const dataset = this.getDataset(datasetId);
    return dataset.biasAlerts;
  }

  exportDataset(datasetId: string): HFADatasetExport {
    const dataset = this.getDataset(datasetId);
    const exportPayload: HFADatasetExport = {
      dataset: {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        labelOptions: dataset.labelOptions,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
        labels: dataset.labels,
        goldDecisions: Array.from(dataset.goldDecisions.values()),
        annotatorBaselines: Array.from(dataset.annotatorBaselines.entries()).map(([annotatorId, distribution]) => ({
          annotatorId,
          distribution: Object.fromEntries(distribution.entries()),
        })),
        biasAlerts: dataset.biasAlerts,
      },
      metrics: this.computeMetrics(datasetId),
      biasAlerts: dataset.biasAlerts,
    } as HFADatasetExport;
    return exportPayload;
  }

  private buildAnnotatorThroughput(labels: HFALabelRecord[]) {
    const counts = new Map<string, number>();
    labels.forEach((label) => {
      counts.set(label.annotatorId, (counts.get(label.annotatorId) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([annotatorId, count]) => ({ annotatorId, count }));
  }

  private computePairwiseKappa(labels: HFALabelRecord[]) {
    const annotationsByAnnotator = new Map<string, Map<string, string>>();
    labels.forEach((label) => {
      if (!annotationsByAnnotator.has(label.annotatorId)) {
        annotationsByAnnotator.set(label.annotatorId, new Map());
      }
      annotationsByAnnotator.get(label.annotatorId)!.set(label.sampleId, label.label);
    });
    const annotators = Array.from(annotationsByAnnotator.keys());
    const results: Array<{ annotators: [string, string]; kappa: number; support: number }> = [];
    for (let i = 0; i < annotators.length; i += 1) {
      for (let j = i + 1; j < annotators.length; j += 1) {
        const a = annotators[i];
        const b = annotators[j];
        const matrix = new Map<string, Map<string, number>>();
        let support = 0;
        annotationsByAnnotator.get(a)!.forEach((labelA, sampleId) => {
          const labelB = annotationsByAnnotator.get(b)!.get(sampleId);
          if (!labelB) {
            return;
          }
          support += 1;
          if (!matrix.has(labelA)) {
            matrix.set(labelA, new Map());
          }
          matrix.get(labelA)!.set(labelB, (matrix.get(labelA)!.get(labelB) ?? 0) + 1);
        });
        if (support === 0) {
          continue;
        }
        const categories = new Set<string>();
        matrix.forEach((row, rowLabel) => {
          categories.add(rowLabel);
          row.forEach((_count, colLabel) => categories.add(colLabel));
        });
        const totals = Array.from(categories.values()).reduce(
          (acc, category) => {
            const row = matrix.get(category);
            const rowSum = row ? Array.from(row.values()).reduce((sum, value) => sum + value, 0) : 0;
            const colSum = Array.from(matrix.values()).reduce((sum, r) => sum + (r.get(category) ?? 0), 0);
            acc.row.set(category, rowSum);
            acc.col.set(category, colSum);
            acc.total += rowSum;
            acc.agreement += row?.get(category) ?? 0;
            return acc;
          },
          {
            row: new Map<string, number>(),
            col: new Map<string, number>(),
            total: 0,
            agreement: 0,
          },
        );
        const total = totals.total;
        const po = total > 0 ? totals.agreement / total : 0;
        let pe = 0;
        categories.forEach((category) => {
          const rowProb = (totals.row.get(category) ?? 0) / total;
          const colProb = (totals.col.get(category) ?? 0) / total;
          pe += rowProb * colProb;
        });
        const denominator = 1 - pe;
        const kappa = denominator === 0 ? 0 : (po - pe) / denominator;
        results.push({ annotators: [a, b], kappa, support });
      }
    }
    return results;
  }

  private computeKrippendorffAlpha(labels: HFALabelRecord[]) {
    if (labels.length === 0) {
      return 1;
    }
    const groups = this.groupBySample(labels);
    const labelFrequencies = new Map<string, number>();
    let totalAnnotations = 0;
    groups.forEach((records) => {
      records.forEach((record) => {
        labelFrequencies.set(record.label, (labelFrequencies.get(record.label) ?? 0) + 1);
        totalAnnotations += 1;
      });
    });
    if (totalAnnotations <= 1) {
      return 1;
    }
    let observedDisagreement = 0;
    groups.forEach((records) => {
      const n = records.length;
      if (n <= 1) {
        return;
      }
      const histogram = records.reduce((acc, record) => {
        acc.set(record.label, (acc.get(record.label) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());
      const sum = Array.from(histogram.values()).reduce((acc, count) => acc + count * (n - count), 0);
      observedDisagreement += sum / (n - 1);
    });
    let expectedDisagreement = 0;
    labelFrequencies.forEach((count) => {
      expectedDisagreement += count * (totalAnnotations - count);
    });
    expectedDisagreement /= totalAnnotations - 1;
    if (expectedDisagreement === 0) {
      return 1;
    }
    const alpha = 1 - observedDisagreement / expectedDisagreement;
    return Number.isFinite(alpha) ? alpha : 0;
  }

  private groupBySample(labels: HFALabelRecord[]) {
    const groups = new Map<string, HFALabelRecord[]>();
    labels.forEach((label) => {
      if (!groups.has(label.sampleId)) {
        groups.set(label.sampleId, []);
      }
      groups.get(label.sampleId)!.push(label);
    });
    return groups;
  }

  private calculateEntropy(histogram: Record<string, number>) {
    const total = Object.values(histogram).reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      return 0;
    }
    return Object.values(histogram).reduce((sum, value) => {
      const p = value / total;
      return p > 0 ? sum - p * Math.log2(p) : sum;
    }, 0);
  }
}

export const humanFeedbackArbitrationService = new HumanFeedbackArbitrationService();
