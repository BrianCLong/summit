// @ts-nocheck
// server/src/conductor/security/agent-attestation.ts
// Enforces per-agent signing/attestation for Maestro tasks and PR events

import logger from '../../config/logger.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import {
  createDefaultCryptoPipeline,
  type SignatureBundle,
  type VerificationResult,
} from '../../security/crypto/index.js';

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
  private pipelinePromise?: Promise<any>;

  private async getPipeline() {
    if (!this.pipelinePromise) {
      this.pipelinePromise = createDefaultCryptoPipeline({
        timestampingEndpointEnv: 'CRYPTO_TIMESTAMP_ENDPOINT',
        auditSubsystem: 'agent-attestation',
        trustAnchorsEnv: 'CRYPTO_TRUST_ANCHORS',
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
    if (!attestation.signedPayload.includes(attestation.taskId)) {
      throw new Error('Signed payload must bind taskId to signature');
    }
    if (attestation.resourceRef && !attestation.signedPayload.includes(attestation.resourceRef)) {
      throw new Error('Signed payload must include resource reference when provided');
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
    });
  }
}

export const agentAttestationVerifier = new AgentAttestationVerifier();
