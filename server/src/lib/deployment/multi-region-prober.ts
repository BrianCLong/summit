
import axios, { AxiosInstance } from 'axios';
import { regionProbeLatencyMs, regionHealthStatus } from '../../monitoring/metrics.js';

export interface RegionConfig {
  id: string;
  name: string;
  endpoint: string;
  timeoutMs?: number;
}

export interface RegionHealthStatus {
  regionId: string;
  regionName: string;
  isHealthy: boolean;
  latencyMs: number;
  lastChecked: Date;
  error?: string;
}

export class MultiRegionProber {
  private regions: RegionConfig[];
  private client: AxiosInstance;

  constructor(regions: RegionConfig[], client?: AxiosInstance) {
    this.regions = regions;
    this.client = client || axios.create();
  }

  /**
   * Probes all configured regions and returns their health status.
   */
  public async probeAll(): Promise<RegionHealthStatus[]> {
    const promises = this.regions.map(region => this.probeRegion(region));
    return Promise.all(promises);
  }

  /**
   * Probes a single region.
   */
  public async probeRegion(region: RegionConfig): Promise<RegionHealthStatus> {
    const start = Date.now();
    try {
      const response = await this.client.get(region.endpoint, {
        timeout: region.timeoutMs || 5000,
        validateStatus: (status) => status >= 200 && status < 300
      });
      const duration = Date.now() - start;

      // Update Prometheus metrics
      regionProbeLatencyMs.set({ region_id: region.id, region_name: region.name }, duration);
      regionHealthStatus.set({ region_id: region.id, region_name: region.name }, 1);

      return {
        regionId: region.id,
        regionName: region.name,
        isHealthy: true,
        latencyMs: duration,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      const duration = Date.now() - start;

      // Update Prometheus metrics
      regionProbeLatencyMs.set({ region_id: region.id, region_name: region.name }, duration);
      regionHealthStatus.set({ region_id: region.id, region_name: region.name }, 0);

      return {
        regionId: region.id,
        regionName: region.name,
        isHealthy: false,
        latencyMs: duration,
        lastChecked: new Date(),
        error: error.message || 'Unknown error',
      };
    }
  }

  public getRegions(): RegionConfig[] {
    return this.regions;
  }
}
