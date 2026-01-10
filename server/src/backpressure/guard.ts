export class BackpressureGuard {
  private static instance: BackpressureGuard;
  private mockQueueDepth: number = 0;
  private threshold: number = 100;
  private enabledOverride: boolean | null = null;

  private constructor() {}

  public static getInstance(): BackpressureGuard {
    if (!BackpressureGuard.instance) {
      BackpressureGuard.instance = new BackpressureGuard();
    }
    return BackpressureGuard.instance;
  }

  public shouldBlock(): boolean {
    const isEnabled = this.isEnabled();
    if (!isEnabled) {
      return false;
    }

    // In a real implementation, this would check the real queue depth.
    // For now, we use the mocked queue depth as requested.
    const currentDepth = this.getQueueDepth();
    return currentDepth > this.threshold;
  }

  private isEnabled(): boolean {
    if (this.enabledOverride !== null) {
      return this.enabledOverride;
    }
    // Default to false as per constraints
    return process.env.BACKPRESSURE_ENABLED === 'true';
  }

  // --- Methods for testing/mocking ---

  public setMockQueueDepth(depth: number): void {
    this.mockQueueDepth = depth;
  }

  public setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  public setEnabledOverride(enabled: boolean | null): void {
    this.enabledOverride = enabled;
  }

  private getQueueDepth(): number {
    return this.mockQueueDepth;
  }
}
