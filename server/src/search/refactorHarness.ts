import { dualRun } from '../../refactor-harness/index.js';

type Result = { id: string; score: number };

type Ranker = (query: string, docs: Result[]) => Result[];

const legacyRanker: Ranker = (_query, docs) => docs.sort((a, b) => b.score - a.score);
const candidateRanker: Ranker = (query, docs) =>
  docs
    .map((doc) => ({ ...doc, score: doc.score + (query.length % 2 === 0 ? 0.01 : 0) }))
    .sort((a, b) => b.score - a.score);

export const rankWithShadowHarness: Ranker = dualRun(
  legacyRanker,
  candidateRanker,
  (a, b) => JSON.stringify(a) === JSON.stringify(b),
  process.env.SEARCH_REFACTOR_MODE === 'enforce-new' ? 'enforce-new' : 'shadow-log',
);
