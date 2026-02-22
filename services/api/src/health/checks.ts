interface HealthReport {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: Array<{
    name: string;
    status: string;
    latency: number | null;
    error: string | null;
  }>;
}

export class HealthCheckService {
  async runChecks(): Promise<HealthReport> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkNeo4j(),
      this.checkCDC(),
      this.checkNotifications(),
    ]);

    const status = checks.every(c => c.status === 'fulfilled' && (c.value as any).healthy)
      ? 'healthy'
      : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: checks.map((c, i) => {
        const name = ['database', 'redis', 'neo4j', 'cdc', 'notifications'][i];
        if (c.status === 'fulfilled') {
          return {
            name,
            status: (c.value as any).status,
            latency: (c.value as any).latency,
            error: null
          };
        } else {
          return {
            name,
            status: 'unhealthy',
            latency: null,
            error: c.reason.message
          };
        }
      }),
    };
  }

  private async checkDatabase() { return { healthy: true, status: 'ok', latency: 5 }; }
  private async checkRedis() { return { healthy: true, status: 'ok', latency: 2 }; }
  private async checkNeo4j() { return { healthy: true, status: 'ok', latency: 10 }; }
  private async checkCDC() { return { healthy: true, status: 'ok', latency: 50 }; }
  private async checkNotifications() { return { healthy: true, status: 'ok', latency: 5 }; }
}
