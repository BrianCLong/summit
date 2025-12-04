
export interface LoadBalancer {
  setTraffic(serviceName: string, version: string, percentage: number): Promise<void>;
  getCurrentTraffic(serviceName: string): Promise<Record<string, number>>;
}

export interface MonitoringService {
  getHealth(serviceName: string, version: string): Promise<HealthStatus>;
}

export interface HealthStatus {
  healthy: boolean;
  errorRate: number;
  latency: number;
  details?: any;
}

export interface Deployer {
  deploy(version: string): Promise<boolean>;
  rollback(version: string): Promise<boolean>;
}

export interface DeploymentConfig {
  serviceName: string;
  stableVersion: string;
  newVersion: string;
  healthCheckUrl: string;
  smokeTestUrl?: string;
  healthTimeout: number; // seconds
}
