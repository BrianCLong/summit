// =============================================
// Maestro Approvals Management
// =============================================
import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { DataIntegrityNotice } from '../../../components/common/DataIntegrityNotice'
import { useDemoMode } from '../../../components/common/DemoIndicator'
import { useNotification } from '../../../contexts/NotificationContext'
import { maestroApi, PolicyCheckResponse } from '../../../lib/maestroApi'
import { buildDecisionReceipt, DecisionReceipt } from '../../../lib/approvalReceipts'

interface ApprovalRequest {
  id: string
  runId: string
  stepId?: string
  title: string
  requestedBy: string
  requestedAt: string
  policyAction: string
  riskScore: number
  requiresRedaction: boolean
  contextSummary: string
}

const mockApprovals: ApprovalRequest[] = [
  {
    id: 'approval-001',
    runId: 'run_12',
    stepId: 'step_3',
    title: 'Release evidence bundle',
    requestedBy: 'maestro@intelgraph.local',
    requestedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    policyAction: 'export/report',
    riskScore: 86,
    requiresRedaction: true,
    contextSummary: 'Exports contain source identifiers and analyst notes.',
  },
  {
    id: 'approval-002',
    runId: 'run_21',
    stepId: 'step_1',
    title: 'Re-run enrichment step',
    requestedBy: 'scheduler@intelgraph.local',
    requestedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    policyAction: 'run/step/retry',
    riskScore: 54,
    requiresRedaction: false,
    contextSummary: 'Retry required due to upstream timeout.',
  },
  {
    id: 'approval-003',
    runId: 'run_33',
    stepId: 'step_5',
    title: 'Cancel live run',
    requestedBy: 'ops@intelgraph.local',
    requestedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    policyAction: 'run/cancel',
    riskScore: 72,
    requiresRedaction: false,
    contextSummary: 'Run exceeds spend threshold.',
  },
]

type DecisionState = {
  approval: ApprovalRequest
  decision: 'approved' | 'denied'
}

const APPROVER_EMAIL = 'operator@intelgraph.local'

