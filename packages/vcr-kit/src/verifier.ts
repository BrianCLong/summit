import canonicalize from 'canonicalize';
import { DateTime } from 'luxon';
import { base64UrlDecode } from './crypto.js';
import { publicKeyFromMultibase, verifyEd25519Signature } from './dids.js';
import { VerifiableConsentReceipt, VerifyOptions, DidDocument } from './types.js';

export interface VerificationResult {
  verified: boolean;
  reason?: string;
}

export async function verifyConsentReceipt(
  credential: VerifiableConsentReceipt,
  options: VerifyOptions,
): Promise<VerificationResult> {
  if (!credential.proof) {
    return { verified: false, reason: 'Missing proof' };
  }
  const { proof } = credential;
  const unsigned = { ...credential };
  delete (unsigned as Partial<VerifiableConsentReceipt>).proof;

  const serialized = canonicalize(unsigned);
  if (!serialized) {
    return { verified: false, reason: 'Unable to canonicalize credential' };
  }

  let doc: DidDocument;
  try {
    doc = await options.resolver.resolve(credential.issuer);
  } catch (error: unknown) {
    return { verified: false, reason: (error as Error).message };
  }

  const verificationMethod = doc.verificationMethod.find(
    (vm) => vm.id === proof.verificationMethod,
  );
  if (!verificationMethod) {
    return { verified: false, reason: 'Verification method not found in DID document' };
  }

  const publicKey = publicKeyFromMultibase(verificationMethod.publicKeyMultibase);
  const signature = base64UrlDecode(proof.proofValue);
  const message = Buffer.from(serialized);

  const valid = await verifyEd25519Signature(publicKey, message, signature);
  if (!valid) {
    return { verified: false, reason: 'Signature verification failed' };
  }

  const now = resolveVerificationTime(options.atTime);

  const expiry = credential.expirationDate
    ? DateTime.fromISO(credential.expirationDate, { zone: 'utc' })
    : undefined;
  if (expiry && now > expiry) {
    return { verified: false, reason: 'Credential expired' };
  }

  if (options.revocationRegistry) {
    const revoked = await options.revocationRegistry.isRevoked(credential.id);
    if (revoked) {
      return { verified: false, reason: 'Credential revoked' };
    }
  }

  return { verified: true };
}

export function assertVerified(result: VerificationResult): void {
  if (!result.verified) {
    throw new Error(result.reason ?? 'Verification failed');
  }
}

function resolveVerificationTime(atTime: VerifyOptions['atTime']): DateTime {
  if (!atTime) {
    return DateTime.utc();
  }
  if (atTime instanceof Date) {
    return DateTime.fromJSDate(atTime).toUTC();
  }
  if (typeof atTime === 'string') {
    return DateTime.fromISO(atTime, { zone: 'utc' });
  }
  return atTime.toUTC();
}
