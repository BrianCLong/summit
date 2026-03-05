import { CloudProvider, SummitQuery, Result } from '../providers/cloud-provider';

export class ProviderRouter {
  constructor(private providers: CloudProvider[]) {}

  async routeQuery(q: SummitQuery): Promise<Result> {
    for (const provider of this.providers) {
      if (await provider.health()) {
        try {
          const result = await provider.query(q);
          return result;
        } catch (e) {
          // Fallback on error even if health check passed
          continue;
        }
      }
    }
    throw new Error('All providers unavailable');
  }
}
