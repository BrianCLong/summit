/**
 * @intelgraph/prov-ledger-sdk
 * TypeScript SDK for Provenance Ledger service
 */

import { z } from 'zod';

// Schemas
export const ClaimSchema = z.object({
  id: z.string(),
  content: z.record(z.any()),
  hash: z.string(),
  signature: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
});

export const CreateClaimSchema = z.object({
  content: z.record(z.any()),
  signature: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const ProvenanceChainSchema = z.object({
  id: z.string(),
  claim_id: z.string(),
  transforms: z.array(z.string()),
  sources: z.array(z.string()),
  lineage: z.record(z.any()),
  created_at: z.string().datetime(),
});

export const ManifestSchema = z.object({
  version: z.string(),
  claims: z.array(
    z.object({
      id: z.string(),
      hash: z.string(),
      transforms: z.array(z.string()),
    }),
  ),
  hash_chain: z.string(),
  signature: z.string().optional(),
  generated_at: z.string().datetime(),
});

export const HashVerificationSchema = z.object({
  valid: z.boolean(),
  expected_hash: z.string(),
  actual_hash: z.string(),
  verified_at: z.string().datetime(),
});

// Types
export type Claim = z.infer<typeof ClaimSchema>;
export type CreateClaim = z.infer<typeof CreateClaimSchema>;
export type ProvenanceChain = z.infer<typeof ProvenanceChainSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type HashVerification = z.infer<typeof HashVerificationSchema>;

// SDK Client
export class ProvLedgerClient {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string> = {},
  ) {}

  async createClaim(claim: CreateClaim): Promise<Claim> {
    const response = await fetch(`${this.baseUrl}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(claim),
    });

    if (!response.ok) {
      throw new Error(`Failed to create claim: ${response.status}`);
    }

    const data = await response.json();
    return ClaimSchema.parse(data);
  }

  async getClaim(id: string): Promise<Claim | null> {
    const response = await fetch(`${this.baseUrl}/claims/${id}`, {
      headers: this.headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get claim: ${response.status}`);
    }

    const data = await response.json();
    return ClaimSchema.parse(data);
  }

  async getProvenanceByClaim(claimId: string): Promise<ProvenanceChain[]> {
    const response = await fetch(
      `${this.baseUrl}/provenance?claimId=${encodeURIComponent(claimId)}`,
      {
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get provenance: ${response.status}`);
    }

    const data = await response.json();
    return z.array(ProvenanceChainSchema).parse(data);
  }

  async createProvenanceChain(
    claimId: string,
    transforms: string[],
    sources: string[],
    lineage: any,
  ): Promise<ProvenanceChain> {
    const response = await fetch(`${this.baseUrl}/provenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        claimId,
        transforms,
        sources,
        lineage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create provenance chain: ${response.status}`);
    }

    const data = await response.json();
    return ProvenanceChainSchema.parse(data);
  }

  async verifyHash(
    content: any,
    expectedHash: string,
  ): Promise<HashVerification> {
    const response = await fetch(`${this.baseUrl}/hash/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify({
        content,
        expectedHash,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to verify hash: ${response.status}`);
    }

    const data = await response.json();
    return HashVerificationSchema.parse(data);
  }

  async exportManifest(): Promise<Manifest> {
    const response = await fetch(`${this.baseUrl}/export/manifest`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to export manifest: ${response.status}`);
    }

    const data = await response.json();
    return ManifestSchema.parse(data);
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }
}

// Utility functions
export function createProvLedgerClient(
  baseUrl: string,
  authorityId?: string,
  reasonForAccess?: string,
): ProvLedgerClient {
  const headers: Record<string, string> = {};

  if (authorityId) {
    headers['X-Authority-ID'] = authorityId;
  }

  if (reasonForAccess) {
    headers['X-Reason-For-Access'] = reasonForAccess;
  }

  return new ProvLedgerClient(baseUrl, headers);
}

export function generateContentHash(content: any): string {
  // Simple hash generation - in production, use crypto module
  return Buffer.from(
    JSON.stringify(content, Object.keys(content).sort()),
  ).toString('base64');
}

// Higher-level convenience functions
export class ProvenanceTracker {
  constructor(private client: ProvLedgerClient) {}

  async trackDataIngestion(
    dataSource: string,
    dataset: any,
    metadata?: any,
  ): Promise<Claim> {
    return this.client.createClaim({
      content: {
        type: 'data_ingestion',
        source: dataSource,
        dataset,
      },
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async trackTransformation(
    sourceClaimId: string,
    transformType: string,
    transformConfig: any,
    resultData: any,
  ): Promise<{ claim: Claim; provenance: ProvenanceChain }> {
    // Create claim for transformed data
    const claim = await this.client.createClaim({
      content: {
        type: 'data_transformation',
        transform_type: transformType,
        config: transformConfig,
        result: resultData,
      },
      metadata: {
        source_claim_id: sourceClaimId,
        timestamp: new Date().toISOString(),
      },
    });

    // Create provenance chain
    const provenance = await this.client.createProvenanceChain(
      claim.id,
      [transformType],
      [sourceClaimId],
      {
        transform_config: transformConfig,
        input_hash: '', // Would calculate from source claim
        output_hash: claim.hash,
      },
    );

    return { claim, provenance };
  }

  async trackExport(
    sourceClaimIds: string[],
    exportFormat: string,
    exportData: any,
  ): Promise<{ claim: Claim; provenance: ProvenanceChain }> {
    const claim = await this.client.createClaim({
      content: {
        type: 'data_export',
        format: exportFormat,
        data: exportData,
      },
      metadata: {
        source_claims: sourceClaimIds,
        timestamp: new Date().toISOString(),
      },
    });

    const provenance = await this.client.createProvenanceChain(
      claim.id,
      ['export'],
      sourceClaimIds,
      {
        export_format: exportFormat,
        source_claims: sourceClaimIds,
      },
    );

    return { claim, provenance };
  }

  async getFullLineage(claimId: string): Promise<{
    claim: Claim;
    chains: ProvenanceChain[];
    sourcesClaims: Claim[];
  }> {
    const [claim, chains] = await Promise.all([
      this.client.getClaim(claimId),
      this.client.getProvenanceByClaim(claimId),
    ]);

    if (!claim) {
      throw new Error(`Claim not found: ${claimId}`);
    }

    // Get all source claims
    const sourceClaimIds = new Set<string>();
    chains.forEach((chain) => {
      chain.sources.forEach((source) => sourceClaimIds.add(source));
    });

    const sourcesClaims = await Promise.all(
      Array.from(sourceClaimIds).map((id) => this.client.getClaim(id)),
    );

    return {
      claim,
      chains,
      sourcesClaims: sourcesClaims.filter((c): c is Claim => c !== null),
    };
  }
}
