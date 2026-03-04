import { CloudProvider, Result, SummitQuery } from './cloud-provider';

export class GcpProvider implements CloudProvider {
  name = 'GCP';
  private isHealthy = true;

  setHealthy(status: boolean) {
    this.isHealthy = status;
  }

  async health(): Promise<boolean> {
    return this.isHealthy;
  }

  async query(q: SummitQuery): Promise<Result> {
    if (!this.isHealthy) {
      throw new Error('GCP Provider is unhealthy');
    }
    return {
      status: 'success',
      data: `GCP Response to ${q.id}`,
      provider: this.name,
    };
  }
}
