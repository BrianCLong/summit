export function generateEvidenceId(workflowId: string, seq: number): `LEDGER:${string}:${number}` {
    return `LEDGER:${workflowId}:${seq}`;
}
