
// services/synthetic/synthetic-monitor-mock.ts

/**
 * Mock Synthetic Monitoring Service.
 */
export class SyntheticMonitorMock {
  private checks: any[];

  constructor(checks: any[]) {
    this.checks = checks;
    console.log(`SyntheticMonitor initialized with ${checks.length} checks.`);
  }

  /**
   * Simulates running a synthetic check for a user journey or API endpoint.
   * @param checkId The ID of the check to run.
   * @returns The status of the check.
   */
  public async runCheck(checkId: string): Promise<{ id: string; status: 'pass' | 'fail'; latencyMs: number; message?: string }> {
    console.log(`Running synthetic check: ${checkId}...`);
    await new Promise(res => setTimeout(res, 200 + Math.random() * 300)); // Simulate variable latency

    const status = Math.random() > 0.9 ? 'fail' : 'pass'; // 10% chance of failure
    const latency = Math.random() * 500 + 100; // 100-600ms

    if (status === 'fail') {
      return { id: checkId, status, latencyMs: latency, message: 'Endpoint returned 5xx error.' };
    }
    return { id: checkId, status, latencyMs: latency };
  }

  /**
   * Simulates getting the current status of all synthetic checks.
   * @returns An array of check statuses.
   */
  public async getAllCheckStatuses(): Promise<{ id: string; status: 'pass' | 'fail'; latencyMs: number }[]> {
    console.log('Getting all synthetic check statuses...');
    await new Promise(res => setTimeout(res, 100));
    return this.checks.map(check => ({ id: check.id, status: Math.random() > 0.1 ? 'pass' : 'fail', latencyMs: Math.random() * 500 }));
  }
}

// Example usage:
// const monitor = new SyntheticMonitorMock([ { id: 'login-journey' }, { id: 'api-health' } ]);
// monitor.runCheck('login-journey').then(result => console.log('Check result:', result));
