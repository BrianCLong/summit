import { CloudProvider, Result, SummitQuery } from './cloud-provider';

export class AwsProvider implements CloudProvider {
  name = 'AWS';
  private isHealthy = true;

  setHealthy(status: boolean) {
    this.isHealthy = status;
  }

  async health(): Promise<boolean> {
    return this.isHealthy;
  }

  async query(q: SummitQuery): Promise<Result> {
    if (!this.isHealthy) {
      throw new Error('AWS Provider is unhealthy');
    }
    return {
      status: 'success',
      data: `AWS Response to ${q.id}`,
      provider: this.name,
    };
  }
}
