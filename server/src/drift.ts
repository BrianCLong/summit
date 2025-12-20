/**
 * Calculates a drift score based on the number of differences.
 * The score is normalized between 0 and 1.
 *
 * @param diffs - An array of differences.
 * @returns The calculated drift score.
 */
export function driftScore(diffs: string[]) {
  return Math.min(1, diffs.length / 50);
}

/**
 * Posts a drift alert to a Slack webhook.
 *
 * @param stepId - The ID of the step where drift was detected.
 * @param diffs - An array of differences describing the drift.
 */
export async function postDriftAlert(stepId: string, diffs: string[]) {
  const hook = process.env.SLACK_WEBHOOK;
  if (!hook) return;
  await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ Drift in ${stepId}\n${diffs.slice(0, 10).join('\n')}`,
    }),
  });
}
