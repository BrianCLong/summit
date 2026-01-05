// =============================================
// File: apps/web/tests/policy-contracts.spec.ts
// =============================================
import { describe, expect, it } from 'vitest'
import { MaestroApi } from '../lib/maestroApi'
import { buildDecisionReceipt } from '../lib/approvalReceipts'

describe('Policy contracts', () => {
  const api = new MaestroApi({ mock: true })

  it('allows approved actions on the happy path', async () => {
    const result = await api.policyCheck('run/start', {
      runId: 'run_1',
      environment: 'production',
    })
    expect(result.allowed).toBe(true)
  })

  it('denies exports when policy blocks the action', async () => {
    const result = await api.policyCheck('export/report', {
      runId: 'run_9',
      destination: 'evidence-bucket',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it('redacts sensitive notes inside decision receipts', () => {
    const receipt = buildDecisionReceipt({
      decision: 'approved',
      runId: 'run_8',
      stepId: 'step_2',
      actor: 'operator@intelgraph.local',
      riskScore: 82,
      policy: { allowed: true },
      notes: 'Escalate to ops@example.com with token sk_secret123456',
    })
    expect(receipt.redactedNotes).not.toContain('ops@example.com')
    expect(receipt.redactedNotes).not.toContain('sk_secret123456')
    expect(receipt.redactedNotes).toContain('[redacted-email]')
  })
})
