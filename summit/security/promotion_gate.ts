export type ProposedChange = {
  id: string;
  selfModifying: boolean;
  description: string;
}

export type ApprovalSet = {
  humanApprovers: string[];
}

export type EvidenceBundle = {
  reportValid: boolean;
  metricsValid: boolean;
  stampValid: boolean;
}

export function hasHumanApproval(approvals: ApprovalSet): boolean {
  return approvals.humanApprovers.length > 0;
}

export function passesPolicy(evidence: EvidenceBundle): boolean {
  return evidence.reportValid && evidence.metricsValid && evidence.stampValid;
}

export function canPromote(change: ProposedChange, approvals: ApprovalSet, evidence: EvidenceBundle): boolean {
  return hasHumanApproval(approvals) && passesPolicy(evidence) && change.selfModifying === false
}
