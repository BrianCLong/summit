import { ExplicitationArtifact, RetrievalGateInput } from './types';

export const assertRetrievalAllowed = (input: RetrievalGateInput): ExplicitationArtifact => {
  if (input.explicitation) {
    return input.explicitation;
  }

  if (input.governanceWaiver?.waiverId) {
    return {
      explicit_query: 'Governance waiver granted; explicitation bypassed.',
      intent: 'governance-waiver',
      domain_guess: 'governance',
      entities: [],
      visual_evidence: [],
      assumptions: [`Waiver ${input.governanceWaiver.waiverId} approved by ${input.governanceWaiver.approvedBy}.`],
      unknown_slots: [],
      retrieval_plan: [],
      answer_style: 'explanation',
      confidence: 0.1,
      clarifying_question: undefined,
    };
  }

  throw new Error(
    'Retrieval blocked: explicitation artifact missing. Provide explicitation or a governance waiver.',
  );
};
