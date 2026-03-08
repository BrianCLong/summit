"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCausalChallenge = runCausalChallenge;
function runCausalChallenge(challenges, evaluator) {
    const outcomes = challenges.map((challenge) => {
        const passed = evaluator(challenge);
        return {
            challenge,
            passed,
            evidence: passed
                ? 'Challenge passed: failure reproduced'
                : 'Challenge failed: triggered repair',
        };
    });
    const success = outcomes.filter((o) => o.passed).length;
    const confidence = Math.min(1, success / Math.max(1, challenges.length));
    return { outcomes, confidence };
}
