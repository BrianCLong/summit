import { randomUUID } from 'node:crypto';

export type NhiKind =
  | 'service-account'
  | 'api-key'
  | 'oauth-app'
  | 'workload-identity'
  | 'bot-user'
  | 'agent-identity'
  | 'cicd-identity';

export type CredentialKind =
  | 'token'
  | 'secret'
  | 'certificate'
  | 'private-key'
  | 'kms-key-ref'
  | 'ssh-key'
  | 'signing-key'
  | 'session'
  | 'refresh-token';

export type CryptoAssetKind =
  | 'certificate'
  | 'private-key'
  | 'kms-key'
  | 'hsm-key'
  | 'encryption-config'
  | 'tls-endpoint'
  | 'signing-pipeline';

export type AlgorithmFamily =
  | 'rsa-2048'
  | 'rsa-3072'
  | 'ecdsa-p256'
  | 'sha1'
  | 'sha256'
  | 'aes-128'
  | 'aes-256'
  | 'ml-kem'
  | 'ml-dsa'
  | 'unknown';

export interface Provenance {
  discoveredBy: string;
  firstSeen: string;
  lastSeen: string;
  evidence: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PermissionBinding {
  role: string;
  resource: string;
  conditions?: Record<string, string>;
}

export interface CredentialBinding {
  issuedBy?: string;
  expiresAt?: string;
  lastRotated?: string;
}

export interface Nhi {
  id: string;
  name: string;
  kind: NhiKind;
  description?: string;
  permissions: PermissionBinding[];
  credentials: string[];
  provenance: Provenance;
}

export interface Credential {
  id: string;
  name: string;
  kind: CredentialKind;
  boundTo: string;
  secretSource?: string;
  issuedAt?: string;
  expiresAt?: string;
  rotationIntervalDays?: number;
  owner?: string;
  provenance: Provenance;
}

export interface CryptoAsset {
  id: string;
  name: string;
  kind: CryptoAssetKind;
  algorithm: AlgorithmFamily;
  expiresAt?: string;
  boundary?: string;
  pqcPlan?: string;
  provenance: Provenance;
}

export interface InventoryGraph {
  nhis: Nhi[];
  credentials: Credential[];
  cryptoAssets: CryptoAsset[];
}

export interface PolicyViolation {
  id: string;
  severity: 'low' | 'medium' | 'high';
  rule: string;
  subjectId: string;
  message: string;
  remediation: string;
}

export interface PolicyReport {
  generatedAt: string;
  violations: PolicyViolation[];
  summary: Record<string, number>;
}

export const createProvenance = (
  discoveredBy: string,
  evidence: string[],
  confidence: Provenance['confidence'] = 'medium',
): Provenance => {
  const now = new Date().toISOString();
  return {
    discoveredBy,
    evidence,
    confidence,
    firstSeen: now,
    lastSeen: now,
  };
};

export const exampleGraph = (): InventoryGraph => {
  const agentId = randomUUID();
  const tokenId = randomUUID();
  const certId = randomUUID();

  return {
    nhis: [
      {
        id: agentId,
        name: 'analysis-agent',
        kind: 'agent-identity',
        description: 'Scoped agent identity for investigative automation',
        permissions: [
          { role: 'reader', resource: 'graph:investigations' },
          { role: 'writer', resource: 'graph:findings' },
        ],
        credentials: [tokenId],
        provenance: createProvenance('example', ['seed graph']),
      },
    ],
    credentials: [
      {
        id: tokenId,
        name: 'analysis-session-token',
        kind: 'session',
        boundTo: agentId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        rotationIntervalDays: 1,
        provenance: createProvenance('example', ['seed graph']),
      },
    ],
    cryptoAssets: [
      {
        id: certId,
        name: 'api-gateway-cert',
        kind: 'certificate',
        algorithm: 'rsa-3072',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        boundary: 'public-ingress',
        pqcPlan: 'reviewed-ml-kem-migration',
        provenance: createProvenance('example', ['seed graph']),
      },
    ],
  };
};
