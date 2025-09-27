import type { MockedResponse } from '@apollo/client/testing';
import { EXPLAIN_DECISION_QUERY } from './queries';
import { explainDecisionFixture } from './fixtures';

export type CreateExplainDecisionMocksOptions = {
  paragraphId?: string;
};

export const createExplainDecisionMocks = (
  options: CreateExplainDecisionMocksOptions = {},
): MockedResponse[] => {
  const paragraphId = options.paragraphId ?? explainDecisionFixture.paragraphId;

  return [
    {
      request: {
        query: EXPLAIN_DECISION_QUERY,
        variables: { paragraphId },
      },
      result: {
        data: {
          decisionExplanation: {
            ...explainDecisionFixture,
            paragraphId,
          },
        },
      },
    },
  ];
};
