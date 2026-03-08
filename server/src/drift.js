"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftScore = driftScore;
exports.postDriftAlert = postDriftAlert;
function driftScore(diffs) {
    return Math.min(1, diffs.length / 50);
}
async function postDriftAlert(stepId, diffs) {
    const hook = process.env.SLACK_WEBHOOK;
    if (!hook)
        return;
    await fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            text: `⚠️ Drift in ${stepId}\n${diffs.slice(0, 10).join('\n')}`,
        }),
    });
}
