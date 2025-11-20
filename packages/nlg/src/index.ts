/**
 * @summit/nlg
 *
 * Natural Language Generation for automated report narratives,
 * summaries, findings, and recommendations
 */

export { NarrativeGenerator } from './generators/NarrativeGenerator.js';
export type {
  NarrativeContext,
  GeneratedNarrative
} from './generators/NarrativeGenerator.js';

export { TextSummarizer } from './summarizers/TextSummarizer.js';
export type {
  SummaryOptions,
  Summary
} from './summarizers/TextSummarizer.js';

export { DataNarrativeAnalyzer } from './analyzers/DataNarrativeAnalyzer.js';
export type {
  DataPoint,
  TrendAnalysis
} from './analyzers/DataNarrativeAnalyzer.js';
