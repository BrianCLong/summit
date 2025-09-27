import type { DateTime } from 'luxon';

export interface ConsentPurpose {
  purposeId: string;
  description?: string;
}

export interface ConsentScope {
  resource: string;
  actions: string[];
}

export interface RetentionPolicy {
  policyUri: string;
  expiresAt: string; // ISO timestamp
}

export interface ConsentReceiptClaims {
  purpose: ConsentPurpose[];
  scope: ConsentScope[];
  retention: RetentionPolicy;
  tenant: string;
  lawfulBasis?: string;
  policyUri?: string;
}

export interface ConsentSubject {
  id: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export interface VerifiableConsentReceipt {
  '@context': string[];
  id: string;
  type: ['VerifiableCredential', 'ConsentReceiptCredential'];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: ConsentSubject & {
    consent: ConsentReceiptClaims;
  };
  proof?: Proof;
}

export interface Proof {
  type: 'Ed25519Signature2020';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod';
  proofValue: string; // base64url signature
  revocationListCredential?: string;
}

export interface IssueOptions {
  issuerDid: string;
  issuerPrivateKey: Uint8Array;
  subject: ConsentSubject;
  claims: ConsentReceiptClaims;
  credentialId?: string;
  expirationDate?: string | Date | DateTime;
  revocationListCredential?: string;
}

export interface VerifyOptions {
  resolver: DidResolver;
  revocationRegistry?: RevocationRegistry;
  atTime?: Date | DateTime | string;
}

export interface DidDocument {
  id: string;
  assertionMethod: string[];
  verificationMethod: Array<{
    id: string;
    type: 'Ed25519VerificationKey2020';
    controller: string;
    publicKeyMultibase: string;
  }>;
}

export interface DidResolver {
  resolve(did: string): Promise<DidDocument>;
}

export interface RevocationRegistry {
  isRevoked(credentialId: string): Promise<boolean>;
}

export interface MutableRevocationRegistry extends RevocationRegistry {
  revoke(credentialId: string): Promise<void>;
  list(): Promise<string[]>;
}
