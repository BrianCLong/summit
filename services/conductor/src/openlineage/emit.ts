export function emitOL({
  runId,
  stepId,
  when,
  type,
  inputs,
  outputs,
}: {
  runId: string;
  stepId: string;
  when: Date;
  type: 'START' | 'COMPLETE' | 'FAIL';
  inputs: any[];
  outputs: any[];
}) {
  const ev = {
    eventType: type,
    eventTime: when.toISOString(),
    run: { facets: { runId } },
    job: { namespace: 'maestro', name: 'conductor', facets: { stepId } },
    inputs,
    outputs,
  };
  fetch(process.env.OL_ENDPOINT!, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ev),
  }).catch(() => {});
}
