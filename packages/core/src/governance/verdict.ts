export type GovernanceVerdictStatus = 'allow' | 'deny' | 'degrade';

export interface GovernanceReason {
  code: string;
  message: string;
  control?: string;
}

export interface GovernanceEvidence {
  request_id: string;
  actor?: string;
  route?: string;
  inputs_hash?: string;
}

export interface GovernanceVerdict {
  status: GovernanceVerdictStatus;
  reasons: GovernanceReason[];
  tenant_id: string;
  policy_version: string;
  timestamp: string; // ISO
  evidence: GovernanceEvidence;
}
