export interface ActiveActiveHealthStatus {
  region: string;
  isPrimary: boolean;
  lagMs: number;
  divergenceCount: number;
  lastReconciledAt: Date;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
}

export class ActiveActiveHealthService {
  private static instance: ActiveActiveHealthService;
  private isSafeModeEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): ActiveActiveHealthService {
    if (!ActiveActiveHealthService.instance) {
      ActiveActiveHealthService.instance = new ActiveActiveHealthService();
    }
    return ActiveActiveHealthService.instance;
  }

  public async checkHealth(): Promise<ActiveActiveHealthStatus> {
    // Mock health check logic
    // Real logic would query replication lag from DB metrics or DualWriter stats
    return {
      region: process.env.REGION || 'us-east-1',
      isPrimary: true, // simplified
      lagMs: 0,
      divergenceCount: 0,
      lastReconciledAt: new Date(),
      status: 'HEALTHY',
    };
  }

  public async getDivergence(): Promise<number> {
    // Mock divergence check
    return 0;
  }

  public isSafeMode(): boolean {
    return this.isSafeModeEnabled;
  }

  public enableSafeMode(): void {
    console.warn('Active-Active Safe Mode ENABLED. All writes forced to primary region only.');
    this.isSafeModeEnabled = true;
  }

  public disableSafeMode(): void {
    console.info('Active-Active Safe Mode DISABLED.');
    this.isSafeModeEnabled = false;
  }

  public async shouldBlockExpansion(): Promise<boolean> {
    const divergence = await this.getDivergence();
    return divergence > 0;
  }
}
