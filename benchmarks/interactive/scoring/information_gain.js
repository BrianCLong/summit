"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreInformationGain = scoreInformationGain;
/**
 * Calculates the information gain score based on the sequence of traces.
 *
 * This is a deterministic scoring function that evaluates how efficiently
 * the agent gathered information. A higher score means better information gain.
 */
function scoreInformationGain(traces) {
    if (traces.length === 0)
        return 0;
    let uniqueObservations = new Set();
    let totalReward = 0;
    for (const trace of traces) {
        // Assuming observation state can be uniquely stringified to assess novelty
        const obsStr = JSON.stringify(trace.observation.state);
        uniqueObservations.add(obsStr);
        totalReward += trace.reward;
    }
    // Information gain is a function of unique states explored and rewards gathered.
    const explorationScore = uniqueObservations.size / traces.length;
    const rewardScore = totalReward > 0 ? totalReward / traces.length : 0;
    // Weights could be adjusted, but this provides a simple deterministic score.
    return (explorationScore * 0.6) + (rewardScore * 0.4);
}
