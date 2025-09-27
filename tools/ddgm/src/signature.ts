import crypto from 'crypto';
import { canonicalJsonString, sha256Base64 } from './canonical.js';
import type { GovernanceActionPlan, PlanSignature } from './types.js';

export interface SignPlanResult {
  signature: PlanSignature;
  signedPlan: GovernanceActionPlan;
}

export function signPlan(
  plan: GovernanceActionPlan,
  signingKeyPem: string,
  keyId: string,
  publicKeyPem?: string,
  signedAt?: string
): SignPlanResult {
  const planWithoutSignature: GovernanceActionPlan = { ...plan };
  delete planWithoutSignature.signature;

  const canonical = canonicalJsonString(planWithoutSignature);

  const privateKey = crypto.createPrivateKey(signingKeyPem);
  const publicKey = publicKeyPem
    ? crypto.createPublicKey(publicKeyPem)
    : crypto.createPublicKey(privateKey);

  const signatureBuffer = crypto.sign(null, Buffer.from(canonical), privateKey);
  const signature = signatureBuffer.toString('base64');

  const exportedPublicKey = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const signatureMetadata: PlanSignature = {
    algorithm: 'ed25519',
    keyId,
    publicKey: exportedPublicKey.toString('base64'),
    signedAt: signedAt ?? new Date().toISOString(),
    signature,
    canonicalHash: sha256Base64(canonical)
  };

  return {
    signature: signatureMetadata,
    signedPlan: { ...planWithoutSignature, signature: signatureMetadata }
  };
}

export function verifyPlanSignature(plan: GovernanceActionPlan, publicKeyPem: string): boolean {
  if (!plan.signature) {
    throw new Error('Plan does not contain a signature block.');
  }

  const { signature } = plan;
  const planWithoutSignature: GovernanceActionPlan = { ...plan };
  delete planWithoutSignature.signature;
  const canonical = canonicalJsonString(planWithoutSignature);

  const publicKey = crypto.createPublicKey(publicKeyPem);
  const verified = crypto.verify(null, Buffer.from(canonical), publicKey, Buffer.from(signature.signature, 'base64'));
  const canonicalHash = sha256Base64(canonical);

  if (signature.canonicalHash !== canonicalHash) {
    return false;
  }

  return verified;
}
