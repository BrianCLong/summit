import { FeatureRecord, FeatureVector, Modality } from './types.js';

export class FeatureStore {
  private records: FeatureRecord[] = [];

  ingest(record: Omit<FeatureRecord, 'version'>): FeatureRecord {
    const latestVersion = this.records
      .filter((r) => r.assetId === record.assetId && r.modality === record.modality)
      .reduce((max, r) => Math.max(max, r.version), 0);
    const nextRecord: FeatureRecord = { ...record, version: latestVersion + 1 };
    this.records.push(nextRecord);
    return nextRecord;
  }

  latest(assetId: string, modality: Modality): FeatureRecord | undefined {
    return this.records
      .filter((r) => r.assetId === assetId && r.modality === modality)
      .sort((a, b) => b.version - a.version)[0];
  }

  window(assetId: string, modality: Modality, limit = 20): FeatureRecord[] {
    return this.records
      .filter((r) => r.assetId === assetId && r.modality === modality)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  aggregateMean(assetId: string, modality: Modality, limit = 20): FeatureVector {
    const windowed = this.window(assetId, modality, limit);
    const totals: FeatureVector = {};
    windowed.forEach((record) => {
      Object.entries(record.features).forEach(([key, value]) => {
        totals[key] = (totals[key] ?? 0) + value;
      });
    });
    const divisor = windowed.length || 1;
    Object.keys(totals).forEach((key) => {
      totals[key] = totals[key] / divisor;
    });
    return totals;
  }
}
