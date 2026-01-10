// server/src/conductor/security/agent-attestation.ts
// Enforces per-agent signing/attestation for Maestro tasks and PR events

import logger from '../../config/logger.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import {
  createDefaultCryptoPipeline,
  type CryptoPipeline,
  type SignatureBundle,
  type VerificationResult,
} from '../../security/crypto/index.js';

interface SignedAttestationPayload {
  tenantId: string;
  taskId: string;
  agentId: string;
  resourceType: 'task' | 'pull_request';
  resourceRef?: string;
  humanApprover: string;
  policyRefs: string[];
  issuedAt: string;
}

export interface AgentAttestationInput {
  tenantId: string;
  taskId: string;
  agentId: string;
  signedPayload: string;
  signature: SignatureBundle;
  resourceType: 'task' | 'pull_request';
  resourceRef?: string;
  humanApprover: string;
  policyRefs: string[];
  issuedAt: string;
}

class AgentAttestationVerifier {
  private pipelinePromise?: Promise<CryptoPipeline>;

  private async getPipeline(): Promise<CryptoPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = createDefaultCryptoPipeline({
        timestampingEndpointEnv: 'CRYPTO_TIMESTAMP_ENDPOINT',
        auditSubsystem: 'agent-attestation',
        trustAnchorsEnv: 'CRYPTO_TRUST_ANCHORS',
      }).then((pipeline) => {
        if (!pipeline) {
          throw new Error(
            'Cryptographic pipeline unavailable for attestation verification',
          );
        }
        return pipeline;
      });
    }
    return this.pipelinePromise;
  }

  private ensurePayloadIntegrity(attestation: AgentAttestationInput): void {
    if (!attestation.humanApprover) {
      throw new Error('GC-01 violation: humanApprover is required for attestation');
    }
    if (!attestation.policyRefs?.length) {
      throw new Error('Policy references required to satisfy DP-01 provenance traceability');
    }
    if (!attestation.issuedAt || Number.isNaN(Date.parse(attestation.issuedAt))) {
      throw new Error('Attestation issuedAt must be an ISO-8601 timestamp');
    }

    const parsedPayload = parseSignedPayload(attestation.signedPayload);
    if (parsedPayload) {
      ensurePayloadMatchesAttestation(attestation, parsedPayload);
      return;
    }

    if (!attestation.signedPayload.includes(attestation.taskId)) {
      throw new Error('Signed payload must bind taskId to signature');
    }
    if (
      attestation.resourceRef &&
      !attestation.signedPayload.includes(attestation.resourceRef)
    ) {
      throw new Error(
        'Signed payload must include resource reference when provided',
      );
    }
  }

  private async verifySignature(
    attestation: AgentAttestationInput,
  ): Promise<VerificationResult> {
    const pipeline = await this.getPipeline();
    const verification = await pipeline.verifySignature(
      attestation.signedPayload,
      attestation.signature,
      { expectedKeyId: attestation.signature.keyId },
    );

    if (!verification.valid) {
      throw new Error(`Attestation signature invalid: ${verification.errors?.join('; ')}`);
    }

    return verification;
  }

  async verifyAndRecord(attestation: AgentAttestationInput): Promise<void> {
    this.ensurePayloadIntegrity(attestation);
    const verification = await this.verifySignature(attestation);

    await provenanceLedger.appendEntry({
      tenantId: attestation.tenantId,
      actionType: `${attestation.resourceType}_attestation`,
      resourceType: attestation.resourceType,
      resourceId: attestation.resourceRef || attestation.taskId,
      actorId: attestation.agentId,
      actorType: 'system',
      payload: {
        attestation,
        verification,
        invariants: ['GC-01', 'DP-01'],
        issuedAt: attestation.issuedAt,
      },
      metadata: {
        requestId: attestation.taskId,
        purpose: 'agent-attestation',
      },
      signature: attestation.signature.signature,
    });

    logger.info('Agent attestation recorded to provenance ledger', {
      resourceType: attestation.resourceType,
      resourceRef: attestation.resourceRef || attestation.taskId,
      tenantId: attestation.tenantId,
      agentId: attestation.agentId,
      verification: verification.valid ? 'valid' : 'invalid',
    });
  }
}

export const agentAttestationVerifier = new AgentAttestationVerifier();

function parseSignedPayload(
  signedPayload: string,
): SignedAttestationPayload | null {
  try {
    const parsed = JSON.parse(signedPayload) as SignedAttestationPayload;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.taskId === 'string' &&
      typeof parsed.tenantId === 'string' &&
      typeof parsed.agentId === 'string' &&
      typeof parsed.humanApprover === 'string' &&
      Array.isArray(parsed.policyRefs) &&
      typeof parsed.issuedAt === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function ensurePayloadMatchesAttestation(
  attestation: AgentAttestationInput,
  payload: SignedAttestationPayload,
): void {
  if (payload.taskId !== attestation.taskId) {
    throw new Error('Signed payload taskId does not match attestation taskId');
  }
  if (payload.tenantId !== attestation.tenantId) {
    throw new Error('Signed payload tenantId does not match attestation tenantId');
  }
  if (payload.agentId !== attestation.agentId) {
    throw new Error('Signed payload agentId does not match attestation agentId');
  }
  if (payload.resourceType !== attestation.resourceType) {
    throw new Error('Signed payload resourceType does not match attestation');
  }
  if (attestation.resourceRef && payload.resourceRef !== attestation.resourceRef) {
    throw new Error('Signed payload resourceRef does not match attestation');
  }
  if (payload.humanApprover !== attestation.humanApprover) {
    throw new Error(
      'Signed payload humanApprover does not match attestation',
    );
  }
  const payloadPolicies = new Set(payload.policyRefs);
  const missingPolicies = attestation.policyRefs.filter(
    (policy) => !payloadPolicies.has(policy),
  );
  if (missingPolicies.length) {
    throw new Error(
      `Signed payload missing required policyRefs: ${missingPolicies.join(', ')}`,
    );
  }
}
