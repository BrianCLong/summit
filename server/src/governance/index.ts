import { PolicyEngine } from './PolicyEngine.js';
import { TelemetryLayer } from './TelemetryLayer.js';
import { PolicyContext, GovernanceDecision, TelemetryEvent, Policy } from './types.js';
import { v4 as uuidv4 } from 'uuid';

const policyEngine = new PolicyEngine();
const telemetryLayer = new TelemetryLayer('governance_events.jsonl');

export const governance = {
  // Config
  loadPolicies: (policies: Policy[]) => policyEngine.loadPolicies(policies),

  // Core API
  check: (context: PolicyContext): GovernanceDecision => {
    const decision = policyEngine.check(context);

    // Auto-log policy decisions? Maybe only violations?
    // Let's log violations
    if (decision.action !== 'ALLOW') {
      telemetryLayer.logEvent({
        id: uuidv4(),
        kind: 'policy_violation',
        runId: context.metadata?.runId || 'unknown',
        tenantId: context.tenantId,
        timestamp: new Date().toISOString(),
        details: {
          context,
          decision
        }
      });
    }

    return decision;
  },

  logEvent: async (event: Omit<TelemetryEvent, 'id' | 'timestamp'>) => {
    await telemetryLayer.logEvent({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    });
  },

  // Helpers
  getGraphStats: () => telemetryLayer.getGraphStats(),
  getTrace: (runId: string) => telemetryLayer.getTrace(runId)
};

export * from './types.js';
