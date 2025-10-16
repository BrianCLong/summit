import type { RedactionRule } from './redaction';
import type { RectificationProof, DeletionProof } from './proofs';

export type DSAROperation = 'export' | 'rectify' | 'delete';

export interface IdentityProof {
  method: string;
  token: string;
  issuedAt?: string;
  evidenceUri?: string;
}

export interface DSARRequest {
  requestId: string;
  subjectId: string;
  tenantId: string;
  operation: DSAROperation;
  payload?: Record<string, unknown>;
  identityProof?: IdentityProof;
  replayKey?: string;
}

export interface IdentityVerification {
  verified: boolean;
  reason?: string;
  verifierId?: string;
  proofMethod?: string;
}

export interface IdentityVerifier {
  verify(request: DSARRequest): Promise<IdentityVerification>;
}

export interface ConnectorSnapshot<T = unknown> {
  data: T;
  subjectIds: string[];
}

export interface DSARConnector<
  TCollect = unknown,
  TSnapshot = ConnectorSnapshot,
> {
  readonly name: string;
  collect(subjectId: string, tenantId: string): Promise<TCollect>;
  snapshot(): Promise<TSnapshot>;
  rectify?(
    subjectId: string,
    tenantId: string,
    patch: Record<string, unknown>,
  ): Promise<void>;
  delete?(subjectId: string, tenantId: string): Promise<void>;
}

export interface KafkaEventLog {
  publish(topic: string, message: Record<string, unknown>): Promise<void>;
  history(): Record<string, unknown>[];
}

export interface ExportStorage {
  putObject(key: string, body: string): Promise<string>;
  getObject(key: string): Promise<string | undefined>;
}

export interface ExportConnectorRecord {
  name: string;
  itemCount: number;
  hash: string;
}

export interface ExportManifest {
  requestId: string;
  subjectId: string;
  tenantId: string;
  generatedAt: string;
  connectors: ExportConnectorRecord[];
  redactionsApplied: string[];
}

export interface SignedExportPack {
  manifest: ExportManifest;
  payload: string;
  signature: string;
  digest: string;
}

export interface ExportResult {
  location: string;
  pack: SignedExportPack;
}

export interface RectificationResult {
  proofs: RectificationProof[];
}

export interface DeletionResult {
  proofs: DeletionProof[];
}

export interface DSARResponseMeta {
  idempotentReplay: boolean;
  identityVerification: IdentityVerification;
}

export interface DSARExportResponse {
  type: 'export';
  result: ExportResult;
  meta: DSARResponseMeta;
}

export interface DSARRectificationResponse {
  type: 'rectify';
  result: RectificationResult;
  meta: DSARResponseMeta;
}

export interface DSARDeletionResponse {
  type: 'delete';
  result: DeletionResult;
  meta: DSARResponseMeta;
}

export type DSARResponse =
  | DSARExportResponse
  | DSARRectificationResponse
  | DSARDeletionResponse;

export interface DataSubjectFulfillmentOptions {
  connectors: DSARConnector[];
  storage: ExportStorage;
  kafka: KafkaEventLog;
  signer: {
    sign(payload: string, manifest: ExportManifest): SignedExportPack;
    verify(payload: string, signature: string): boolean;
  };
  identityVerifier: IdentityVerifier;
  redactionRules?: RedactionRule[];
}
