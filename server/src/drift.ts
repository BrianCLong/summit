export function driftScore(diffs: string[]) {
  return Math.min(1, diffs.length / 50);
}

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
