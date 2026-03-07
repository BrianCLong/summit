export interface SagaCheckpoint {
  step: string;
  status: 'pending' | 'completed' | 'failed';
}

export class SagaRuntime {
  private readonly checkpoints: SagaCheckpoint[] = [];

  checkpoint(step: string, status: SagaCheckpoint['status']): void {
    this.checkpoints.push({ step, status });
  }

  snapshot(): SagaCheckpoint[] {
    return [...this.checkpoints];
  }
}
