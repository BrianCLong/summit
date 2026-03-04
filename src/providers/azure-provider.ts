import { CloudProvider, Result, SummitQuery } from './cloud-provider';

export class AzureProvider implements CloudProvider {
  name = 'Azure';
  private isHealthy = true;

  setHealthy(status: boolean) {
    this.isHealthy = status;
  }

  async health(): Promise<boolean> {
    return this.isHealthy;
  }

  async query(q: SummitQuery): Promise<Result> {
    if (!this.isHealthy) {
      throw new Error('Azure Provider is unhealthy');
    }
    return {
      status: 'success',
      data: `Azure Response to ${q.id}`,
      provider: this.name,
    };
  }
}
