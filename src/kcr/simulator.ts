import { KnowledgeCutoffRouter } from './router';
import {
  SimulationQuery,
  SimulationResult,
  SimulationSummary,
  RoutingError,
} from './types';

export class RoutingSimulator {
  constructor(private readonly router: KnowledgeCutoffRouter) {}

  run(queries: SimulationQuery[]): SimulationSummary {
    const results: SimulationResult[] = queries.map((query) => {
      try {
        const decision = this.router.route(query);
        const correct =
          typeof query.expectedSourceId === 'string'
            ? decision.source.id === query.expectedSourceId
            : undefined;
        const mismatchReason =
          typeof correct === 'boolean' && !correct
            ? `expected ${query.expectedSourceId} but received ${decision.source.id}`
            : undefined;

        return {
          query,
          decision,
          correct,
          mismatchReason,
        };
      } catch (error) {
        if (error instanceof RoutingError) {
          return {
            query,
            decision: {
              source: {
                id: 'unroutable',
                type: 'snapshot',
                knowledgeCutoff: query.requestedDate,
                jurisdictions: [],
                freshnessRisk: 'high',
              },
              reasons: [error.message],
            },
            correct: false,
            mismatchReason: error.message,
          };
        }
        throw error;
      }
    });

    const totals = results.reduce(
      (acc, result) => {
        acc.total += 1;
        if (result.correct === true) {
          acc.correct += 1;
        } else if (result.correct === false) {
          acc.incorrect += 1;
        }
        return acc;
      },
      { total: 0, correct: 0, incorrect: 0 },
    );

    return {
      results,
      ...totals,
    };
  }
}
