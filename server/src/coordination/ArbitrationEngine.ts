
import {
  Intent,
  ProposedAction,
  CoordinationDecision,
  PriorityClass
} from './types';
import { IntentRegistry } from './IntentRegistry';
import { CoordinationReceipts } from './CoordinationReceipts';
import { StabilityGuards } from './StabilityGuards';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const PRIORITY_SCORES: Record<PriorityClass, number> = {
  'critical': 4,
  'high': 3,
  'normal': 2,
  'background': 1
};

export class ArbitrationEngine {
  private stabilityGuards: StabilityGuards;

  constructor(
    private registry: IntentRegistry,
    private receipts: CoordinationReceipts
  ) {
    this.stabilityGuards = new StabilityGuards();
  }

  async evaluateAction(action: ProposedAction): Promise<CoordinationDecision> {
    const actingIntent = this.registry.getIntent(action.intentId);

    if (!actingIntent) {
      const decision: CoordinationDecision = {
        decisionId: uuidv4(),
        intentId: action.intentId,
        timestamp: Date.now(),
        outcome: 'suppress',
        reason: 'Intent not registered',
      };
      await this.receipts.logDecision(decision);
      return decision;
    }

    // Stability Check
    if (!this.stabilityGuards.checkStability(action)) {
       const decision: CoordinationDecision = {
        decisionId: uuidv4(),
        intentId: action.intentId,
        timestamp: Date.now(),
        outcome: 'suppress',
        reason: 'Stability guard check failed (thrashing detected)',
        arbitrationRuleApplied: 'STABILITY_GUARD'
      };
      await this.receipts.logDecision(decision);
      return decision;
    }

    const conflictingIntents = this.detectConflicts(action, actingIntent);

    if (conflictingIntents.length === 0) {
      // Record action for stability tracking before proceeding
      this.stabilityGuards.recordAction(action);

      const decision: CoordinationDecision = {
        decisionId: uuidv4(),
        intentId: action.intentId,
        timestamp: Date.now(),
        outcome: 'proceed',
        reason: 'No conflicts detected',
      };
      await this.receipts.logDecision(decision);
      return decision;
    }

    const decision = this.arbitrate(action, actingIntent, conflictingIntents);

    // If decision is proceed (even if overridden or advisory), record it.
    if (decision.outcome === 'proceed') {
        this.stabilityGuards.recordAction(action);
    }

    await this.receipts.logDecision(decision);
    return decision;
  }

  private detectConflicts(action: ProposedAction, actingIntent: Intent): Intent[] {
    const allIntents = this.registry.getActiveIntents();
    const conflicts: Intent[] = [];

    for (const otherIntent of allIntents) {
      if (otherIntent.id === actingIntent.id) continue;

      // Conflict Type 1: Impact on Protected Metrics
      for (const impact of action.predictedImpact) {
        // If the action negatively impacts a metric protected by another intent
        // And that metric is NOT in the allowed tradeoffs of the other intent
        const isProtected = otherIntent.protectedMetrics.some(pm => pm.metricName === impact.metricName);
        const isAllowedTradeoff = otherIntent.allowedTradeoffs.includes(impact.metricName);

        if (isProtected && !isAllowedTradeoff) {
            conflicts.push(otherIntent);
            break;
        }
      }
    }

    return conflicts;
  }

  private arbitrate(
    action: ProposedAction,
    actingIntent: Intent,
    conflictingIntents: Intent[]
  ): CoordinationDecision {
    const actingScore = PRIORITY_SCORES[actingIntent.priority];

    // Tier 0 (Advisory) check
    // If the acting intent is Tier 0, it cannot be blocked, but it's advisory.
    // However, if it conflicts, we should signal that.
    // Wait, requirement: "Tier 0 loops never blocked (advisory only)"
    // This implies that even if there is a conflict, we return 'proceed' but mark it advisory.
    // BUT, if it's purely advisory, maybe the 'outcome' is 'proceed' but the system executing it
    // knows it's a dry-run? Or does the coordination layer enforce the dry-run?
    // "Actions are advisory only. The coordination layer logs them but they do not automatically execute"
    // So 'proceed' might be misleading if the caller thinks they can execute.
    // Let's treat 'proceed' with 'isAdvisory=true' as "You are allowed to proceed with your advisory action (logging/simulation)".

    if (actingIntent.tier === 0) {
       return {
        decisionId: uuidv4(),
        intentId: actingIntent.id,
        timestamp: Date.now(),
        outcome: 'proceed',
        reason: `Tier 0 intent conflict detected with ${conflictingIntents.map(i => i.id).join(', ')}. Proceeding in ADVISORY mode.`,
        arbitrationRuleApplied: 'TIER_0_ADVISORY',
        conflictingIntents: conflictingIntents.map(i => i.id),
        isAdvisory: true
      };
    }

    // Find highest priority conflict
    let maxConflictScore = 0;
    let winner: Intent | null = null;

    for (const conflict of conflictingIntents) {
      const score = PRIORITY_SCORES[conflict.priority];
      if (score > maxConflictScore) {
        maxConflictScore = score;
        winner = conflict;
      }
    }

    // Arbitration Rules

    // Rule 1: Policy/Critical always wins
    if (maxConflictScore === PRIORITY_SCORES['critical'] && actingScore < PRIORITY_SCORES['critical']) {
      return {
        decisionId: uuidv4(),
        intentId: actingIntent.id,
        timestamp: Date.now(),
        outcome: 'suppress',
        reason: `Conflict with Critical priority intent: ${winner?.id}`,
        arbitrationRuleApplied: 'CRITICAL_PRIORITY_OVERRIDE',
        conflictingIntents: conflictingIntents.map(i => i.id)
      };
    }

    // Rule 2: Higher priority wins
    if (actingScore > maxConflictScore) {
       return {
        decisionId: uuidv4(),
        intentId: actingIntent.id,
        timestamp: Date.now(),
        outcome: 'proceed',
        reason: `Acting intent priority (${actingIntent.priority}) exceeds max conflicting priority`,
        arbitrationRuleApplied: 'PRIORITY_DOMINANCE',
        conflictingIntents: conflictingIntents.map(i => i.id)
      };
    }

    // Rule 3: Equal priority?
    if (actingScore === maxConflictScore) {
        // Sub-rule: SLA/Reliability beats Cost (if both are same priority class)
        // We use domain hierarchy: Policy > Reliability > Performance > Cost > Autonomy
        const domainRank = {
            'policy': 5,
            'reliability': 4,
            'performance': 3,
            'cost': 2,
            'autonomy': 1
        };

        const actingRank = domainRank[actingIntent.domain];
        const winnerRank = winner ? domainRank[winner.domain] : 0;

        if (actingRank > winnerRank) {
            return {
                decisionId: uuidv4(),
                intentId: actingIntent.id,
                timestamp: Date.now(),
                outcome: 'proceed',
                reason: `Domain hierarchy (${actingIntent.domain}) supersedes conflict`,
                arbitrationRuleApplied: 'DOMAIN_HIERARCHY',
                conflictingIntents: conflictingIntents.map(i => i.id)
            };
        }
    }

    // Default: Suppress if can't strictly win
    return {
        decisionId: uuidv4(),
        intentId: actingIntent.id,
        timestamp: Date.now(),
        outcome: 'suppress',
        reason: `Action suppressed due to conflict with ${winner?.id} (Score: ${maxConflictScore} vs ${actingScore})`,
        arbitrationRuleApplied: 'CONFLICT_AVOIDANCE',
        conflictingIntents: conflictingIntents.map(i => i.id)
    };
  }
}
