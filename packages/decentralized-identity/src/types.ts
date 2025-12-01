/**
 * Type definitions for decentralized identity
 */

export interface DIDDocument {
  '@context': string[];
  id: string;
  controller?: string;
  verificationMethod: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  service?: ServiceEndpoint[];
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: JsonWebKey;
  publicKeyMultibase?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | string[] | Record<string, unknown>;
}

export interface VerifiableCredential {
  '@context': string[];
  id?: string;
  type: string[];
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id?: string;
    [key: string]: unknown;
  };
  proof?: Proof;
}

export interface VerifiablePresentation {
  '@context': string[];
  id?: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: Proof;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
}

export interface ProofRequest {
  id: string;
  name: string;
  version: string;
  requestedAttributes: {
    [key: string]: {
      name: string;
      restrictions?: { issuer_did?: string }[];
    };
  };
  requestedPredicates?: {
    [key: string]: {
      name: string;
      p_type: '>=' | '<=' | '>' | '<';
      p_value: number;
    };
  };
}

export interface ZKProof {
  proofId: string;
  requestId: string;
  proof: string;
  revealedAttributes: Record<string, string>;
  timestamp: Date;
  verified?: boolean;
}

export interface JsonWebKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
  kid?: string;
  use?: string;
  alg?: string;
}
