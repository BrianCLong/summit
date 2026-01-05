import {
  PolicyChangeProposal,
  PolicyChangeProposalSchema,
  SecurityEvidence,
  ProposedChange,
  RiskAssessment,
  Verification
} from './proposal-types.js';
import crypto from 'crypto';

export interface ProposalRule {
  id: string;
  name: string;
  evaluate(evidence: SecurityEvidence): PolicyChangeProposal | null;
}

export class ProposalEngine {
  private rules: ProposalRule[] = [];

  registerRule(rule: ProposalRule) {
    this.rules.push(rule);
  }

  generateProposal(evidence: SecurityEvidence): PolicyChangeProposal | null {
    for (const rule of this.rules) {
      const proposal = rule.evaluate(evidence);
      if (proposal) {
        // Ensure ID is deterministic based on evidence and rule
        if (!proposal.id) {
            proposal.id = this.generateDeterministicId(evidence, rule.id);
        }
        return proposal;
      }
    }
    return null;
  }

  private generateDeterministicId(evidence: SecurityEvidence, ruleId: string): string {
    const data = `${evidence.id}-${ruleId}-${JSON.stringify(evidence.data)}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
}

// --- Specific Rules ---

// 1. Deny-rate spike -> tighten/clarify allowlist
export class DenyRateRule implements ProposalRule {
  id = 'deny-rate-spike';
  name = 'Deny Rate Spike Handler';

  evaluate(evidence: SecurityEvidence): PolicyChangeProposal | null {
    if (evidence.type !== 'deny_spike') return null;

    const { subject, action, resource, count, reason } = evidence.data;

    // Logic: Deny spikes usually indicate an attack or a misconfigured/compromised service.
    // We default to "Defense" -> propose explicit DENY or stricter monitoring for the source.
    // If the tool is unknown, we propose blocking it.

    if (count > 50 && reason === 'Insufficient permissions') {
       // Use evidence timestamp for deterministic ID and expiration
       const baseTime = new Date(evidence.timestamp).getTime();

       // Defensive proposal: Add to a denylist or require strict attribution
       // Since we are targeting allowlist.yaml, we don't really have a "denylist" there.
       // Let's assume we target 'policy/governance-config.yaml' to add a strict rule.

       const change: ProposedChange = {
          target: 'policy/governance-config.yaml',
          keyPath: `restrictions.${subject?.id || 'unknown'}`,
          operation: 'add',
          value: {
            mode: 'block',
            reason: `High deny rate (${count}) detected. Blocking pending investigation.`,
            expires: new Date(baseTime + 24 * 60 * 60 * 1000).toISOString() // 24h block
          }
       };

       return {
         id: '', // Will be filled by engine
         createdAt: evidence.timestamp, // Use evidence timestamp for stability
         createdBy: 'policy-auto-tuning-engine',
         inputEvidenceRefs: [evidence.id],
         rationale: `High volume of denials (${count}) detected for ${subject?.id}. Proposing explicit block to mitigate potential attack.`,
         machineRationale: {
           trigger: 'deny_spike',
           confidence: 0.8,
           features: { count, subject: subject?.id }
         },
         proposedChanges: [change],
         riskAssessment: {
           blastRadius: 'low', // Specific to this subject
           falsePositiveRisk: 'medium', // Could be a legitimate service misconfigured
           rollbackSteps: [`Remove restrictions.${subject?.id} from policy/governance-config.yaml`]
         },
         verification: {
            commands: [`curl -X POST http://localhost:4000/verify-access -d '{"user": "${subject?.id}"}'`],
            expectedSignals: ['403 Forbidden', 'Policy Violation']
         },
         status: 'proposed'
       };
    }

    return null;
  }
}

// 3. Tool-mix shift / high-risk tool concentration -> risk weights + approvals
export class ToolMixRule implements ProposalRule {
  id = 'tool-mix-shift';
  name = 'Tool Mix Shift Handler';

