import { SourceRegistry } from "./sourceRegistry";

export class TenantScopeResolver {
  constructor(private sourceRegistry: SourceRegistry) {}

  resolveEligibleSources(tenantId: string): string[] {
    const allSources = this.sourceRegistry.getAllSources();
    const eligibleSources: string[] = [];

    for (const source of allSources) {
      if (!source.trustScore || source.trustScore <= 0) {
        continue;
      }

      if (source.tenantId === tenantId || source.tenantId === "*") {
        eligibleSources.push(source.id);
      }
    }

    return eligibleSources;
  }
}
