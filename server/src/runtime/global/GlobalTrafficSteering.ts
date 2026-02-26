
export interface RegionConfig {
  name: string;
  priority: number;
}

export interface TrafficContext {
  userId: string;
  sourceIp: string;
}

export class GlobalTrafficSteering {
  private healthStatus: Map<string, boolean> = new Map();

  constructor(private config: { regions: RegionConfig[]; strategy: string }) {
    this.config.regions.forEach(r => this.healthStatus.set(r.name, true));
  }

  routeRequest(context: TrafficContext): string | null {
    // Simple implementation based on priority and health
    const sortedRegions = [...this.config.regions].sort((a, b) => a.priority - b.priority);

    for (const region of sortedRegions) {
      if (this.healthStatus.get(region.name)) {
        return region.name;
      }
    }
    return null;
  }

  updateHealth(region: string, isHealthy: boolean): void {
    this.healthStatus.set(region, isHealthy);
  }
}
