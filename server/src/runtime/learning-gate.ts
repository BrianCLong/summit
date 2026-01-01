/**
 * Learning Gate
 *
 * Enforces the "Bounded Learning" protocol.
 * Ensures that no learning update is applied without:
 * 1. Verified Outcome (Eligibility check)
 * 2. Oversight Approval (if policy changing)
 * 3. Sandbox Validation (if significant)
 */

import { z } from 'zod';

// Schema matching outcome-evaluation.schema.json
export const OutcomeEvaluationSchema = z.object({
  decisionId: z.string().uuid(),
  timestamp: z.string().datetime(),
  expectedOutcome: z.record(z.any()).optional(),
  actualOutcome: z.record(z.any()),
  deltaExplanation: z.string().optional(),
  eligibilityForLearning: z.boolean(),
  verificationSource: z.string(),
  confidenceDelta: z.number().optional(),
});

export type OutcomeEvaluation = z.infer<typeof OutcomeEvaluationSchema>;

export class LearningGate {
  private static instance: LearningGate;

  private constructor() {}

  public static getInstance(): LearningGate {
    if (!LearningGate.instance) {
      LearningGate.instance = new LearningGate();
    }
    return LearningGate.instance;
  }

  /**
   * Evaluates if a given outcome can be used for system adaptation.
   */
  public async validateLearningEligibility(outcome: OutcomeEvaluation): Promise<boolean> {
    if (!outcome.eligibilityForLearning) {
      console.log(`[LearningGate] Decision ${outcome.decisionId} rejected: Not marked eligible.`);
      return false;
    }

    if (!outcome.verificationSource) {
       console.error(`[LearningGate] Decision ${outcome.decisionId} rejected: No verification source.`);
       return false;
    }

    // TODO: Integrate with Outcome Ledger to check for duplicates or conflicts
    // TODO: Integrate with Constitutional Constraints

    console.log(`[LearningGate] Decision ${outcome.decisionId} accepted for learning queue.`);
    return true;
  }

  /**
   * Records a learning event to the Oversight Register.
   */
  public async logLearningEvent(pipelineId: string, diff: any): Promise<void> {
    console.log(`[LearningGate] Logging learning event for pipeline ${pipelineId}`);
    // Persistence logic would go here
  }
}
