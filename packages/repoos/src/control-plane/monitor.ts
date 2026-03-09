import { ControlPlane } from './index.js';

export class MonitorLoop {
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(private controlPlane: ControlPlane) {
    this.intervalMs = Number(process.env.MONITOR_INTERVAL_MS) || 30000;
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      const status = await this.controlPlane.healthCheck();
      Object.entries(status.subsystems).forEach(([subsystem, status]) => {
        console.log(JSON.stringify({
          event: 'subsystem_health',
          subsystem,
          status,
          timestamp: new Date().toISOString()
        }));
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
