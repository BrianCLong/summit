export type SubsystemStatus = 'healthy' | 'degraded' | 'down';

export interface Subsystem {
  name: string;
  healthCheck(): Promise<SubsystemStatus>;
}

export interface ControlPlaneStatus {
  running: boolean;
  subsystems: Record<string, SubsystemStatus>;
  uptime: number;
}