  evaluate(evidence: SecurityEvidence): PolicyChangeProposal | null {
    if (evidence.type !== 'tool_mix_shift') return null;

    const { toolCategory, usageCount, riskScore } = evidence.data;

    if (riskScore > 0.8 && usageCount > 10) {
       // Propose increasing risk weight or requiring approval
       const change: ProposedChange = {
          target: 'policy/governance-config.yaml',
          keyPath: `risk_weights.${toolCategory}`,
          operation: 'replace',
          value: 0.9, // Elevate risk to Critical/High
          originalValue: riskScore
       };

       return {
         id: '',
         createdAt: evidence.timestamp,
         createdBy: 'policy-auto-tuning-engine',
         inputEvidenceRefs: [evidence.id],
         rationale: `Detected shift in high-risk tool usage (${toolCategory}). Elevating risk weight to enforce stricter approval chains.`,
         machineRationale: {
           trigger: 'tool_mix_shift',
           confidence: 0.85,
           features: { toolCategory, riskScore }
         },
         proposedChanges: [change],
         riskAssessment: {
            blastRadius: 'medium',
            falsePositiveRisk: 'low',
            rollbackSteps: [`Revert risk_weights.${toolCategory} to ${riskScore}`]
         },
         verification: {
            commands: [`grep "${toolCategory}: 0.9" policy/governance-config.yaml`],
            expectedSignals: ['0.9']
         },
         status: 'proposed'
       };
    }
    return null;
  }
}

// 4. Redaction triggers -> enforce stricter redaction
export class RedactionRule implements ProposalRule {
  id = 'redaction-trigger';
  name = 'Redaction Trigger Handler';

  evaluate(evidence: SecurityEvidence): PolicyChangeProposal | null {
      if (evidence.type !== 'redaction_trigger') return null;

      const { fieldName, sampleValue } = evidence.data;

      // If we see a field that looks sensitive but isn't redacted, propose adding it
      const change: ProposedChange = {
          target: 'policy/retention.yaml',
          keyPath: 'redaction_fields',
          operation: 'add',
          value: fieldName
      };

      return {
          id: '',
          createdAt: evidence.timestamp,
          createdBy: 'policy-auto-tuning-engine',
          inputEvidenceRefs: [evidence.id],
          rationale: `Sensitive data leak detected in field '${fieldName}'. Proposing immediate addition to redaction list.`,
          machineRationale: {
              trigger: 'redaction_trigger',
              confidence: 0.95,
              features: { fieldName }
          },
          proposedChanges: [change],
          riskAssessment: {
              blastRadius: 'low',
              falsePositiveRisk: 'low',
              rollbackSteps: [`Remove '${fieldName}' from policy/retention.yaml`]
          },
          verification: {
              commands: [`curl -v http://localhost:4000/api/debug?field=${fieldName}`],
              expectedSignals: ['[REDACTED]']
          },
          status: 'proposed'
      };
  }
}

// 2. Burst behavior -> budgets / rate limits
export class BurstRule implements ProposalRule {
  id = 'burst-behavior';
  name = 'Burst Behavior Handler';

  evaluate(evidence: SecurityEvidence): PolicyChangeProposal | null {
    if (evidence.type !== 'burst_behavior') return null;

    const { tenantId, service, rps } = evidence.data;

    if (rps > 100) {
       // Propose updating the rate limit config
       // Assuming config is in server/src/config/schema.ts defaults or env vars,
       // but we target a hypothetical governance config for per-tenant overrides.

       // For this specific repo, we learned that governance-config.yaml has environment modes.
       // It doesn't strictly have rate limits, but let's assume we can add them to a 'quotas' section
       // or we modify server/src/config/rateLimit.ts (code change! - risky).

       // Safer: "Propose" a change to a config file that *controls* quotas.
       // Let's assume we can patch `policy/governance-config.yaml` to add a `quotas` key.

       const change: ProposedChange = {
         target: 'policy/governance-config.yaml',
         keyPath: `quotas.${tenantId}`,
         operation: 'add',
         value: {
           max_rps: 50, // Throttle them down
           comment: `Throttled due to burst of ${rps} RPS`
         }
       };

       return {
         id: '',
         createdAt: evidence.timestamp, // Use evidence timestamp for stability
         createdBy: 'policy-auto-tuning-engine',
         inputEvidenceRefs: [evidence.id],
         rationale: `Tenant ${tenantId} exceeded burst thresholds (${rps} RPS). Proposing specific quota limit.`,
         machineRationale: {
           trigger: 'burst_behavior',
           confidence: 0.9,
           features: { rps, tenantId }
         },
         proposedChanges: [change],
         riskAssessment: {
           blastRadius: 'medium', // Affects that tenant
           falsePositiveRisk: 'low',
           rollbackSteps: [`Remove quotas.${tenantId} from policy/governance-config.yaml`]
         },
         verification: {
            commands: [`k6 run scripts/load-test.js --env TENANT=${tenantId}`],
            expectedSignals: ['429 Too Many Requests']
         },
         status: 'proposed'
       };
    }
    return null;
  }
}
