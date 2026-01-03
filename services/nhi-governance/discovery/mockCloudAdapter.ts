import { randomUUID } from 'node:crypto';
import { createProvenance, Credential, CryptoAsset, InventoryGraph, Nhi } from '../models.js';

export interface CloudDiscoveryConfig {
  provider: 'aws' | 'gcp' | 'azure' | 'mock';
  projectId?: string;
  accountId?: string;
}

export const fetchMockCloudInventory = (config: CloudDiscoveryConfig): InventoryGraph => {
  const serviceAccountId = randomUUID();
  const kmsKeyId = randomUUID();
  const apiTokenId = randomUUID();

  const nhis: Nhi[] = [
    {
      id: serviceAccountId,
      name: `${config.provider}-ingestion-service`,
      kind: 'service-account',
      description: 'Ingests telemetry and orchestrates downstream AI agents',
      permissions: [
        { role: 'admin', resource: `${config.provider}:*` },
        { role: 'kms:encrypt', resource: `${config.provider}:kms:${config.projectId ?? 'demo'}` },
      ],
      credentials: [apiTokenId],
      provenance: createProvenance('mock-cloud-adapter', ['provider-discovery']),
    },
  ];

  const credentials: Credential[] = [
    {
      id: apiTokenId,
      name: `${config.provider}-ingestion-token`,
      kind: 'token',
      boundTo: serviceAccountId,
      issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
      rotationIntervalDays: 180,
      owner: 'platform-team',
      provenance: createProvenance('mock-cloud-adapter', ['provider-discovery']),
    },
  ];

  const cryptoAssets: CryptoAsset[] = [
    {
      id: kmsKeyId,
      name: `${config.provider}-default-kms`,
      kind: 'kms-key',
      algorithm: 'rsa-2048',
      boundary: 'storage',
      provenance: createProvenance('mock-cloud-adapter', ['provider-discovery']),
    },
  ];

  return { nhis, credentials, cryptoAssets };
};
