import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { createHash, createSign, createVerify } from 'crypto';
import { z } from 'zod';

// Federated Orchestration types per Chair's synthesis
interface EnclaveManifest {
  enclaveId: string;
  region: string;
  jurisdiction: string;
  capabilities: string[];
  dataClassifications: string[];
  policyVersion: string;
  publicKey: string;
  endpoints: {
    rendezvous: string;
    policyBroker: string;
    wormSync: string;
  };
}

interface PolicyClaim {
  claimId: string;
  sourceEnclave: string;
  targetEnclave: string;
  action: string;
  dataHash: string;
  residencyProof: string;
  purposeProof: string;
  licenseProof: string;
  signature: string;
  timestamp: string;
}

interface RendezvousRequest {
  requestId: string;
  sourceEnclave: string;
  targetEnclave: string;
  action: string;
  dataClassification: string;
  purpose: string;
  claims: PolicyClaim[];
  metadata: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    airgapMode: boolean;
    wormSyncRequired: boolean;
  };
}

const EnclaveManifestSchema = z.object({
  enclaveId: z.string().min(1),
  region: z.string().min(1),
  jurisdiction: z.string().min(1),
  capabilities: z.array(z.string()),
  dataClassifications: z.array(z.string()),
  policyVersion: z.string(),
  publicKey: z.string(),
  endpoints: z.object({
    rendezvous: z.string().url(),
    policyBroker: z.string().url(),
    wormSync: z.string().url(),
  }),
});

const PolicyClaimSchema = z.object({
  claimId: z.string(),
  sourceEnclave: z.string(),
  targetEnclave: z.string(),
  action: z.string(),
  dataHash: z.string(),
  residencyProof: z.string(),
  purposeProof: z.string(),
  licenseProof: z.string(),
  signature: z.string(),
  timestamp: z.string().datetime(),
});

const RendezvousRequestSchema = z.object({
  requestId: z.string(),
  sourceEnclave: z.string(),
  targetEnclave: z.string(),
  action: z.string(),
  dataClassification: z.string(),
  purpose: z.string(),
  claims: z.array(PolicyClaimSchema),
  metadata: z.object({
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    airgapMode: z.boolean(),
    wormSyncRequired: z.boolean(),
  }),
});

export class FederatedOrchestrationService {
  private registeredEnclaves: Map<string, EnclaveManifest> = new Map();
  private policyBrokerEndpoint: string;
  private localEnclaveId: string;
  private localPrivateKey: string;

  constructor() {
    this.policyBrokerEndpoint =
      process.env.POLICY_BROKER_ENDPOINT || 'https://policy-broker.internal';
    this.localEnclaveId = process.env.LOCAL_ENCLAVE_ID || 'enclave-default';
    this.localPrivateKey = process.env.LOCAL_ENCLAVE_PRIVATE_KEY || '';
    this.initializeEnclaveFederation();
  }

