/**
 * Data Classification Registry
 * Maps entity paths to classification rules.
 */
import { DataClassification, DataSeverity, ClassificationRule } from './types.js';

export class ClassificationRegistry {
  private static instance: ClassificationRegistry;
  private registry: Map<string, ClassificationRule> = new Map();

  private constructor() {}

  public static getInstance(): ClassificationRegistry {
    if (!ClassificationRegistry.instance) {
      ClassificationRegistry.instance = new ClassificationRegistry();
    }
    return ClassificationRegistry.instance;
  }

  /**
   * Register a classification for a specific path
   * @param path entity.field path (e.g. "User.email"). Case-sensitive.
   * @param classification DataClassification
   * @param severity DataSeverity
   */
  public register(path: string, classification: DataClassification, severity: DataSeverity = DataSeverity.MEDIUM): void {
    this.registry.set(path, {
      id: `reg-${path}`,
      classification,
      severity,
      description: `Manual registration for ${path}`
    });
  }

  /**
   * Get classification for a path
   * @param path entity.field path. Case-sensitive.
   */
  public get(path: string): ClassificationRule | undefined {
    return this.registry.get(path);
  }

  /**
   * Clear registry (for testing)
   */
  public clear(): void {
    this.registry.clear();
  }

  /**
   * Get all registered paths
   * Returns a new Map to prevent mutation of internal state.
   */
  public getAll(): Map<string, ClassificationRule> {
    return new Map(this.registry);
  }
}
