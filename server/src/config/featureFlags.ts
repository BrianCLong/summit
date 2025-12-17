export type FeatureKey =
  // Infrastructure / Core
  | 'ai.enabled'
  | 'kafka.enabled'
  | 'maestro.mcpEnabled'
  | 'maestro.pipelinesEnabled'
  | 'opentelemetry.enabled'

  // Application Features
  | 'rbac.fineGrained'
  | 'audit.trail'
  | 'copilot.service'
  | 'analytics.panel'
  | 'pdf.export'

  // Agents
  | 'agent.singlaub'
  | 'agent.lemay'
  | 'agent.angleton'
  | 'agent.budanov'
  | 'agent.wolf'
  | 'agent.harel'
  | 'agent.gehlen'

  // New/Requested
  | 'maestro.newRunConsole'
  | 'llm.experimentalRouting'
  | 'dashboard.realtime'
  | 'ci.fastLane'
  | 'security.strictAuth'
  | 'e2e.testModeApi';

export interface FeatureContext {
  tenantId?: string;
  userId?: string;
  env?: string;
}

export class FeatureFlags {
  private features: Partial<Record<FeatureKey, boolean>>;

  constructor(features: Partial<Record<FeatureKey, boolean>> = {}) {
    this.features = features;
  }

  isEnabled(key: FeatureKey, context?: FeatureContext): boolean {
    // Basic implementation: explicit config check.
    // Future: Add context-based logic here.
    return this.features[key] ?? false;
  }

  getVariant<T = string | number | boolean>(
    key: FeatureKey,
    context?: FeatureContext,
  ): T | undefined {
    return this.features[key] as unknown as T;
  }
}
