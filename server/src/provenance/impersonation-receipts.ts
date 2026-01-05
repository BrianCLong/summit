import crypto from 'crypto';
import { ProvenanceLedgerV2 } from './ledger.js';
import {
  getCodeDigest,
  hashCanonical,
  resolveSigningSecret,
  signReceiptPayload,
} from '../maestro/evidence/receipt.js';

export type ImpersonationReceiptAction = 'start' | 'stop';

export interface ImpersonationReceipt {
  receiptId: string;
  action: ImpersonationReceiptAction;
  sessionId: string;
  createdAt: string;
  codeDigest: string;
  actor: {
    id: string;
    role: string;
    tenantId: string;
  };
  target: {
    userId: string;
    tenantId: string;
  };
  inputHash: string;
  policy: {
    id: string;
    decisionId: string;
    outcome: 'ALLOW' | 'DENY';
  };
  provenanceEntryId: string;
  signer: {
    kid: string;
    alg: 'HS256' | 'HMAC-SHA256';
  };
  signature: string;
}

export async function recordImpersonationReceipt(params: {
  action: ImpersonationReceiptAction;
  sessionId: string;
  actor: { id: string; role: string; tenantId: string };
  target: { userId: string; tenantId: string };
  justification: string;
  policy: { id: string; decisionId: string; allow: boolean };
  metadata?: Record<string, unknown>;
}): Promise<ImpersonationReceipt> {
  const ledger = ProvenanceLedgerV2.getInstance();
  const createdAt = new Date().toISOString();

  const inputPayload = {
    action: params.action,
    sessionId: params.sessionId,
    actor: params.actor,
    target: params.target,
    justification: params.justification,
    policyId: params.policy.id,
    policyDecisionId: params.policy.decisionId,
    createdAt,
  };

  const entry = await ledger.appendEntry({
    tenantId: params.actor.tenantId,
    timestamp: new Date(createdAt),
    actionType: params.action === 'start' ? 'IMPERSONATION_START' : 'IMPERSONATION_STOP',
    resourceType: 'SupportImpersonationSession',
    resourceId: params.sessionId,
    actorId: params.actor.id,
    actorType: 'user',
    payload: {
      ...inputPayload,
    },
    metadata: {
      complianceReview: true,
      policyId: params.policy.id,
      policyDecisionId: params.policy.decisionId,
      ...params.metadata,
    },
  });

  const signerInfo = resolveSigningSecret();
  const inputHash = hashCanonical(inputPayload);

  const receiptId = crypto.randomUUID();
  const baseReceipt = {
    receiptId,
    action: params.action,
    sessionId: params.sessionId,
    createdAt,
    codeDigest: getCodeDigest(),
    actor: params.actor,
    target: params.target,
    inputHash,
    policy: {
      id: params.policy.id,
      decisionId: params.policy.decisionId,
      outcome: params.policy.allow ? 'ALLOW' : 'DENY',
    },
    provenanceEntryId: entry.id,
    signer: { kid: signerInfo.kid, alg: signerInfo.alg },
  };

  const signature = signReceiptPayload(baseReceipt, signerInfo.secret);

  return {
    ...baseReceipt,
    signature,
  };
}
