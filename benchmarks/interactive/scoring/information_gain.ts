import { TraceEvent } from '../runners/interactive_runner';

/**
 * Deterministic scoring function for measuring information gain over the trace.
 * This is a simplified proxy implementation. In reality, it would evaluate the 'metadata'
 * or 'observation' size/uniqueness across steps.
 */
export function scoreInformationGain(trace: TraceEvent[]): number {
  if (!trace || trace.length === 0) return 0;

  // Example heuristic: unique observation states visited
  const uniqueStates = new Set<string>();

  for (const event of trace) {
    if (event.observation) {
      // JSON.stringify provides a deterministic, simple state hash for basic environments
      uniqueStates.add(JSON.stringify(event.observation));
    }
  }

  return uniqueStates.size;
}