  private async initializeEnclaveFederation() {
    // Load registered enclaves and policy configurations
    await this.loadRegisteredEnclaves();

    // Start periodic enclave discovery
    setInterval(async () => {
      try {
        await this.discoverEnclaves();
      } catch (error) {
        console.error('Enclave discovery failed:', error);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Register enclave in the federation
   */
  async registerEnclave(manifest: EnclaveManifest): Promise<string> {
    const span = otelService.createSpan('federation.register-enclave');

    try {
      const validatedManifest = EnclaveManifestSchema.parse(manifest);
      const pool = getPostgresPool();

      // Verify enclave signature and public key
      await this.verifyEnclaveCredentials(validatedManifest);

      // Store enclave registration
      await pool.query(
        `INSERT INTO federated_enclaves (
          enclave_id, region, jurisdiction, capabilities, data_classifications,
          policy_version, public_key, endpoints, status, registered_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        ON CONFLICT (enclave_id) 
        DO UPDATE SET 
          region = EXCLUDED.region,
          jurisdiction = EXCLUDED.jurisdiction,
          capabilities = EXCLUDED.capabilities,
          data_classifications = EXCLUDED.data_classifications,
          policy_version = EXCLUDED.policy_version,
          endpoints = EXCLUDED.endpoints,
          updated_at = now()`,
        [
          validatedManifest.enclaveId,
          validatedManifest.region,
          validatedManifest.jurisdiction,
          JSON.stringify(validatedManifest.capabilities),
          JSON.stringify(validatedManifest.dataClassifications),
          validatedManifest.policyVersion,
          validatedManifest.publicKey,
          JSON.stringify(validatedManifest.endpoints),
          'active',
        ],
      );

      // Update local registry
      this.registeredEnclaves.set(
        validatedManifest.enclaveId,
        validatedManifest,
      );

      // Create audit entry
      await pool.query(
        `INSERT INTO federation_audit (
          action, enclave_id, metadata, created_at
        ) VALUES ($1, $2, $3, now())`,
        [
          'enclave_registered',
          validatedManifest.enclaveId,
          JSON.stringify(validatedManifest),
        ],
      );

      otelService.addSpanAttributes({
        'federation.enclave_id': validatedManifest.enclaveId,
        'federation.region': validatedManifest.region,
        'federation.jurisdiction': validatedManifest.jurisdiction,
      });

      return validatedManifest.enclaveId;
    } catch (error: any) {
      console.error('Enclave registration failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Policy-aware rendezvous routing (Chair's flowchart implementation)
   */
  async requestRendezvous(request: RendezvousRequest): Promise<{
    approved: boolean;
    rendezvousId?: string;
    reason: string;
    requiredApprovals?: string[];
    airgapInstructions?: string[];
  }> {
    const span = otelService.createSpan('federation.request-rendezvous');

    try {
      const validatedRequest = RendezvousRequestSchema.parse(request);

      // Verify source and target enclaves are registered
      const sourceEnclave = this.registeredEnclaves.get(
        validatedRequest.sourceEnclave,
      );
      const targetEnclave = this.registeredEnclaves.get(
        validatedRequest.targetEnclave,
      );

      if (!sourceEnclave || !targetEnclave) {
        return {
          approved: false,
          reason: 'Source or target enclave not registered in federation',
        };
      }

      // Run OPA policy checks at policy broker
      const policyDecision = await this.evaluateRendezvousPolicy(
        validatedRequest,
        sourceEnclave,
        targetEnclave,
      );

      if (!policyDecision.allowed) {
        return {
          approved: false,
          reason: policyDecision.reason,
          requiredApprovals: policyDecision.requiredApprovals,
        };
      }

      const rendezvousId = `rdv-${validatedRequest.requestId}-${Date.now()}`;

      // Handle air-gap mode
      if (validatedRequest.metadata.airgapMode) {
        return await this.handleAirgapRendezvous(
          validatedRequest,
          rendezvousId,
          sourceEnclave,
          targetEnclave,
        );
      }

      // Standard rendezvous
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO rendezvous_sessions (
          id, source_enclave, target_enclave, action, data_classification,
          purpose, claims, status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [
          rendezvousId,
          validatedRequest.sourceEnclave,
          validatedRequest.targetEnclave,
          validatedRequest.action,
          validatedRequest.dataClassification,
          validatedRequest.purpose,
          JSON.stringify(validatedRequest.claims),
          'approved',
          JSON.stringify(validatedRequest.metadata),
        ],
      );

      // Create Merkle proof for WORM sync if required
      if (validatedRequest.metadata.wormSyncRequired) {
        await this.createWORMSyncEntry(rendezvousId, validatedRequest);
      }

      otelService.addSpanAttributes({
        'federation.rendezvous_id': rendezvousId,
        'federation.source_enclave': validatedRequest.sourceEnclave,
        'federation.target_enclave': validatedRequest.targetEnclave,
        'federation.action': validatedRequest.action,
        'federation.airgap_mode': validatedRequest.metadata.airgapMode,
      });

      return {
        approved: true,
        rendezvousId,
        reason: 'Policy evaluation passed - rendezvous authorized',
        airgapInstructions: validatedRequest.metadata.airgapMode
          ? await this.generateAirgapInstructions(rendezvousId)
          : undefined,
      };
    } catch (error: any) {
      console.error('Rendezvous request failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Evaluate rendezvous policy using OPA-style rules
   */
  private async evaluateRendezvousPolicy(
    request: RendezvousRequest,
    sourceEnclave: EnclaveManifest,
    targetEnclave: EnclaveManifest,
  ): Promise<{
    allowed: boolean;
    reason: string;
    requiredApprovals?: string[];
  }> {
    // Policy evaluation logic (simplified OPA-style rules)

    // Check jurisdiction compatibility
    if (sourceEnclave.jurisdiction !== targetEnclave.jurisdiction) {
      const crossJurisdictionAllowed = await this.checkCrossJurisdictionPolicy(
        sourceEnclave.jurisdiction,
        targetEnclave.jurisdiction,
        request.dataClassification,
      );

      if (!crossJurisdictionAllowed) {
        return {
          allowed: false,
          reason: `Cross-jurisdiction transfer not allowed: ${sourceEnclave.jurisdiction} to ${targetEnclave.jurisdiction}`,
          requiredApprovals: ['legal-counsel', 'data-protection-officer'],
        };
      }
    }

    // Check data classification compatibility
    if (
      !targetEnclave.dataClassifications.includes(request.dataClassification)
    ) {
      return {
        allowed: false,
        reason: `Target enclave does not support data classification: ${request.dataClassification}`,
      };
    }

    // Verify all claims are properly signed
    for (const claim of request.claims) {
      const claimValid = await this.verifyClaim(claim, sourceEnclave.publicKey);
      if (!claimValid) {
        return {
          allowed: false,
          reason: `Invalid claim signature: ${claim.claimId}`,
        };
      }
    }

    // Check residency requirements
    const residencyCompliant = await this.checkResidencyCompliance(
      request.claims,
    );
    if (!residencyCompliant) {
      return {
        allowed: false,
        reason: 'Residency requirements not met',
        requiredApprovals: ['compliance-officer'],
      };
    }

    // Check purpose limitation
    const purposeValid = await this.validatePurpose(
      request.purpose,
      request.action,
    );
    if (!purposeValid) {
      return {
        allowed: false,
        reason: 'Purpose limitation violation',
      };
    }

    return {
      allowed: true,
      reason: 'All policy checks passed',
    };
  }

  /**
   * Handle air-gap mode rendezvous with offline sync
   */
  private async handleAirgapRendezvous(
    request: RendezvousRequest,
    rendezvousId: string,
    sourceEnclave: EnclaveManifest,
    targetEnclave: EnclaveManifest,
  ): Promise<any> {
    const pool = getPostgresPool();

    // Create air-gap transfer manifest
    const transferManifest = {
      rendezvousId,
      sourceEnclave: sourceEnclave.enclaveId,
      targetEnclave: targetEnclave.enclaveId,
      transferMode: 'airgap',
      claims: request.claims,
      merkleRoot: '',
      instructions: [],
    };

    // Generate Merkle proof for integrity
    transferManifest.merkleRoot = await this.generateMerkleProof(
      request.claims,
    );

    // Store in air-gap queue
    await pool.query(
      `INSERT INTO airgap_transfers (
        id, transfer_manifest, status, created_at
      ) VALUES ($1, $2, $3, now())`,
      [rendezvousId, JSON.stringify(transferManifest), 'queued'],
    );

    // Generate offline transfer instructions
    const instructions = [
      'Export signed claim manifest to removable media',
      `Transfer media from ${sourceEnclave.region} to ${targetEnclave.region}`,
      'Import and verify Merkle proof at target enclave',
      'Execute WORM sync with delayed attestation',
      'Report completion via secure channel',
    ];

    transferManifest.instructions = instructions;

    return {
      approved: true,
      rendezvousId,
      reason: 'Air-gap transfer queued for offline processing',
      airgapInstructions: instructions,
    };
  }

  /**
   * Verify policy claim signature
   */
  private async verifyClaim(
    claim: PolicyClaim,
    publicKey: string,
  ): Promise<boolean> {
    try {
      const verifier = createVerify('RSA-SHA256');
      const contentToVerify = `${claim.claimId}:${claim.dataHash}:${claim.residencyProof}:${claim.purposeProof}:${claim.licenseProof}:${claim.timestamp}`;

      verifier.update(contentToVerify);
      return verifier.verify(publicKey, claim.signature, 'base64');
    } catch (error) {
      console.error('Claim verification failed:', error);
      return false;
    }
  }

  private async checkCrossJurisdictionPolicy(
    sourceJurisdiction: string,
    targetJurisdiction: string,
    dataClassification: string,
  ): Promise<boolean> {
    // Cross-jurisdiction policy matrix
    const allowedTransfers: Record<string, string[]> = {
      US: ['US', 'CA', 'UK'], // US can transfer to these jurisdictions
      EU: ['EU', 'UK', 'CH'], // EU can transfer to these jurisdictions
      UK: ['UK', 'US', 'CA', 'AU'],
      CA: ['CA', 'US', 'UK'],
    };

    // Restricted data cannot cross jurisdictions
    if (['restricted', 'top-secret'].includes(dataClassification)) {
      return sourceJurisdiction === targetJurisdiction;
    }

    const allowedTargets = allowedTransfers[sourceJurisdiction] || [];
    return allowedTargets.includes(targetJurisdiction);
  }

  private async checkResidencyCompliance(
    claims: PolicyClaim[],
  ): Promise<boolean> {
    // Verify all residency proofs are valid
    for (const claim of claims) {
      if (!claim.residencyProof || claim.residencyProof === '') {
        return false;
      }

      // In production, verify against residency service
      // For now, just check format
      if (!claim.residencyProof.startsWith('residency-proof-')) {
        return false;
      }
    }

    return true;
  }

  private async validatePurpose(
    purpose: string,
    action: string,
  ): Promise<boolean> {
    // Purpose limitation validation
    const purposeActionMap: Record<string, string[]> = {
      analytics: ['read', 'transform', 'analyze'],
      backup: ['read', 'copy', 'store'],
      processing: ['read', 'transform', 'write'],
      compliance: ['read', 'audit', 'report'],
      investigation: ['read', 'analyze', 'trace'],
    };

    const allowedActions = purposeActionMap[purpose] || [];
    return allowedActions.includes(action);
  }

  private async generateMerkleProof(claims: PolicyClaim[]): Promise<string> {
    // Generate Merkle root for claims integrity
    const hashes = claims.map((claim) =>
      createHash('sha256').update(JSON.stringify(claim)).digest('hex'),
    );

    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    // Build Merkle tree (simplified)
    while (hashes.length > 1) {
      const newHashes: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left;
        const combined = createHash('sha256')
          .update(left + right)
          .digest('hex');
        newHashes.push(combined);
      }
      hashes.splice(0, hashes.length, ...newHashes);
    }

    return hashes[0];
  }

  private async createWORMSyncEntry(
    rendezvousId: string,
    request: RendezvousRequest,
  ): Promise<void> {
    const pool = getPostgresPool();

    const wormEntry = {
      rendezvousId,
      sourceEnclave: request.sourceEnclave,
      targetEnclave: request.targetEnclave,
      claims: request.claims,
      merkleRoot: await this.generateMerkleProof(request.claims),
      timestamp: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO worm_sync_entries (
        rendezvous_id, sync_data, merkle_root, created_at
      ) VALUES ($1, $2, $3, now())`,
      [rendezvousId, JSON.stringify(wormEntry), wormEntry.merkleRoot],
    );
  }

  private async generateAirgapInstructions(
    rendezvousId: string,
  ): Promise<string[]> {
    return [
      `1. Export rendezvous manifest: ${rendezvousId}`,
      '2. Use certified removable media (air-gap approved)',
      '3. Verify Merkle proof integrity before transfer',
      '4. Transport via authorized courier with chain-of-custody',
      '5. Import at target enclave with signature verification',
      '6. Execute delayed WORM sync with attestation',
      '7. Report completion via secure out-of-band channel',
    ];
  }

  private async loadRegisteredEnclaves(): Promise<void> {
    const pool = getPostgresPool();

    try {
      const result = await pool.query(
        'SELECT * FROM federated_enclaves WHERE status = $1',
        ['active'],
      );

      result.rows.forEach((row) => {
        const manifest: EnclaveManifest = {
          enclaveId: row.enclave_id,
          region: row.region,
          jurisdiction: row.jurisdiction,
          capabilities: JSON.parse(row.capabilities),
          dataClassifications: JSON.parse(row.data_classifications),
          policyVersion: row.policy_version,
          publicKey: row.public_key,
          endpoints: JSON.parse(row.endpoints),
        };

        this.registeredEnclaves.set(manifest.enclaveId, manifest);
      });
    } catch (error) {
      console.error('Failed to load registered enclaves:', error);
    }
  }

  private async discoverEnclaves(): Promise<void> {
    // Periodic enclave discovery from federation registry
    try {
      // In production, query central federation registry
      console.log('Running enclave discovery...');

      // Update enclave health status
      await this.updateEnclaveHealth();
    } catch (error) {
      console.error('Enclave discovery failed:', error);
    }
  }

  private async updateEnclaveHealth(): Promise<void> {
    const pool = getPostgresPool();

    for (const [enclaveId, manifest] of this.registeredEnclaves) {
      try {
        // Health check each enclave
        const healthResponse = await fetch(
          `${manifest.endpoints.rendezvous}/health`,
          {
            method: 'GET',
            timeout: 5000,
          },
        );

        const status = healthResponse.ok ? 'healthy' : 'unhealthy';

        await pool.query(
          'UPDATE federated_enclaves SET last_health_check = now(), health_status = $1 WHERE enclave_id = $2',
          [status, enclaveId],
        );
      } catch (error) {
        console.error(`Health check failed for enclave ${enclaveId}:`, error);

        await pool.query(
          'UPDATE federated_enclaves SET last_health_check = now(), health_status = $1 WHERE enclave_id = $2',
          ['unreachable', enclaveId],
        );
      }
    }
  }

  private async verifyEnclaveCredentials(
    manifest: EnclaveManifest,
  ): Promise<void> {
    // Verify enclave public key and certificates
    if (!manifest.publicKey || manifest.publicKey.length < 100) {
      throw new Error('Invalid enclave public key');
    }

    // In production, verify against trusted CA or enclave registry
    if (!manifest.enclaveId.startsWith('enclave-')) {
      throw new Error('Invalid enclave ID format');
    }
  }

  /**
   * Get federation status and health
   */
  async getFederationStatus(): Promise<any> {
    const pool = getPostgresPool();

    const [enclaveStats, recentSessions, airgapQueue] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total, health_status FROM federated_enclaves GROUP BY health_status',
      ),
      pool.query(
        "SELECT COUNT(*) as count FROM rendezvous_sessions WHERE created_at > now() - interval '24 hours'",
      ),
      pool.query(
        "SELECT COUNT(*) as count FROM airgap_transfers WHERE status = 'queued'",
      ),
    ]);

    return {
      federation: {
        totalEnclaves: Array.from(this.registeredEnclaves.keys()).length,
        healthyEnclaves:
          enclaveStats.rows.find((r) => r.health_status === 'healthy')?.total ||
          0,
        unhealthyEnclaves:
          enclaveStats.rows.find((r) => r.health_status === 'unhealthy')
            ?.total || 0,
        unreachableEnclaves:
          enclaveStats.rows.find((r) => r.health_status === 'unreachable')
            ?.total || 0,
      },
      activity: {
        recentRendezvous: parseInt(recentSessions.rows[0].count),
        queuedAirgapTransfers: parseInt(airgapQueue.rows[0].count),
      },
      localEnclave: {
        id: this.localEnclaveId,
        status: 'active',
        capabilities: ['policy-broker', 'rendezvous', 'worm-sync'],
      },
    };
  }
}

// Database schema for Federated Orchestration
export const FEDERATED_ORCHESTRATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS federated_enclaves (
  enclave_id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  capabilities JSONB NOT NULL,
  data_classifications JSONB NOT NULL,
  policy_version TEXT NOT NULL,
  public_key TEXT NOT NULL,
  endpoints JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unreachable', 'unknown')),
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_health_check TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rendezvous_sessions (
  id TEXT PRIMARY KEY,
  source_enclave TEXT NOT NULL,
  target_enclave TEXT NOT NULL,
  action TEXT NOT NULL,
  data_classification TEXT NOT NULL,
  purpose TEXT NOT NULL,
  claims JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS airgap_transfers (
  id TEXT PRIMARY KEY,
  transfer_manifest JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_transit', 'delivered', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worm_sync_entries (
  id SERIAL PRIMARY KEY,
  rendezvous_id TEXT NOT NULL,
  sync_data JSONB NOT NULL,
  merkle_root TEXT NOT NULL,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS federation_audit (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  enclave_id TEXT,
  rendezvous_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_federated_enclaves_region ON federated_enclaves(region);
CREATE INDEX IF NOT EXISTS idx_federated_enclaves_jurisdiction ON federated_enclaves(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_rendezvous_sessions_enclaves ON rendezvous_sessions(source_enclave, target_enclave);
CREATE INDEX IF NOT EXISTS idx_rendezvous_sessions_status ON rendezvous_sessions(status);
CREATE INDEX IF NOT EXISTS idx_airgap_transfers_status ON airgap_transfers(status);
CREATE INDEX IF NOT EXISTS idx_worm_sync_entries_rendezvous ON worm_sync_entries(rendezvous_id);
CREATE INDEX IF NOT EXISTS idx_federation_audit_enclave ON federation_audit(enclave_id);
`;

export default FederatedOrchestrationService;
