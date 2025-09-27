export interface StatusInfo {
  service: string;
  version: string;
  environment: string;
  nodeVersion: string;
  uptime: number;
  timestamp: string;
}

export class StatusService {
  getStatus(): StatusInfo {
    return {
      service: "intelgraph-server",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

export default StatusService;
