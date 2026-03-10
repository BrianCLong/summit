export function canPromote(result) {
    return result.hiddenEvalPass &&
        result.costDeltaPct <= 10 &&
        result.qualityDeltaPct >= 5 &&
        result.policyViolations === 0;
}
