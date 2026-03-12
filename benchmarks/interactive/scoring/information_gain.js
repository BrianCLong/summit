/**
 * Deterministic scoring function for measuring information gain over the trace.
 * This is a simplified proxy implementation. In reality, it would evaluate the 'metadata'
 * or 'observation' size/uniqueness across steps.
 */
export function scoreInformationGain(trace) {
    if (!trace || trace.length === 0)
        return 0;
    const uniqueStates = new Set();
    let totalReward = 0;
    for (const event of trace) {
        if (event.observation !== undefined) {
            uniqueStates.add(JSON.stringify(event.observation));
        }
        if (event.reward) {
            totalReward += event.reward;
        }
    }
    const explorationScore = uniqueStates.size / trace.length;
    const rewardScore = totalReward / trace.length;
    return explorationScore * 0.6 + rewardScore * 0.4;
}
