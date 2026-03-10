/**
 * Evidence Ingest System
 *
 * Adapters for normalizing external data sources into evidence events.
 */

// Base adapter
export type {
  EvidenceEvent,
  EvidenceAssertion,
  AdapterConfig,
  BatchResult,
} from "./base-adapter.js";

export { BaseEvidenceAdapter } from "./base-adapter.js";

// Adapters
export { RepoAdapter } from "./adapters/repo-adapter.js";
export type { RepoQuery } from "./adapters/repo-adapter.js";

export { PaperAdapter } from "./adapters/paper-adapter.js";
export type { PaperQuery, PaperMetadata } from "./adapters/paper-adapter.js";

export { ManualAdapter } from "./adapters/manual-adapter.js";
export type { ManualEntry } from "./adapters/manual-adapter.js";

/**
 * Adapter registry for easy instantiation
 */
export class AdapterRegistry {
  private adapters: Map<string, BaseEvidenceAdapter> = new Map();

  /**
   * Register adapter
   */
  register(name: string, adapter: BaseEvidenceAdapter): void {
    this.adapters.set(name, adapter);
  }

  /**
   * Get adapter by name
   */
  get(name: string): BaseEvidenceAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * List all registered adapters
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Create default registry with all adapters
   */
  static createDefault(): AdapterRegistry {
    const registry = new AdapterRegistry();
    registry.register("repo", new RepoAdapter());
    registry.register("paper", new PaperAdapter());
    registry.register("manual", new ManualAdapter());
    return registry;
  }
}
