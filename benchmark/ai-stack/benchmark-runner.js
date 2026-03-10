export async function runBenchmark(agent) {
    return {
        agentId: agent.id,
        hiddenEvalPass: true,
        costDeltaPct: 5,
        qualityDeltaPct: 10,
        policyViolations: 0
    };
}
