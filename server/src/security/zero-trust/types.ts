/**
 * Zero-Trust Architecture Enhancement Types
 *
 * Type definitions for hardware-rooted trust, confidential computing,
 * and advanced attestation mechanisms.
 *
 * @module security/zero-trust/types
 * @version 4.0.0-alpha
 */

// =============================================================================
// Hardware Security Module (HSM) Types
// =============================================================================

export interface HSMProvider {
  id: string;
  name: string;
  type: HSMProviderType;
  endpoint?: string;
  region?: string;
  partition?: string;
  status: 'active' | 'inactive' | 'degraded';
}

export type HSMProviderType =
  | 'aws_cloudhsm'
  | 'azure_managed_hsm'
  | 'gcp_cloud_hsm'
  | 'thales_luna'
  | 'yubihsm'
  | 'software_hsm';

export interface HSMKeySpec {
  keyType: 'RSA' | 'EC' | 'AES' | 'CHACHA20';
  keySize?: number; // 2048, 3072, 4096 for RSA; 256, 384 for AES
  curve?: 'P-256' | 'P-384' | 'P-521' | 'Ed25519';
  purpose: KeyPurpose[];
  extractable: boolean;
  persistent: boolean;
  labels?: Record<string, string>;
}

export type KeyPurpose =
  | 'encrypt'
  | 'decrypt'
  | 'sign'
  | 'verify'
  | 'wrap'
  | 'unwrap'
  | 'derive';

export interface HSMKeyHandle {
  id: string;
  providerId: string;
  label: string;
  spec: HSMKeySpec;
  createdAt: string;
  expiresAt?: string;
  version: number;
  status: 'active' | 'rotated' | 'destroyed';
  attestation?: KeyAttestation;
}

export interface KeyAttestation {
  timestamp: string;
  attestationType: AttestationType;
  providerCertChain: string[];
  keyProperties: {
    generatedInHSM: boolean;
    neverExported: boolean;
    fipsCompliant: boolean;
    tamperResistant: boolean;
  };
  signature: string;
}

export type AttestationType = 'hsm_native' | 'tpm' | 'sgx' | 'sev_snp' | 'arm_cca';

// =============================================================================
// Confidential Computing Types
// =============================================================================

export interface ConfidentialEnvironment {
  id: string;
  type: TEEType;
  provider: string;
  status: 'provisioning' | 'active' | 'terminated' | 'error';
  attestation?: TEEAttestation;
  config: TEEConfig;
}

export type TEEType =
  | 'intel_sgx'
  | 'intel_tdx'
  | 'amd_sev_snp'
  | 'arm_cca'
  | 'aws_nitro'
  | 'azure_sev_snp';

export interface TEEConfig {
  memorySize: number; // MB
  vcpus: number;
  allowedOperations: string[];
  trustedCodeHash: string;
  secretsInjection: 'enclave' | 'attestation_sealed' | 'none';
  networkPolicy: 'isolated' | 'restricted' | 'open';
}

export interface TEEAttestation {
  id: string;
  timestamp: string;
  teeType: TEEType;
  measurementChain: MeasurementChain;
  platformCertificates: string[];
  verdict: AttestationVerdict;
  signature: string;
}

export interface MeasurementChain {
  firmwareMeasurement: string;
  bootloaderMeasurement: string;
  kernelMeasurement: string;
  applicationMeasurement: string;
  runtimeMeasurement?: string;
  pcrValues?: Record<number, string>; // For TPM-based
}

export interface AttestationVerdict {
  valid: boolean;
  timestamp: string;
  validatedBy: string;
  securityLevel: 'high' | 'medium' | 'low' | 'unknown';
  warnings: string[];
  policyCompliance: PolicyComplianceResult[];
}

export interface PolicyComplianceResult {
  policyId: string;
  policyName: string;
  compliant: boolean;
  reason?: string;
}

