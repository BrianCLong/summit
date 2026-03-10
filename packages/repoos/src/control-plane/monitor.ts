import { ControlPlane } from './index.js';

export class MonitorLoop {
  private timeoutId: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private running = false;

  constructor(private controlPlane: ControlPlane) {
    this.intervalMs = Number(process.env.MONITOR_INTERVAL_MS) || 30000;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.poll();
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const status = await this.controlPlane.healthCheck();
      Object.entries(status.subsystems).forEach(([subsystem, status]) => {
        console.log(
          JSON.stringify({
            event: 'subsystem_health',
            subsystem,
            status,
            timestamp: new Date().toISOString(),
          })
        );
      });
    } finally {
      if (this.running) {
        this.timeoutId = setTimeout(() => this.poll(), this.intervalMs);
      }
    }
  }

  stop(): void {
    this.running = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