export default function Approvals() {
  const isDemoMode = useDemoMode()
  const { showNotification } = useNotification()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(
    isDemoMode ? mockApprovals : []
  )
  const [receipts, setReceipts] = useState<DecisionReceipt[]>([])
  const [decisionState, setDecisionState] = useState<DecisionState | null>(null)
  const [policyResult, setPolicyResult] = useState<PolicyCheckResponse | null>(
    null
  )
  const [notes, setNotes] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const approvalsEmpty = approvals.length === 0

  const confirmationPhrase = useMemo(() => {
    if (!decisionState) return ''
    return decisionState.decision === 'approved' ? 'APPROVE' : 'DENY'
  }, [decisionState])

  const isConfirmValid =
    confirmationPhrase.length > 0 &&
    confirmText.trim().toUpperCase() === confirmationPhrase

  const openDecision = async (
    approval: ApprovalRequest,
    decision: DecisionState['decision']
  ) => {
    setDecisionState({ approval, decision })
    setNotes('')
    setConfirmText('')
    setPolicyResult(null)
    setIsChecking(true)
    try {
      const result = await maestroApi.policyCheck(approval.policyAction, {
        runId: approval.runId,
        stepId: approval.stepId,
        riskScore: approval.riskScore,
        decision,
      })
      setPolicyResult(result)
    } catch (error) {
      setPolicyResult({
        allowed: false,
        reason: 'Policy simulation failed.',
      })
    } finally {
      setIsChecking(false)
    }
  }

  const closeDecision = () => {
    setDecisionState(null)
    setPolicyResult(null)
    setNotes('')
    setConfirmText('')
    setIsChecking(false)
    setIsSubmitting(false)
  }

  const submitDecision = async () => {
    if (!decisionState) return
    setIsSubmitting(true)

    const payload = {
      runId: decisionState.approval.runId,
      stepId: decisionState.approval.stepId,
      riskScore: decisionState.approval.riskScore,
      policyAction: decisionState.approval.policyAction,
      decision: decisionState.decision,
    }

    const result = await maestroApi.policyCheck(
      decisionState.approval.policyAction,
      payload
    )
    setPolicyResult(result)

    if (!result.allowed) {
      showNotification({
        type: 'warning',
        title: 'Decision blocked',
        message: result.reason || 'Policy denied the decision.',
      })
      setIsSubmitting(false)
      return
    }

    const receipt = buildDecisionReceipt({
      decision: decisionState.decision,
      runId: decisionState.approval.runId,
      stepId: decisionState.approval.stepId,
      actor: APPROVER_EMAIL,
      riskScore: decisionState.approval.riskScore,
      policy: result,
      notes:
        notes ||
        `Decision ${decisionState.decision} for ${decisionState.approval.title} by ${APPROVER_EMAIL}.`,
    })

    setReceipts(prev => [receipt, ...prev])
    setApprovals(prev =>
      prev.filter(item => item.id !== decisionState.approval.id)
    )
    showNotification({
      type: 'success',
      title: 'Decision recorded',
      message: `Receipt ${receipt.id} created.`,
    })
    closeDecision()
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'High'
    if (score >= 50) return 'Medium'
    return 'Low'
  }

  const getRiskClasses = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 ring-red-600/20'
    if (score >= 50) return 'text-amber-700 bg-amber-50 ring-amber-600/20'
    return 'text-green-700 bg-green-50 ring-green-600/20'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals & Gates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Risk-scored approvals with policy simulation and immutable receipts.
          </p>
        </div>
      </div>

      <DataIntegrityNotice />

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending approvals
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {approvalsEmpty
              ? 'No approvals waiting in the queue.'
              : 'Review risk scores, simulate policy, and confirm with two-step approval.'}
          </p>
        </div>
        {approvalsEmpty ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Connect Maestro runtime to stream live approval gates.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {approvals.map(approval => (
              <div key={approval.id} className="px-6 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900">
                        {approval.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getRiskClasses(
                          approval.riskScore
                        )}`}
                      >
                        {getRiskLabel(approval.riskScore)} risk •{' '}
                        {approval.riskScore}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {approval.contextSummary}
                    </p>
                    <div className="text-xs text-gray-500">
                      Run {approval.runId} • Step {approval.stepId} •{' '}
                      {new Date(approval.requestedAt).toLocaleString()} •{' '}
                      {approval.requestedBy}
                    </div>
                    {approval.requiresRedaction && (
                      <div className="text-xs font-medium text-amber-700">
                        Redaction required before release.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openDecision(approval, 'approved')}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openDecision(approval, 'denied')}
                      className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Receipts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Receipts capture policy evidence, redacted notes, and approval trails.
          </p>
        </div>
        {receipts.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Receipts will appear after decisions are recorded.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {receipts.map(receipt => (
              <div key={receipt.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {receipt.decision.toUpperCase()} • Run {receipt.runId}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(receipt.createdAt).toLocaleString()} •{' '}
                      {receipt.actor}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Redacted notes: {receipt.redactedNotes}
                    </p>
                  </div>
                  <a
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    href={receipt.receiptUrl}
                  >
                    View receipt
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(decisionState)} onOpenChange={open => !open && closeDecision()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionState?.decision === 'approved'
                ? 'Approve request'
                : 'Deny request'}
            </DialogTitle>
            <DialogDescription>
              Run {decisionState?.approval.runId} • Step{' '}
              {decisionState?.approval.stepId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-medium text-gray-900">Policy simulation</div>
              {isChecking ? (
                <div className="mt-1 text-gray-500">
                  Simulating policy outcome...
                </div>
              ) : policyResult ? (
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      policyResult.allowed
                        ? 'text-emerald-700 bg-emerald-50 ring-emerald-600/20'
                        : 'text-red-700 bg-red-50 ring-red-600/20'
                    }`}
                  >
                    {policyResult.allowed ? 'Allowed' : 'Denied'}
                  </span>
                  {policyResult.reason && (
                    <p className="mt-2 text-xs text-gray-600">
                      {policyResult.reason}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-gray-500">
                  Policy simulation pending.
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Decision notes
              </label>
              <textarea
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="Add justification, escalation, or redaction summary."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Type {confirmationPhrase} to confirm
              </label>
              <input
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={confirmText}
                onChange={event => setConfirmText(event.target.value)}
                placeholder={confirmationPhrase}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <button
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={closeDecision}
            >
              Cancel
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                decisionState?.decision === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={
                isSubmitting ||
                isChecking ||
                !policyResult?.allowed ||
                !isConfirmValid
              }
              onClick={submitDecision}
            >
              {isSubmitting ? 'Recording...' : 'Confirm decision'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