// =============================================================================
// Immutable Audit Ledger Types
// =============================================================================

export interface AuditLedgerEntry {
  id: string;
  timestamp: string;
  sequence: number;
  entryType: AuditEntryType;
  payload: Record<string, unknown>;
  metadata: AuditMetadata;
  integrity: IntegrityProof;
}

export type AuditEntryType =
  | 'access'
  | 'modification'
  | 'deletion'
  | 'governance_decision'
  | 'key_operation'
  | 'attestation'
  | 'policy_change'
  | 'security_event';

export interface AuditMetadata {
  actorId: string;
  actorType: 'user' | 'service' | 'system';
  tenantId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  sourceIp?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface IntegrityProof {
  previousHash: string;
  entryHash: string;
  merkleRoot?: string;
  merkleProof?: string[];
  signature: string;
  signedBy: string;
  anchorInfo?: BlockchainAnchor;
}

export interface BlockchainAnchor {
  chainType: 'ethereum' | 'hyperledger' | 'rfc3161';
  chainId?: string;
  transactionId?: string;
  blockNumber?: number;
  timestamp?: string;
  anchorHash: string;
}

export interface MerkleTree {
  root: string;
  leaves: string[];
  height: number;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  entryCount: number;
}

// =============================================================================
// Zero-Trust Session Types
// =============================================================================

export interface ZeroTrustSession {
  id: string;
  identityId: string;
  identityType: 'user' | 'service' | 'workload';
  createdAt: string;
  expiresAt: string;
  lastVerifiedAt: string;
  trustScore: number; // 0-100
  riskFactors: RiskFactor[];
  devicePosture?: DevicePosture;
  networkContext: NetworkContext;
  authenticationFactors: AuthenticationFactor[];
  privileges: Privilege[];
  constraints: SessionConstraint[];
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigations: string[];
}

export interface DevicePosture {
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'server' | 'container' | 'vm';
  osType: string;
  osVersion: string;
  patchLevel: 'current' | 'behind' | 'critical';
  encryptionEnabled: boolean;
  antivirusActive: boolean;
  firewallEnabled: boolean;
  jailbroken: boolean;
  complianceScore: number;
  lastAssessed: string;
}

export interface NetworkContext {
  sourceIp: string;
  sourceLocation?: GeoLocation;
  networkType: 'corporate' | 'vpn' | 'public' | 'unknown';
  connectionSecurity: 'mtls' | 'tls' | 'none';
  proxyDetected: boolean;
  torDetected: boolean;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface AuthenticationFactor {
  type: 'password' | 'mfa' | 'biometric' | 'certificate' | 'fido2' | 'attestation';
  provider: string;
  strength: 'weak' | 'medium' | 'strong';
  verifiedAt: string;
  expiresAt?: string;
}

export interface Privilege {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
  expiresAt?: string;
  justInTime: boolean;
}

export interface SessionConstraint {
  type: 'time_limit' | 'resource_limit' | 'location' | 'device' | 'mfa_required';
  value: unknown;
  enforced: boolean;
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface HSMService {
  initialize(): Promise<void>;
  getProvider(providerId: string): Promise<HSMProvider | null>;
  generateKey(spec: HSMKeySpec): Promise<HSMKeyHandle>;
  getKey(keyId: string): Promise<HSMKeyHandle | null>;
  sign(keyId: string, data: Buffer, algorithm?: string): Promise<Buffer>;
  verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
  encrypt(keyId: string, plaintext: Buffer): Promise<Buffer>;
  decrypt(keyId: string, ciphertext: Buffer): Promise<Buffer>;
  wrapKey(wrappingKeyId: string, keyToWrap: HSMKeyHandle): Promise<Buffer>;
  unwrapKey(wrappingKeyId: string, wrappedKey: Buffer, spec: HSMKeySpec): Promise<HSMKeyHandle>;
  rotateKey(keyId: string): Promise<HSMKeyHandle>;
  destroyKey(keyId: string): Promise<void>;
  attestKey(keyId: string): Promise<KeyAttestation>;
}

export interface ConfidentialComputingService {
  provisionEnclave(config: TEEConfig): Promise<ConfidentialEnvironment>;
  getEnclave(enclaveId: string): Promise<ConfidentialEnvironment | null>;
  executeInEnclave<T>(enclaveId: string, operation: string, input: unknown): Promise<T>;
  attestEnclave(enclaveId: string): Promise<TEEAttestation>;
  verifyAttestation(attestation: TEEAttestation): Promise<AttestationVerdict>;
  terminateEnclave(enclaveId: string): Promise<void>;
  sealData(enclaveId: string, data: Buffer): Promise<Buffer>;
  unsealData(enclaveId: string, sealedData: Buffer): Promise<Buffer>;
}

export interface ImmutableAuditService {
  recordEvent(entry: Omit<AuditLedgerEntry, 'id' | 'sequence' | 'integrity'>): Promise<AuditLedgerEntry>;
  getEntry(entryId: string): Promise<AuditLedgerEntry | null>;
  queryEntries(query: AuditQuery): Promise<AuditLedgerEntry[]>;
  verifyEntry(entryId: string): Promise<IntegrityVerification>;
  verifyChain(startSequence: number, endSequence: number): Promise<ChainVerification>;
  getMerkleProof(entryId: string): Promise<MerkleProof>;
  anchorToBlockchain(merkleRoot: string): Promise<BlockchainAnchor>;
  exportAuditBundle(query: AuditQuery): Promise<AuditBundle>;
}

export interface AuditQuery {
  tenantId?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  entryTypes?: AuditEntryType[];
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface IntegrityVerification {
  entryId: string;
  valid: boolean;
  hashValid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  anchorValid?: boolean;
  verifiedAt: string;
}

export interface ChainVerification {
  startSequence: number;
  endSequence: number;
  entriesVerified: number;
  valid: boolean;
  brokenAt?: number;
  verifiedAt: string;
}

export interface MerkleProof {
  entryId: string;
  leafHash: string;
  proof: string[];
  root: string;
  treeHeight: number;
  valid: boolean;
}

export interface AuditBundle {
  id: string;
  createdAt: string;
  query: AuditQuery;
  entries: AuditLedgerEntry[];
  merkleRoot: string;
  signature: string;
  anchor?: BlockchainAnchor;
}

export interface ZeroTrustSessionService {
  createSession(identity: IdentityContext): Promise<ZeroTrustSession>;
  getSession(sessionId: string): Promise<ZeroTrustSession | null>;
  refreshSession(sessionId: string): Promise<ZeroTrustSession>;
  evaluateTrust(sessionId: string): Promise<TrustEvaluation>;
  grantPrivilege(sessionId: string, privilege: Privilege): Promise<ZeroTrustSession>;
  revokePrivilege(sessionId: string, resource: string): Promise<ZeroTrustSession>;
  terminateSession(sessionId: string, reason: string): Promise<void>;
  enforceConstraint(sessionId: string, constraint: SessionConstraint): Promise<void>;
}

export interface IdentityContext {
  identityId: string;
  identityType: 'user' | 'service' | 'workload';
  authenticationFactors: AuthenticationFactor[];
  devicePosture?: DevicePosture;
  networkContext: NetworkContext;
  requestedPrivileges?: Privilege[];
}

export interface TrustEvaluation {
  sessionId: string;
  timestamp: string;
  trustScore: number;
  riskFactors: RiskFactor[];
  recommendations: TrustRecommendation[];
  decision: 'allow' | 'step_up' | 'restrict' | 'deny';
}

export interface TrustRecommendation {
  type: 'require_mfa' | 'limit_access' | 'monitor' | 'terminate';
  priority: 'low' | 'medium' | 'high';
  reason: string;
}
