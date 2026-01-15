import crypto from 'crypto';
import { canonicalStringify } from './receipt.js';

export type ReceiptSignature = {
  key_id: string;
  algorithm: 'HS256';
  value: string;
};

export type ReceiptSigningConfig = {
  keyId: string;
  algorithm: 'HS256';
  secret: string;
  keyring: Record<string, string>;
};

const DEV_FALLBACK_SECRET = 'dev-secret';

const parseKeyring = (): Record<string, string> => {
  if (process.env.EVIDENCE_SIGNING_KEYS) {
    const parsed = JSON.parse(process.env.EVIDENCE_SIGNING_KEYS);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('EVIDENCE_SIGNING_KEYS must be a JSON object of { kid: secret }');
    }
    return Object.fromEntries(
      Object.entries(parsed).map(([kid, secret]) => [kid, String(secret)]),
    );
  }

  const secret =
    process.env.EVIDENCE_SIGNING_SECRET ||
    (process.env.NODE_ENV !== 'production' ? DEV_FALLBACK_SECRET : undefined);

  if (!secret) {
    return {};
  }

  return {
    [process.env.EVIDENCE_SIGNER_KID || 'dev']: secret,
  };
};

export const resolveReceiptSigningConfig = (): ReceiptSigningConfig => {
  const keyring = parseKeyring();
  const configuredKeyId =
    process.env.EVIDENCE_SIGNER_KID || Object.keys(keyring)[0];

  if (!configuredKeyId || !keyring[configuredKeyId]) {
    throw new Error(
      'Receipt signing requires EVIDENCE_SIGNING_KEYS or EVIDENCE_SIGNING_SECRET',
    );
  }

  return {
    keyId: configuredKeyId,
    algorithm: 'HS256',
    secret: keyring[configuredKeyId],
    keyring,
  };
};

export const signReceiptPayload = (payload: object, secret: string): string =>
  crypto
    .createHmac('sha256', secret)
    .update(canonicalStringify(payload))
    .digest('base64url');

export const buildReceiptSignature = (payload: object): ReceiptSignature => {
  const signer = resolveReceiptSigningConfig();
  return {
    key_id: signer.keyId,
    algorithm: signer.algorithm,
    value: signReceiptPayload(payload, signer.secret),
  };
};

export const verifyReceiptSignature = (
  payload: object,
  signature: ReceiptSignature,
  keyring?: Record<string, string>,
): boolean => {
  const keys = keyring || resolveReceiptSigningConfig().keyring;
  const candidateKeys = signature?.key_id
    ? { [signature.key_id]: keys[signature.key_id] }
    : keys;

  return Object.entries(candidateKeys).some(([_, secret]) => {
    if (!secret) {
      return false;
    }
    const expected = signReceiptPayload(payload, secret);
    return expected === signature.value;
  });
};
