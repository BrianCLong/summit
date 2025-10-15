import { randomUUID } from 'node:crypto';
import canonicalize from 'canonicalize';
import { DateTime } from 'luxon';
import { base64UrlEncode, signEd25519 } from './crypto.js';
import { VerifiableConsentReceipt, IssueOptions, Proof } from './types.js';

export async function issueConsentReceipt(options: IssueOptions): Promise<VerifiableConsentReceipt> {
  const issuanceDate = DateTime.utc().toISO();
  const credentialId = options.credentialId ?? `urn:uuid:${randomUUID()}`;
  const expirationDate = options.expirationDate
    ? normalizeExpiration(options.expirationDate)
    : undefined;

  const credential: VerifiableConsentReceipt = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/consent/v1',
    ],
    id: credentialId,
    type: ['VerifiableCredential', 'ConsentReceiptCredential'],
    issuer: options.issuerDid,
    issuanceDate,
    expirationDate,
    credentialSubject: {
      ...options.subject,
      consent: options.claims,
    },
  };

  const serialized = canonicalize({ ...credential });
  if (!serialized) {
    throw new Error('Failed to canonicalize credential');
  }
  const signature = await signEd25519(Buffer.from(serialized), options.issuerPrivateKey);

  const proof: Proof = {
    type: 'Ed25519Signature2020',
    created: issuanceDate,
    verificationMethod: `${options.issuerDid}#keys-1`,
    proofPurpose: 'assertionMethod',
    proofValue: base64UrlEncode(signature),
    revocationListCredential: options.revocationListCredential,
  };

  credential.proof = proof;
  return credential;
}

function normalizeExpiration(value: IssueOptions['expirationDate']): string {
  if (!value) {
    throw new Error('Expiration value missing');
  }
  if (typeof value === 'string') {
    return DateTime.fromISO(value, { zone: 'utc' }).toISO();
  }
  if (value instanceof Date) {
    return DateTime.fromJSDate(value).toUTC().toISO();
  }
  return value.toUTC().toISO();
}
