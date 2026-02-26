const ORCH_EVIDENCE_ID_PATTERN = /^SUMMIT-ORCH-\d{4}$/;

export function formatOrchestratorEvidenceId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9999) {
    throw new Error('evidence sequence must be an integer between 0 and 9999');
  }

  return `SUMMIT-ORCH-${sequence.toString().padStart(4, '0')}`;
}

export function isOrchestratorEvidenceId(value: string): boolean {
  return ORCH_EVIDENCE_ID_PATTERN.test(value);
}
