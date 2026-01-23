import crypto from 'crypto';
import { canonicalStringify } from './receipt.js';
import {
  ReceiptSignature,
  buildReceiptSignature,
} from './receipt-signing.js';
import { evidenceProvenanceService } from './provenance-service.js';

export type ReceiptActor = {
  id: string;
  principal_type: 'user' | 'service_account' | 'system';
  email?: string;
  roles?: string[];
  ip_address?: string;
};

export type ReceiptResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

export type ReceiptPolicy = {
  decision_id: string;
  policy_set: string;
  evaluation_timestamp: string;
};

export type ReceiptResult = {
  status: 'success' | 'failure' | 'denied';
  details?: string;
  rationale_hash?: string;
};

export type ProvenanceReceiptV1 = {
  spec_version: '1.0.0';
  id: string;
  timestamp: string;
  correlation_id: string;
  tenant_id: string;
  actor: ReceiptActor;
  action: string;
  resource: ReceiptResource;
  policy: ReceiptPolicy;
  result: ReceiptResult;
  signature?: ReceiptSignature;
};

export type TransitionReceiptInput = {
  runId: string;
  tenantId: string;
  correlationId?: string;
  actor: ReceiptActor;
  action: string;
  resource: ReceiptResource;
  policySet?: string;
  policyDecisionId?: string;
  policyTimestamp?: string;
  result: ReceiptResult;
};

const defaultPolicySet = () =>
  process.env.MAESTRO_POLICY_SET || 'maestro.policy.guard.v1';

export const buildTransitionReceipt = (
  input: TransitionReceiptInput,
): ProvenanceReceiptV1 => {
  const timestamp = new Date().toISOString();
  const baseReceipt: ProvenanceReceiptV1 = {
    spec_version: '1.0.0',
    id: crypto.randomUUID(),
    timestamp,
    correlation_id: input.correlationId || input.runId,
    tenant_id: input.tenantId,
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    policy: {
      decision_id: input.policyDecisionId || crypto.randomUUID(),
      policy_set: input.policySet || defaultPolicySet(),
      evaluation_timestamp: input.policyTimestamp || timestamp,
    },
    result: input.result,
  };

  const signature = buildReceiptSignature(baseReceipt);

  return {
    ...baseReceipt,
    signature,
  };
};

export const emitTransitionReceipt = async (
  input: TransitionReceiptInput,
): Promise<{ receipt: ProvenanceReceiptV1; artifactId: string }> => {
  const receipt = buildTransitionReceipt(input);
  const artifactId = await evidenceProvenanceService.storeEvidence({
    runId: input.runId,
    artifactType: 'receipt',
    content: canonicalStringify(receipt),
    metadata: {
      contentType: 'application/json',
      action: input.action,
      resourceType: input.resource.type,
      resourceId: input.resource.id,
      correlationId: receipt.correlation_id,
    },
  });

  return { receipt, artifactId };
};
