export function nextEvidenceId(runId: string, seq: number): string {
  return `EVID:OA:${runId}:${String(seq).padStart(6, '0')}`;
}
