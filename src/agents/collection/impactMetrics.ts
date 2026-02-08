export interface CollectionMetrics {
  tasks_created: number;
  tasks_deconflicted: number;
  duplication_blocks: number;
}

export class MetricsEmitter {
  private metrics: CollectionMetrics = {
    tasks_created: 0,
    tasks_deconflicted: 0,
    duplication_blocks: 0
  };

  recordTaskCreation() {
    this.metrics.tasks_created++;
  }

  recordDeconfliction() {
    this.metrics.tasks_deconflicted++;
  }

  recordDuplicationBlock() {
    this.metrics.duplication_blocks++;
  }

  getMetrics(): CollectionMetrics {
    return { ...this.metrics };
  }
}
