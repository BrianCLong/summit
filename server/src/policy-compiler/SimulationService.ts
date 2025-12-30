
import { PolicySpec } from './types.js';
import { EnforcementService } from './EnforcementService.js';
import { RuntimeContext, EnforcementResult } from './types.js';
import { PolicyCompiler } from './PolicyCompiler.js';

export interface SimulationResult {
  totalEvents: number;
  allowed: number;
  denied: number;
  denialsByReason: Record<string, number>;
  details: Array<{
    eventId: string;
    originalDecision: boolean;
    simulatedDecision: boolean;
    diff: 'MATCH' | 'NEW_DENIAL' | 'NEW_ALLOW';
    reason?: string;
  }>;
}

export class SimulationService {
  private enforcementService: EnforcementService;

  constructor() {
    this.enforcementService = EnforcementService.getInstance();
  }

  /**
   * Run a simulation of a policy against a set of historical events.
   * @param policy The policy to test
   * @param events List of historical events (mapped to RuntimeContext)
   */
  public async simulate(policy: PolicySpec, events: Array<{ id: string, context: RuntimeContext, originalOutcome: boolean }>): Promise<SimulationResult> {
    const compiler = PolicyCompiler.getInstance();
    const plan = compiler.compile(policy);

    const result: SimulationResult = {
      totalEvents: 0,
      allowed: 0,
      denied: 0,
      denialsByReason: {},
      details: []
    };

    for (const event of events) {
      result.totalEvents++;

      let decision: EnforcementResult;

      // Delegate to enforcement service using the compiled plan
      switch (event.context.action.type) {
        case 'query':
          decision = this.enforcementService.evaluateQuery(event.context, plan);
          break;
        case 'export':
          decision = this.enforcementService.evaluateExport(event.context, plan);
          break;
        case 'runbook':
          decision = this.enforcementService.evaluateRunbookStep(event.context, plan);
          break;
        default:
          decision = { allowed: true, decisionId: 'sim-unknown' }; // Should not happen if types are correct
      }

      if (decision.allowed) {result.allowed++;}
      else {
        result.denied++;
        if (decision.reason) {
            const code = decision.reason.code;
            result.denialsByReason[code] = (result.denialsByReason[code] || 0) + 1;
        }
      }

      const isMatch = decision.allowed === event.originalOutcome;
      let diff: 'MATCH' | 'NEW_DENIAL' | 'NEW_ALLOW' = 'MATCH';
      if (!isMatch) {
        if (decision.allowed) {diff = 'NEW_ALLOW';}
        else {diff = 'NEW_DENIAL';}
      }

      result.details.push({
        eventId: event.id,
        originalDecision: event.originalOutcome,
        simulatedDecision: decision.allowed,
        diff,
        reason: decision.reason?.humanMessage
      });
    }

    return result;
  }
}
