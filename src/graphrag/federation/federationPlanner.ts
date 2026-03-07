import { SourceRegistry } from "./sourceRegistry";

export interface PlanOptions {
  tenantId: string;
  query: string;
  k: number;
}

export class FederationPlanner {
  constructor(private sourceRegistry: SourceRegistry) {}

  selectEligibleSources(options: PlanOptions): string[] {
    const allSources = this.sourceRegistry.getAllSources();

    // Simplistic planner for now:
    // Select all sources that match the tenantId or are global (e.g., tenantId="*")
    return allSources
      .filter((source) => source.tenantId === options.tenantId || source.tenantId === "*")
      .map((source) => source.id);
  }
}
