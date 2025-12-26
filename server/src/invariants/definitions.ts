import { Invariant } from './types';

export const SYSTEM_INVARIANTS: Invariant[] = [
  {
    id: 'INV-001',
    name: 'Provenance Integrity',
    description: 'All state mutations must be recorded in the Provenance Ledger.',
    severity: 'critical',
    check: async (context: any) => {
      // Logic: Ensure that for a write operation, a provenance entry ID exists
      if (context.operationType === 'write' || context.operationType === 'mutation') {
        return !!context.provenanceId;
      }
      return true;
    },
    remediation: 'Rollback transaction and alert security team.'
  },
  {
    id: 'INV-001-RESPONSE',
    name: 'Provenance Integrity (Response)',
    description: 'All state-changing API responses must include an X-Provenance-ID header.',
    severity: 'critical',
    check: async (context: any) => {
      if (context.isStateChange) {
        return !!context.provenanceHeader;
      }
      return true;
    },
    remediation: 'Rollback transaction and alert security team.'
  },
  {
    id: 'INV-002',
    name: 'Agent Permissions',
    description: 'Agents must not exceed their defined scope or budget.',
    severity: 'high',
    check: async (context: any) => {
      if (context.agentId && context.scope) {
        // Mock check: in reality would query Policy Engine
        // For now, we assume context.allowedScopes is passed
        if (context.allowedScopes && !context.allowedScopes.includes(context.scope)) {
          return false;
        }
      }
      return true;
    },
    remediation: 'Terminate agent session immediately.'
  },
  {
    id: 'INV-003',
    name: 'Analytics Labeling',
    description: 'All analytics data must have sensitivity labels.',
    severity: 'medium',
    check: async (context: any) => {
      if (context.dataType === 'analytics') {
        return !!context.sensitivityLabel;
      }
      return true;
    }
  },
  {
    id: 'INV-004',
    name: 'Autonomy Constraints',
    description: 'High-stakes operations require human-in-the-loop or specific authorization.',
    severity: 'critical',
    check: async (context: any) => {
      if (context.highStakes && !context.authorizedBy) {
        return false;
      }
      return true;
    }
  }
];
