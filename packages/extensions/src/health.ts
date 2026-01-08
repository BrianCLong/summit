import { ExtensionRegistry } from "./registry.js";
import { ExtensionObservability } from "./observability.js";

export interface HealthRule {
  maxFailures: number;
  windowMs: number;
}

export class ExtensionHealthMonitor {
  private registry: ExtensionRegistry;
  private observability: ExtensionObservability;
  private failures: Map<string, number[]> = new Map();
  private rule: HealthRule;

  constructor(
    registry: ExtensionRegistry,
    observability: ExtensionObservability,
    rule?: HealthRule
  ) {
    this.registry = registry;
    this.observability = observability;
    this.rule = rule || { maxFailures: 3, windowMs: 5 * 60 * 1000 };
  }

  recordFailure(extensionName: string): void {
    const now = Date.now();
    const entries = this.failures.get(extensionName) || [];
    entries.push(now);
    this.failures.set(
      extensionName,
      entries.filter((ts) => now - ts <= this.rule.windowMs)
    );

    if (this.failures.get(extensionName)!.length >= this.rule.maxFailures) {
      this.registry.disable(extensionName);
      this.observability.recordTrace(
        extensionName,
        "kill-switch",
        0,
        false,
        "auto-disabled due to failures"
      );
    }
  }
}
