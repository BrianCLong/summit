import { CloudProvider, SummitQuery, Result } from '../providers/cloud-provider';

export class ProviderRouter {
  private providers: CloudProvider[];

  constructor(providers: CloudProvider[]) {
    this.providers = providers;
  }

  async routeQuery(q: SummitQuery): Promise<Result> {
    for (const provider of this.providers) {
      if (await provider.health()) {
        try {
          return await provider.query(q);
        } catch (error) {
          console.warn(`Provider ${provider.name} failed during query:`, error);
          // Continue to next provider on query failure
        }
      }
    }
    throw new Error("All providers unavailable");
  }
}
