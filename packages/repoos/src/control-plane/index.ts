import { ControlPlaneStatus, Subsystem, SubsystemStatus } from './types.js';

export class ControlPlane {
  private startTime: number | null = null;
  private running: boolean = false;
  private inFlightChecks: Set<Promise<unknown>> = new Set();

  constructor(private subsystems: Subsystem[]) {}

  async start(): Promise<void> {
    this.startTime = Date.now();
    this.running = true;
    console.log(JSON.stringify({ event: 'control_plane_start', timestamp: new Date().toISOString() }));
  }

  async stop(): Promise<void> {
    this.running = false;
    await Promise.all(Array.from(this.inFlightChecks));
    console.log(JSON.stringify({ event: 'control_plane_stop', timestamp: new Date().toISOString() }));
  }

  async healthCheck(): Promise<ControlPlaneStatus> {
    const statuses: Record<string, SubsystemStatus> = {};

    await Promise.all(this.subsystems.map(async (subsystem) => {
      const checkPromise = subsystem.healthCheck();
      this.inFlightChecks.add(checkPromise);

      try {
        const status = await checkPromise;
        statuses[subsystem.name] = status;
      } catch (error) {
        statuses[subsystem.name] = 'down';
      } finally {
        this.inFlightChecks.delete(checkPromise);
      }
    }));

    return this.getStatus(statuses);
  }

  getStatus(subsystemStatuses: Record<string, SubsystemStatus> = {}): ControlPlaneStatus {
    return {
      running: this.running,
      subsystems: subsystemStatuses,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }
}
