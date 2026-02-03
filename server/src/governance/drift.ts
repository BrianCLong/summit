
export class DriftMonitor {
  static async check(modelId: string, input: any): Promise<{ driftDetected: boolean; score: number }> {
    // Stub implementation
    return {
      driftDetected: false,
      score: 0.0
    };
  }
}
