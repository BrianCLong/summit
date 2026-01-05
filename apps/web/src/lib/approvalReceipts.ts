export type DecisionReceipt = {
  id: string
  decision: 'approved' | 'denied'
  runId: string
  stepId?: string
  actor: string
  riskScore: number
  createdAt: string
  policy: {
    allowed: boolean
    reason?: string
    elevation?: { contact: string; sla_hours: number }
  }
  notes: string
  redactedNotes: string
  receiptUrl: string
}

export type DecisionReceiptInput = Omit<
  DecisionReceipt,
  'id' | 'createdAt' | 'redactedNotes' | 'receiptUrl'
>

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const TOKEN_RE = /\b(?:sk|api|token|secret)[-_]?[A-Za-z0-9]{6,}\b/gi
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g

export function redactSensitive(value: string): string {
  return value
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(TOKEN_RE, '[redacted-token]')
    .replace(SSN_RE, '[redacted-ssn]')
}

export function buildDecisionReceipt(
  input: DecisionReceiptInput
): DecisionReceipt {
  const id = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const createdAt = new Date().toISOString()
  const redactedNotes = redactSensitive(input.notes)
  return {
    ...input,
    id,
    createdAt,
    redactedNotes,
    receiptUrl: `/maestro/receipts/${id}`,
  }
}
