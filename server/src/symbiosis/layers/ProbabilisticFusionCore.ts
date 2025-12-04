import { BeliefState, FusionDiff } from '../types';

export class ProbabilisticFusionCore {
  private beliefStore: Map<string, BeliefState>;

  constructor() {
    this.beliefStore = new Map();
  }

  public fuse(inputs: BeliefState[]): { fused: Record<string, any>, diffs: FusionDiff[] } {
    const fused: Record<string, any> = {};
    const diffs: FusionDiff[] = [];
    const keyMap = new Map<string, BeliefState[]>();

    // Group by key
    for (const input of inputs) {
      for (const [key, value] of Object.entries(input.facts)) {
        if (!keyMap.has(key)) keyMap.set(key, []);
        keyMap.get(key)!.push({ ...input, facts: { [key]: value } });
      }
    }

    // Resolve conflicts
    for (const [key, beliefs] of keyMap.entries()) {
      if (beliefs.length === 1) {
        fused[key] = beliefs[0].facts[key];
      } else {
        // Simple weighted fusion
        let bestBelief = beliefs[0];
        let maxConfidence = -1;

        // Check for conflicts
        const values = new Set(beliefs.map(b => JSON.stringify(b.facts[key])));
        if (values.size > 1) {
             // Conflict detected
             const conflictBeliefs = beliefs.sort((a, b) => b.confidence - a.confidence);
             bestBelief = conflictBeliefs[0];
             const runnerUp = conflictBeliefs[1];

             diffs.push({
               path: key,
               conflict: {
                 sourceA: bestBelief.source,
                 valueA: bestBelief.facts[key],
                 confidenceA: bestBelief.confidence,
                 sourceB: runnerUp.source,
                 valueB: runnerUp.facts[key],
                 confidenceB: runnerUp.confidence
               },
               resolution: 'blended' // Defaulting to winner-take-all for now
             });
        } else {
            // All agree, pick highest confidence
            bestBelief = beliefs.reduce((prev, curr) => curr.confidence > prev.confidence ? curr : prev);
        }

        fused[key] = bestBelief.facts[key];
      }
    }

    return { fused, diffs };
  }
}
