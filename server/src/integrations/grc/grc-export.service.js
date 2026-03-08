"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grcExportService = exports.GRCExportService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const pg_js_1 = require("../../db/pg.js");
class GRCExportService {
    /**
     * Export control mappings for compliance frameworks
     */
    async exportControlMappings(request) {
        const { tenantId, framework, mode, sinceDate } = request;
        // Build query based on mode
        let query = `
      SELECT
        cm.id as control_id,
        cm.framework,
        cm.framework_control_id,
        cm.name,
        cm.description,
        cm.category,
        cm.criticality,
        cm.implementation_status,
        cm.implemented_at,
        cm.implemented_by,
        cm.automation_level,
        cm.last_verified,
        cm.verified_by,
        cm.verification_status,
        cm.findings,
        cm.related_controls,
        cm.dependencies,
        cm.updated_at
      FROM compliance_control_mappings cm
      WHERE cm.tenant_id = $1
    `;
        const params = [tenantId];
        let paramIndex = 2;
        // Filter by framework
        if (framework) {
            query += ` AND cm.framework = $${paramIndex}`;
            params.push(framework);
            paramIndex++;
        }
        // Delta mode: only controls updated since date
        if (mode === 'delta' && sinceDate) {
            query += ` AND cm.updated_at >= $${paramIndex}`;
            params.push(sinceDate);
            paramIndex++;
        }
        query += ` ORDER BY cm.framework, cm.framework_control_id`;
        const result = await pg_js_1.pg.readMany(query, params);
        // Map to GRCControlMappingExport format
        const controlMappings = await Promise.all(result.rows.map((row) => this.mapToControlMapping(row, tenantId)));
        return {
            controlMappings,
            metadata: {
                exportId: (0, uuid_1.v4)(),
                tenantId,
                framework,
                mode,
                generatedAt: new Date().toISOString(),
                totalControls: controlMappings.length
            }
        };
    }
    /**
     * Generate evidence package for auditor review
     */
    async generateEvidencePackage(tenantId, packageType, periodStart, periodEnd, createdBy) {
        const packageId = (0, uuid_1.v4)();
        // Collect audit events
        const auditEventsResult = await pg_js_1.pg.readMany(`SELECT COUNT(*) as count
       FROM audit.events
       WHERE tenant_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
         AND compliance_relevant = true`, [tenantId, periodStart, periodEnd]);
        // Collect control mappings
        const controlMappingsResult = await pg_js_1.pg.readMany(`SELECT COUNT(*) as count
       FROM compliance_control_mappings
       WHERE tenant_id = $1`, [tenantId]);
        // Collect evidence artifacts
        const evidenceResult = await pg_js_1.pg.readMany(`SELECT
         ea.id,
         ea.type,
         ea.name,
         ea.storage_path,
         ea.hash,
         ea.size,
         ea.classification,
         ea.collected_at
       FROM compliance_evidence_artifacts ea
       WHERE ea.tenant_id = $1
         AND ea.collected_at >= $2
         AND ea.collected_at <= $3
       ORDER BY ea.collected_at DESC`, [tenantId, periodStart, periodEnd]);
        // Map artifacts
        const artifacts = evidenceResult.rows.map((row) => ({
            id: row.id,
            type: row.type,
            name: row.name,
            path: row.storage_path,
            hash: row.hash,
            size: row.size,
            classification: row.classification
        }));
        // Generate attestations (sign package)
        const attestations = await this.generateAttestations(packageId, tenantId, createdBy);
        // Calculate manifest
        const totalSize = artifacts.reduce((sum, a) => sum + a.size, 0);
        const manifestHash = this.calculateManifestHash(artifacts, attestations);
        return {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            packageId,
            packageType,
            createdBy,
            tenantId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            contents: {
                auditEvents: parseInt(auditEventsResult.rows[0].count),
                controlMappings: parseInt(controlMappingsResult.rows[0].count),
                evidenceArtifacts: artifacts.length,
                attestations: attestations.length
            },
            artifacts,
            attestations,
            manifest: {
                format: 'zip',
                totalSize,
                hash: manifestHash,
                signaturePublicKey: process.env.EVIDENCE_SIGNATURE_PUBLIC_KEY
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            retentionPeriod: 2555 // 7 years (SOX compliance)
        };
    }
    /**
     * Export verification results
     */
    async exportVerificationResults(tenantId, controlId) {
        let query = `
      SELECT
        vr.id,
        vr.control_id,
        vr.verified_at,
        vr.verified_by,
        vr.status,
        vr.findings,
        vr.evidence_references,
        vr.notes
      FROM compliance_verification_results vr
      WHERE vr.tenant_id = $1
    `;
        const params = [tenantId];
        if (controlId) {
            query += ` AND vr.control_id = $2`;
            params.push(controlId);
        }
        query += ` ORDER BY vr.verified_at DESC`;
        const result = await pg_js_1.pg.readMany(query, params);
        return result.rows;
    }
    /**
     * Map database row to GRCControlMappingExport
     */
    async mapToControlMapping(row, tenantId) {
        // Fetch evidence for this control
        const evidenceResult = await pg_js_1.pg.readMany(`SELECT
         id,
         type,
         storage_path as location,
         hash,
         collected_at,
         retention_period
       FROM compliance_evidence_artifacts
       WHERE tenant_id = $1 AND control_id = $2
       ORDER BY collected_at DESC`, [tenantId, row.control_id]);
        const evidence = evidenceResult.rows.map((e) => ({
            id: e.id,
            type: e.type,
            location: e.location,
            hash: e.hash,
            collectedAt: e.collected_at.toISOString(),
            retentionPeriod: e.retention_period
        }));
        return {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            controlId: row.control_id,
            framework: row.framework,
            frameworkControlId: row.framework_control_id,
            control: {
                name: row.name,
                description: row.description,
                category: row.category,
                criticality: row.criticality
            },
            implementation: {
                status: row.implementation_status,
                implementedAt: row.implemented_at?.toISOString(),
                implementedBy: row.implemented_by,
                automationLevel: row.automation_level
            },
            evidence,
            verification: {
                lastVerified: row.last_verified?.toISOString(),
                verifiedBy: row.verified_by,
                status: row.verification_status || 'not_tested',
                findings: row.findings
            },
            relatedControls: row.related_controls || [],
            dependencies: row.dependencies || []
        };
    }
    /**
     * Generate attestations for evidence package
     */
    async generateAttestations(packageId, tenantId, createdBy) {
        const attestations = [];
        // Package seal (HMAC signature)
        const seal = crypto_1.default
            .createHmac('sha256', process.env.EVIDENCE_SIGNATURE_KEY || 'default-key')
            .update(`${packageId}:${tenantId}`)
            .digest('hex');
        attestations.push({
            type: 'package_seal',
            issuer: 'summit',
            issuedAt: new Date().toISOString(),
            algorithm: 'HMAC-SHA256',
            value: seal
        });
        // Creator signature
        attestations.push({
            type: 'creator_signature',
            issuer: createdBy,
            issuedAt: new Date().toISOString(),
            algorithm: 'SHA256',
            value: crypto_1.default.createHash('sha256').update(createdBy).digest('hex')
        });
        return attestations;
    }
    /**
     * Calculate manifest hash
     */
    calculateManifestHash(artifacts, attestations) {
        const manifestData = JSON.stringify({
            artifacts: artifacts.map(a => ({ id: a.id, hash: a.hash })),
            attestations: attestations.map(a => ({ type: a.type, value: a.value }))
        });
        return crypto_1.default.createHash('sha256').update(manifestData).digest('hex');
    }
}
exports.GRCExportService = GRCExportService;
exports.grcExportService = new GRCExportService();
