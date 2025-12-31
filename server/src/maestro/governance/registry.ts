
export interface ResourceLimits {
  maxActions: number;
  maxTimeMs: number;
  maxTokens: number;
  maxExternalCalls: number;
  maxCostUsd: number;
}

export type ResourceClass = 'default' | 'external_network' | 'cpu_intensive' | 'privileged_ops';

export interface CapabilityDefinition {
  id: string;
  description: string;
  allowedActions: string[];
  resourceClass: ResourceClass;
}

export const RESOURCE_CLASSES: Record<ResourceClass, ResourceLimits> = {
  default: {
    maxActions: 10,
    maxTimeMs: 2 * 60 * 1000, // 2 mins
    maxTokens: 10_000,
    maxExternalCalls: 0,
    maxCostUsd: 0.10
  },
  external_network: {
    maxActions: 20,
    maxTimeMs: 5 * 60 * 1000, // 5 mins
    maxTokens: 50_000,
    maxExternalCalls: 20,
    maxCostUsd: 0.50
  },
  cpu_intensive: {
    maxActions: 50,
    maxTimeMs: 10 * 60 * 1000, // 10 mins
    maxTokens: 100_000,
    maxExternalCalls: 0,
    maxCostUsd: 1.00
  },
  privileged_ops: {
    maxActions: 20,
    maxTimeMs: 5 * 60 * 1000,
    maxTokens: 20_000,
    maxExternalCalls: 5, // Internal only
    maxCostUsd: 0.50
  }
};

export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    id: 'research.public',
    description: 'Access to public internet for research',
    allowedActions: ['http.get', 'browser.read'],
    resourceClass: 'external_network'
  },
  {
    id: 'research.internal',
    description: 'Access to internal knowledge graph',
    allowedActions: ['graph.read', 'vector.search'],
    resourceClass: 'default'
  },
  {
    id: 'analysis.code',
    description: 'Execute code analysis and linting',
    allowedActions: ['code.read', 'linter.run'],
    resourceClass: 'cpu_intensive'
  },
  {
    id: 'triage.write',
    description: 'Update issue trackers and status',
    allowedActions: ['ticket.update', 'notification.send'],
    resourceClass: 'default'
  },
  {
    id: 'ops.remediation',
    description: 'Execute remediation scripts',
    allowedActions: ['script.exec', 'infra.restart'],
    resourceClass: 'privileged_ops'
  },
  {
    id: 'agent.coordination',
    description: 'Delegate tasks to other agents',
    allowedActions: ['agent.delegate', 'agent.ask'],
    resourceClass: 'default'
  }
];

export function getCapability(id: string): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY.find(c => c.id === id);
}

export function getLimitsForCapability(id: string): ResourceLimits {
  const cap = getCapability(id);
  if (!cap) return RESOURCE_CLASSES.default;
  return RESOURCE_CLASSES[cap.resourceClass];
}

export function getLimitsForCapabilities(ids: string[]): ResourceLimits {
  // Aggregate limits: take the maximum of each dimension
  let maxActions = 0;
  let maxTimeMs = 0;
  let maxTokens = 0;
  let maxExternalCalls = 0;
  let maxCostUsd = 0;

  if (ids.length === 0) return RESOURCE_CLASSES.default;

  for (const id of ids) {
    const limits = getLimitsForCapability(id);
    maxActions = Math.max(maxActions, limits.maxActions);
    maxTimeMs = Math.max(maxTimeMs, limits.maxTimeMs);
    maxTokens = Math.max(maxTokens, limits.maxTokens);
    maxExternalCalls = Math.max(maxExternalCalls, limits.maxExternalCalls);
    maxCostUsd = Math.max(maxCostUsd, limits.maxCostUsd);
  }

  return { maxActions, maxTimeMs, maxTokens, maxExternalCalls, maxCostUsd };
}
