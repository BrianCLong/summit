import { ProposalTrigger, ChangeType } from './schema.js';

export interface DriftEvent {
  check: string;
  status: 'PASS' | 'FAIL';
  details?: any;
}

export function normalizeSignals(
  driftEvents: DriftEvent[],
  manualIntent?: { changeType: ChangeType; rationale: string }
): { triggers: ProposalTrigger[]; suggestedChange?: ChangeType } {
  const triggers: ProposalTrigger[] = [];
  let suggestedChange: ChangeType | undefined;

  // Process drift events
  for (const event of driftEvents) {
    if (event.status === 'FAIL') {
      let type: ChangeType | undefined;

      // Heuristic mapping from drift checks to policy changes
      if (event.check.includes('Auth') || event.check.includes('Rate Limit')) {
        // If auth/rate limits are failing, we might want to tighten guardrails
        type = 'ENFORCE_GUARDRAIL_PURPOSE';
      } else if (event.check.includes('Provenance')) {
          // If provenance is failing, maybe stricter deny?
          type = 'ENFORCE_GUARDRAIL_DENY';
      }

      if (type) {
        suggestedChange = type; // Last fail wins for now, or use priority logic
      }

      triggers.push({
        type: 'drift',
        source: 'detect_runtime_drift',
        details: { check: event.check, raw: event },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Manual intent overrides heuristics
  if (manualIntent) {
    suggestedChange = manualIntent.changeType;
    triggers.push({
      type: 'manual',
      source: 'operator',
      details: { rationale: manualIntent.rationale },
      timestamp: new Date().toISOString(),
    });
  }

  return { triggers, suggestedChange };
}

// Helper to parse the raw stdout from detect_runtime_drift.ts if we have to
export function parseDriftOutput(stdout: string): DriftEvent[] {
    const events: DriftEvent[] = [];
    const lines = stdout.split('\n');
    for (const line of lines) {
        if (line.includes('PASS:')) {
            events.push({ check: line.split(':')[1].trim(), status: 'PASS' });
        } else if (line.includes('FAIL:')) {
            events.push({ check: line.split(':')[1].trim(), status: 'FAIL' });
        }
    }
    return events;
}
