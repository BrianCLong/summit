"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEDERATED_ORCHESTRATION_SCHEMA = exports.FederatedOrchestrationService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const EnclaveManifestSchema = zod_1.z.object({
    enclaveId: zod_1.z.string().min(1),
    region: zod_1.z.string().min(1),
    jurisdiction: zod_1.z.string().min(1),
    capabilities: zod_1.z.array(zod_1.z.string()),
    dataClassifications: zod_1.z.array(zod_1.z.string()),
    policyVersion: zod_1.z.string(),
    publicKey: zod_1.z.string(),
    endpoints: zod_1.z.object({
        rendezvous: zod_1.z.string().url(),
        policyBroker: zod_1.z.string().url(),
        wormSync: zod_1.z.string().url(),
    }),
});
const PolicyClaimSchema = zod_1.z.object({
    claimId: zod_1.z.string(),
    sourceEnclave: zod_1.z.string(),
    targetEnclave: zod_1.z.string(),
    action: zod_1.z.string(),
    dataHash: zod_1.z.string(),
    residencyProof: zod_1.z.string(),
    purposeProof: zod_1.z.string(),
    licenseProof: zod_1.z.string(),
    signature: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
});
const RendezvousRequestSchema = zod_1.z.object({
    requestId: zod_1.z.string(),
    sourceEnclave: zod_1.z.string(),
    targetEnclave: zod_1.z.string(),
    action: zod_1.z.string(),
    dataClassification: zod_1.z.string(),
    purpose: zod_1.z.string(),
    claims: zod_1.z.array(PolicyClaimSchema),
    metadata: zod_1.z.object({
        urgency: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
        airgapMode: zod_1.z.boolean(),
        wormSyncRequired: zod_1.z.boolean(),
    }),
});
class FederatedOrchestrationService {
    registeredEnclaves = new Map();
    policyBrokerEndpoint;
    localEnclaveId;
    localPrivateKey;
    constructor() {
        this.policyBrokerEndpoint =
            process.env.POLICY_BROKER_ENDPOINT || 'https://policy-broker.internal';
        this.localEnclaveId = process.env.LOCAL_ENCLAVE_ID || 'enclave-default';
        this.localPrivateKey = process.env.LOCAL_ENCLAVE_PRIVATE_KEY || '';
        this.initializeEnclaveFederation();
    }
    async initializeEnclaveFederation() {
        // Load registered enclaves and policy configurations
        await this.loadRegisteredEnclaves();
        // Start periodic enclave discovery
        setInterval(async () => {
            try {
                await this.discoverEnclaves();
            }
            catch (error) {
                console.error('Enclave discovery failed:', error);
            }
        }, 300000); // 5 minutes
    }
    /**
     * Register enclave in the federation
     */
    async registerEnclave(manifest) {
        const span = otel_tracing_js_1.otelService.createSpan('federation.register-enclave');
        try {
            const validatedManifest = EnclaveManifestSchema.parse(manifest);
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Verify enclave signature and public key
            await this.verifyEnclaveCredentials(validatedManifest);
            // Store enclave registration
            await pool.query(`INSERT INTO federated_enclaves (
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
          updated_at = now()`, [
                validatedManifest.enclaveId,
                validatedManifest.region,
                validatedManifest.jurisdiction,
                JSON.stringify(validatedManifest.capabilities),
                JSON.stringify(validatedManifest.dataClassifications),
                validatedManifest.policyVersion,
                validatedManifest.publicKey,
                JSON.stringify(validatedManifest.endpoints),
                'active',
            ]);
            // Update local registry
            this.registeredEnclaves.set(validatedManifest.enclaveId, validatedManifest);
            // Create audit entry
            await pool.query(`INSERT INTO federation_audit (
          action, enclave_id, metadata, created_at
        ) VALUES ($1, $2, $3, now())`, [
                'enclave_registered',
                validatedManifest.enclaveId,
                JSON.stringify(validatedManifest),
            ]);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'federation.enclave_id': validatedManifest.enclaveId,
                'federation.region': validatedManifest.region,
                'federation.jurisdiction': validatedManifest.jurisdiction,
            });
            return validatedManifest.enclaveId;
        }
        catch (error) {
            console.error('Enclave registration failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Policy-aware rendezvous routing (Chair's flowchart implementation)
     */
    async requestRendezvous(request) {
        const span = otel_tracing_js_1.otelService.createSpan('federation.request-rendezvous');
        try {
            const validatedRequest = RendezvousRequestSchema.parse(request);
            // Verify source and target enclaves are registered
            const sourceEnclave = this.registeredEnclaves.get(validatedRequest.sourceEnclave);
            const targetEnclave = this.registeredEnclaves.get(validatedRequest.targetEnclave);
            if (!sourceEnclave || !targetEnclave) {
                return {
                    approved: false,
                    reason: 'Source or target enclave not registered in federation',
                };
            }
            // Run OPA policy checks at policy broker
            const policyDecision = await this.evaluateRendezvousPolicy(validatedRequest, sourceEnclave, targetEnclave);
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
                return await this.handleAirgapRendezvous(validatedRequest, rendezvousId, sourceEnclave, targetEnclave);
            }
            // Standard rendezvous
            const pool = (0, postgres_js_1.getPostgresPool)();
            await pool.query(`INSERT INTO rendezvous_sessions (
          id, source_enclave, target_enclave, action, data_classification,
          purpose, claims, status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`, [
                rendezvousId,
                validatedRequest.sourceEnclave,
                validatedRequest.targetEnclave,
                validatedRequest.action,
                validatedRequest.dataClassification,
                validatedRequest.purpose,
                JSON.stringify(validatedRequest.claims),
                'approved',
                JSON.stringify(validatedRequest.metadata),
            ]);
            // Create Merkle proof for WORM sync if required
            if (validatedRequest.metadata.wormSyncRequired) {
                await this.createWORMSyncEntry(rendezvousId, validatedRequest);
            }
            otel_tracing_js_1.otelService.addSpanAttributes({
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
        }
        catch (error) {
            console.error('Rendezvous request failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    /**
     * Evaluate rendezvous policy using OPA-style rules
     */
    async evaluateRendezvousPolicy(request, sourceEnclave, targetEnclave) {
        // Policy evaluation logic (simplified OPA-style rules)
        // Check jurisdiction compatibility
        if (sourceEnclave.jurisdiction !== targetEnclave.jurisdiction) {
            const crossJurisdictionAllowed = await this.checkCrossJurisdictionPolicy(sourceEnclave.jurisdiction, targetEnclave.jurisdiction, request.dataClassification);
            if (!crossJurisdictionAllowed) {
                return {
                    allowed: false,
                    reason: `Cross-jurisdiction transfer not allowed: ${sourceEnclave.jurisdiction} to ${targetEnclave.jurisdiction}`,
                    requiredApprovals: ['legal-counsel', 'data-protection-officer'],
                };
            }
        }
        // Check data classification compatibility
        if (!targetEnclave.dataClassifications.includes(request.dataClassification)) {
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
        const residencyCompliant = await this.checkResidencyCompliance(request.claims);
        if (!residencyCompliant) {
            return {
                allowed: false,
                reason: 'Residency requirements not met',
                requiredApprovals: ['compliance-officer'],
            };
        }
        // Check purpose limitation
        const purposeValid = await this.validatePurpose(request.purpose, request.action);
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
    async handleAirgapRendezvous(request, rendezvousId, sourceEnclave, targetEnclave) {
        const pool = (0, postgres_js_1.getPostgresPool)();
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
        transferManifest.merkleRoot = await this.generateMerkleProof(request.claims);
        // Store in air-gap queue
        await pool.query(`INSERT INTO airgap_transfers (
        id, transfer_manifest, status, created_at
      ) VALUES ($1, $2, $3, now())`, [rendezvousId, JSON.stringify(transferManifest), 'queued']);
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
    async verifyClaim(claim, publicKey) {
        try {
            const verifier = (0, crypto_1.createVerify)('RSA-SHA256');
            const contentToVerify = `${claim.claimId}:${claim.dataHash}:${claim.residencyProof}:${claim.purposeProof}:${claim.licenseProof}:${claim.timestamp}`;
            verifier.update(contentToVerify);
            return verifier.verify(publicKey, claim.signature, 'base64');
        }
        catch (error) {
            console.error('Claim verification failed:', error);
            return false;
        }
    }
    async checkCrossJurisdictionPolicy(sourceJurisdiction, targetJurisdiction, dataClassification) {
        // Cross-jurisdiction policy matrix
        const allowedTransfers = {
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
    async checkResidencyCompliance(claims) {
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
    async validatePurpose(purpose, action) {
        // Purpose limitation validation
        const purposeActionMap = {
            analytics: ['read', 'transform', 'analyze'],
            backup: ['read', 'copy', 'store'],
            processing: ['read', 'transform', 'write'],
            compliance: ['read', 'audit', 'report'],
            investigation: ['read', 'analyze', 'trace'],
        };
        const allowedActions = purposeActionMap[purpose] || [];
        return allowedActions.includes(action);
    }
    async generateMerkleProof(claims) {
        // Generate Merkle root for claims integrity
        const hashes = claims.map((claim) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(claim)).digest('hex'));
        if (hashes.length === 0)
            return '';
        if (hashes.length === 1)
            return hashes[0];
        // Build Merkle tree (simplified)
        while (hashes.length > 1) {
            const newHashes = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = hashes[i + 1] || left;
                const combined = (0, crypto_1.createHash)('sha256')
                    .update(left + right)
                    .digest('hex');
                newHashes.push(combined);
            }
            hashes.splice(0, hashes.length, ...newHashes);
        }
        return hashes[0];
    }
    async createWORMSyncEntry(rendezvousId, request) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const wormEntry = {
            rendezvousId,
            sourceEnclave: request.sourceEnclave,
            targetEnclave: request.targetEnclave,
            claims: request.claims,
            merkleRoot: await this.generateMerkleProof(request.claims),
            timestamp: new Date().toISOString(),
        };
        await pool.query(`INSERT INTO worm_sync_entries (
        rendezvous_id, sync_data, merkle_root, created_at
      ) VALUES ($1, $2, $3, now())`, [rendezvousId, JSON.stringify(wormEntry), wormEntry.merkleRoot]);
    }
    async generateAirgapInstructions(rendezvousId) {
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
    async loadRegisteredEnclaves() {
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            const result = await pool.query('SELECT * FROM federated_enclaves WHERE status = $1', ['active']);
            result.rows.forEach((row) => {
                const manifest = {
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
        }
        catch (error) {
            console.error('Failed to load registered enclaves:', error);
        }
    }
    async discoverEnclaves() {
        // Periodic enclave discovery from federation registry
        try {
            // In production, query central federation registry
            console.log('Running enclave discovery...');
            // Update enclave health status
            await this.updateEnclaveHealth();
        }
        catch (error) {
            console.error('Enclave discovery failed:', error);
        }
    }
    async updateEnclaveHealth() {
        const pool = (0, postgres_js_1.getPostgresPool)();
        for (const [enclaveId, manifest] of this.registeredEnclaves) {
            try {
                // Health check each enclave
                const healthResponse = await fetch(`${manifest.endpoints.rendezvous}/health`, {
                    method: 'GET',
                    timeout: 5000,
                });
                const status = healthResponse.ok ? 'healthy' : 'unhealthy';
                await pool.query('UPDATE federated_enclaves SET last_health_check = now(), health_status = $1 WHERE enclave_id = $2', [status, enclaveId]);
            }
            catch (error) {
                console.error(`Health check failed for enclave ${enclaveId}:`, error);
                await pool.query('UPDATE federated_enclaves SET last_health_check = now(), health_status = $1 WHERE enclave_id = $2', ['unreachable', enclaveId]);
            }
        }
    }
    async verifyEnclaveCredentials(manifest) {
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
    async getFederationStatus() {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const [enclaveStats, recentSessions, airgapQueue] = await Promise.all([
            pool.query('SELECT COUNT(*) as total, health_status FROM federated_enclaves GROUP BY health_status'),
            pool.query("SELECT COUNT(*) as count FROM rendezvous_sessions WHERE created_at > now() - interval '24 hours'"),
            pool.query("SELECT COUNT(*) as count FROM airgap_transfers WHERE status = 'queued'"),
        ]);
        return {
            federation: {
                totalEnclaves: Array.from(this.registeredEnclaves.keys()).length,
                healthyEnclaves: enclaveStats.rows.find((r) => r.health_status === 'healthy')?.total ||
                    0,
                unhealthyEnclaves: enclaveStats.rows.find((r) => r.health_status === 'unhealthy')
                    ?.total || 0,
                unreachableEnclaves: enclaveStats.rows.find((r) => r.health_status === 'unreachable')
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
exports.FederatedOrchestrationService = FederatedOrchestrationService;
// Database schema for Federated Orchestration
exports.FEDERATED_ORCHESTRATION_SCHEMA = `
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
exports.default = FederatedOrchestrationService;
