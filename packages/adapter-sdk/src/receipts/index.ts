export interface ReceiptPayload {
  adapterId: string;
  runId: string;
  lifecycle: string;
  decision: "allow" | "deny";
  inputsDigest: string;
  outputsDigest?: string;
  retries: number;
  durationMs: number;
  externalCalls: Array<{ target: string; redacted: boolean }>;
  timestamp: string;
}

export function createReceipt(payload: ReceiptPayload): ReceiptPayload {
  return {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

export function summarizeReceipt(receipt: ReceiptPayload): string {
  return [
    `decision=${receipt.decision}`,
    `durationMs=${receipt.durationMs}`,
    `retries=${receipt.retries}`,
    `inputsDigest=${receipt.inputsDigest}`,
    receipt.outputsDigest ? `outputsDigest=${receipt.outputsDigest}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
