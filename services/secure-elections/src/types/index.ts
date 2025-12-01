/**
 * Type exports for @intelgraph/secure-elections
 */

export * from './election.js';

// Re-export service types
export type {
  BallotBlock,
  LedgerStats,
} from '../blockchain/ballot-ledger.js';

export type {
  PrivacyConfig,
  AnonymizedVoterData,
  AggregatedResult,
} from '../privacy/differential-privacy.js';

export type {
  TallyResult,
  ElectionResults,
  RealtimeUpdate,
} from '../results/real-time-aggregator.js';

export type {
  Proposal,
  Comment,
  DeliberationSession,
  CitizenPreference,
  BudgetAllocation,
} from '../feedback/citizen-deliberation.js';
