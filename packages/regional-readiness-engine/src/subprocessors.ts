import { RegionId, SubprocessorEntry } from "./types.js";

export class SubprocessorRegistry {
  private readonly entries = new Map<string, SubprocessorEntry>();

  register(entry: SubprocessorEntry): void {
    this.entries.set(entry.name, { ...entry });
  }

  isAllowed(name: string, regionId: RegionId, dataClass: string): boolean {
    const entry = this.entries.get(name);
    if (!entry) {
      return false;
    }
    return entry.approvedRegions.includes(regionId) && entry.dataClasses.includes(dataClass);
  }

  getCustomerView(regionId: RegionId): SubprocessorEntry[] {
    return Array.from(this.entries.values()).filter((entry) =>
      entry.approvedRegions.includes(regionId)
    );
  }
}
