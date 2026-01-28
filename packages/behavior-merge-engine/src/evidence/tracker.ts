export class EvidenceTracker {
  private overlapCounts: Record<string, number> = {};
  private uniqueCount = 0;
  private sharedCount = 0;
  private totalParams = 0;

  // Records a metric for a specific parameter/key (e.g. average overlap)
  recordParamMetric(paramId: string, value: number) {
    this.overlapCounts[paramId] = value;
  }

  // Updates global statistics
  addGlobalStats(unique: number, shared: number, total: number) {
    this.uniqueCount += unique;
    this.sharedCount += shared;
    this.totalParams += total;
  }

  getStats() {
    return {
      overlapCounts: this.overlapCounts,
      uniqueRatio: this.totalParams > 0 ? this.uniqueCount / this.totalParams : 0,
      sharedRatio: this.totalParams > 0 ? this.sharedCount / this.totalParams : 0,
      totalParams: this.totalParams
    };
  }
}
