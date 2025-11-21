/**
 * Decentralized Identity Package
 *
 * Provides DID (Decentralized Identifier) management, verifiable credentials,
 * and zero-knowledge proof support for the data ecosystem.
 */

export { DIDManager } from './did-manager.js';
export { CredentialIssuer } from './credential-issuer.js';
export { CredentialVerifier } from './credential-verifier.js';
export { ZKProofService } from './zk-proof-service.js';

export type {
  DIDDocument,
  VerifiableCredential,
  VerifiablePresentation,
  ProofRequest,
  ZKProof,
} from './types.js';
