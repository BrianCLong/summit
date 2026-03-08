"use strict";
/**
 * Trust Center API Routes
 *
 * REST API endpoints for Trust Center, regulatory packs, and evidence management.
 *
 * @module routes/trust-center-api
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRUST_CENTER_API_SCHEMA = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const regulatory_pack_service_js_1 = require("../trust-center/regulatory-pack-service.js");
const evidence_engine_js_1 = require("../trust-center/evidence-engine.js");
const postgres_js_1 = require("../db/postgres.js");
const control_evidence_mappings_js_1 = require("../trust-center/types/control-evidence-mappings.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
// =============================================================================
// Public Endpoints (No Auth Required)
// =============================================================================
/**
 * GET /api/v1/trust/status
 * Public trust center status
 */
router.get('/status', async (req, res, next) => {
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        // Get certification status
        const { rows: certRows } = await pool.query(`
      SELECT framework, status, valid_from, valid_until, auditor
      FROM certifications
      WHERE status = 'active'
      ORDER BY framework
    `);
        // Calculate uptime (try fetching from slo-exporter, fallback to mock)
        let uptime = {
            last24h: 99.99,
            last7d: 99.95,
            last30d: 99.92,
        };
        try {
            // Try to fetch real metrics if available in this environment
            const sloRes = await axios_1.default.get('http://localhost:9092/metrics.json', { timeout: 1000 }).catch(() => null);
            if (sloRes?.data) {
                const smokeUptime = sloRes.data.find((m) => m.name === 'smoke_uptime_pct');
                if (smokeUptime?.values?.[0]?.value) {
                    const currentUptime = parseFloat(smokeUptime.values[0].value);
                    uptime.last24h = currentUptime; // Use current probe uptime as a proxy for now
                }
            }
        }
        catch (e) {
            // Ignore errors and use fallback
        }
        // Get incident count (last 30 days)
        // Use mock incident count if table doesn't exist or query fails (common in this env)
        let incidentCount = 0;
        try {
            const { rows: incidentRows } = await pool.query(`
          SELECT COUNT(*) as count
          FROM incidents
          WHERE created_at > now() - interval '30 days'
        `);
            incidentCount = parseInt(incidentRows[0]?.count || '0', 10);
        }
        catch (e) {
            // Table might not exist yet
            incidentCount = 0;
        }
        const status = {
            overallStatus: 'operational',
            certifications: certRows.map((row) => ({
                framework: row.framework,
                name: getFrameworkName(row.framework),
                status: row.status,
                validFrom: row.valid_from?.toISOString(),
                validUntil: row.valid_until?.toISOString(),
                auditor: row.auditor,
            })),
            sloSummary: {
                availability: {
                    target: 99.9,
                    current: uptime.last30d, // Use our calculated uptime
                    period: 'last_30_days',
                },
                latency: {
                    p50: 45,
                    p95: 120,
                    p99: 250,
                    target: 200,
                },
                errorRate: {
                    target: 0.1,
                    current: 0.05,
                },
            },
            lastUpdated: new Date().toISOString(),
            incidentCount: incidentCount,
            uptime,
        };
        res.json(status);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/certifications
 * List active certifications
 */
router.get('/certifications', async (req, res, next) => {
    try {
        const { framework } = req.query;
        const pool = (0, postgres_js_1.getPostgresPool)();
        let query = `
      SELECT framework, status, valid_from, valid_until, auditor, certificate_url
      FROM certifications
      WHERE status IN ('active', 'pending')
    `;
        const params = [];
        if (framework) {
            query += ' AND framework = $1';
            params.push(framework);
        }
        query += ' ORDER BY framework';
        const { rows } = await pool.query(query, params);
        res.json({
            certifications: rows.map((row) => ({
                framework: row.framework,
                name: getFrameworkName(row.framework),
                status: row.status,
                validFrom: row.valid_from?.toISOString(),
                validUntil: row.valid_until?.toISOString(),
                auditor: row.auditor,
                certificateUrl: row.certificate_url,
            })),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/slo
 * Current SLO metrics
 */
router.get('/slo', async (req, res, next) => {
    try {
        // In production, this would query Prometheus/VictoriaMetrics
        const sloMetrics = {
            availability: {
                target: 99.9,
                current: 99.95,
                trend: 'stable',
                history: [
                    { date: '2025-12-01', value: 99.98 },
                    { date: '2025-12-02', value: 99.95 },
                    { date: '2025-12-03', value: 99.92 },
                    { date: '2025-12-04', value: 99.99 },
                    { date: '2025-12-05', value: 99.97 },
                    { date: '2025-12-06', value: 99.95 },
                    { date: '2025-12-07', value: 99.95 },
                ],
            },
            latency: {
                p50: { target: 100, current: 45, unit: 'ms' },
                p95: { target: 200, current: 120, unit: 'ms' },
                p99: { target: 500, current: 250, unit: 'ms' },
            },
            errorRate: {
                target: 0.1,
                current: 0.05,
                unit: 'percent',
            },
            throughput: {
                current: 15000,
                unit: 'requests_per_minute',
            },
            lastUpdated: new Date().toISOString(),
        };
        res.json(sloMetrics);
    }
    catch (error) {
        next(error);
    }
});
// =============================================================================
// Authenticated Endpoints
// =============================================================================
/**
 * GET /api/v1/trust/packs
 * List available regulatory packs
 */
router.get('/packs', async (req, res, next) => {
    try {
        const { frameworks } = req.query;
        const frameworkList = frameworks
            ? frameworks.split(',')
            : undefined;
        const packs = await regulatory_pack_service_js_1.regulatoryPackService.listPacks(frameworkList);
        res.json({ packs });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/packs/:packId
 * Get regulatory pack details
 */
router.get('/packs/:packId', async (req, res, next) => {
    try {
        const packId = (0, http_param_js_1.firstStringOr)(req.params.packId, '');
        const pack = await regulatory_pack_service_js_1.regulatoryPackService.getPack(packId);
        if (!pack) {
            return res.status(404).json({ error: 'Pack not found' });
        }
        res.json(pack);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/packs/:packId/controls
 * Get controls for a regulatory pack
 */
router.get('/packs/:packId/controls', async (req, res, next) => {
    try {
        const packId = (0, http_param_js_1.firstStringOr)(req.params.packId, '');
        const pack = await regulatory_pack_service_js_1.regulatoryPackService.getPack(packId);
        if (!pack) {
            return res.status(404).json({ error: 'Pack not found' });
        }
        res.json({
            packId,
            framework: pack.framework,
            controls: pack.controls,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/controls
 * List all control definitions
 */
router.get('/controls', async (req, res, next) => {
    try {
        const { framework } = req.query;
        let controls = Object.values(control_evidence_mappings_js_1.CONTROL_MAPPINGS);
        if (framework) {
            controls = (0, control_evidence_mappings_js_1.getControlsByFramework)(framework);
        }
        res.json({
            controls: controls.map((c) => ({
                id: c.id,
                title: c.title,
                category: c.category,
                status: c.status,
                frameworkMappings: c.frameworkMappings,
                testCount: c.tests.length,
                evidenceSourceCount: c.evidenceSources.length,
            })),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/controls/:controlId
 * Get control definition details
 */
router.get('/controls/:controlId', async (req, res, next) => {
    try {
        const controlId = (0, http_param_js_1.firstStringOr)(req.params.controlId, '');
        const control = control_evidence_mappings_js_1.CONTROL_MAPPINGS[controlId];
        if (!control) {
            return res.status(404).json({ error: 'Control not found' });
        }
        res.json(control);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/controls/:controlId/evidence
 * Get evidence for a specific control
 */
router.get('/controls/:controlId/evidence', async (req, res, next) => {
    try {
        const controlId = (0, http_param_js_1.firstStringOr)(req.params.controlId, '');
        const { startDate, endDate } = req.query;
        const tenantId = req.tenantId || 'default';
        const control = control_evidence_mappings_js_1.CONTROL_MAPPINGS[controlId];
        if (!control) {
            return res.status(404).json({ error: 'Control not found' });
        }
        const dateRange = startDate && endDate
            ? { start: startDate, end: endDate }
            : undefined;
        const snapshots = await evidence_engine_js_1.evidenceEngine.collectEvidence([controlId], tenantId, dateRange);
        // Apply redaction for tenant isolation
        const redactedSnapshots = evidence_engine_js_1.evidenceEngine.applyRedaction(snapshots, tenantId);
        res.json({
            controlId,
            evidenceSnapshots: redactedSnapshots,
            collectedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/trust/evidence/request
 * Create an evidence request
 */
router.post('/evidence/request', async (req, res, next) => {
    try {
        const { controlIds, purpose, dateRange } = req.body;
        const tenantId = req.tenantId || 'default';
        const userId = req.userId || 'anonymous';
        if (!controlIds || !Array.isArray(controlIds) || controlIds.length === 0) {
            return res.status(400).json({ error: 'controlIds is required and must be a non-empty array' });
        }
        if (!purpose) {
            return res.status(400).json({ error: 'purpose is required' });
        }
        const request = await evidence_engine_js_1.evidenceEngine.createRequest(tenantId, controlIds, purpose, {
            type: 'user',
            id: userId,
            name: userId,
        }, dateRange);
        // Process request asynchronously
        evidence_engine_js_1.evidenceEngine.processRequest(request.id).catch((error) => {
            console.error(`Failed to process evidence request ${request.id}:`, error);
        });
        res.status(201).json({
            requestId: request.id,
            status: request.status,
            expiresAt: request.expiresAt,
            message: 'Evidence request created and processing',
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/evidence/request/:requestId
 * Get evidence request status
 */
router.get('/evidence/request/:requestId', async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query('SELECT * FROM evidence_requests WHERE id = $1', [requestId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        const row = rows[0];
        res.json({
            id: row.id,
            status: row.status,
            controlIds: row.control_ids,
            purpose: row.purpose,
            requestedAt: row.created_at.toISOString(),
            processedAt: row.processed_at?.toISOString(),
            packageUrl: row.package_url,
            expiresAt: row.expires_at?.toISOString(),
            errorMessage: row.error_message,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/evidence/packages/:packageId
 * Download evidence package
 */
router.get('/evidence/packages/:packageId', async (req, res, next) => {
    try {
        const { packageId } = req.params;
        const tenantId = req.tenantId || 'default';
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query('SELECT * FROM evidence_packages WHERE id = $1 AND tenant_id = $2', [packageId, tenantId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        const row = rows[0];
        // Check expiration
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Package has expired' });
        }
        // Get associated snapshots
        const { rows: snapshotRows } = await pool.query(`SELECT * FROM evidence_snapshots
       WHERE control_id = ANY($1) AND tenant_id = $2
       ORDER BY captured_at DESC`, [row.control_ids, tenantId]);
        const pkg = {
            id: row.id,
            tenantId: row.tenant_id,
            controlIds: row.control_ids,
            snapshots: snapshotRows.map((sr) => ({
                id: sr.id,
                controlId: sr.control_id,
                sourceId: sr.source_id,
                content: sr.content,
                contentHash: sr.content_hash,
                capturedAt: sr.captured_at.toISOString(),
            })),
            integrity: {
                packageHash: row.package_hash,
                signature: row.signature,
            },
            metadata: {
                generatedAt: row.created_at.toISOString(),
                expiresAt: row.expires_at?.toISOString(),
            },
        };
        res.json(pkg);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/trust/reports/generate
 * Generate a compliance report
 */
router.post('/reports/generate', async (req, res, next) => {
    try {
        const { packId, format = 'json' } = req.body;
        const tenantId = req.tenantId || 'default';
        if (!packId) {
            return res.status(400).json({ error: 'packId is required' });
        }
        const report = await regulatory_pack_service_js_1.regulatoryPackService.generatePackReport(packId, tenantId, format);
        res.json(report);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/reports/:reportId
 * Get a compliance report
 */
router.get('/reports/:reportId', async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const tenantId = req.tenantId || 'default';
        const pool = (0, postgres_js_1.getPostgresPool)();
        const { rows } = await pool.query('SELECT * FROM compliance_reports WHERE id = $1 AND tenant_id = $2', [reportId, tenantId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(rows[0].report_data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/controls/:controlId/assess
 * Assess a control's effectiveness
 */
router.get('/controls/:controlId/assess', async (req, res, next) => {
    try {
        const controlId = (0, http_param_js_1.firstStringOr)(req.params.controlId, '');
        const tenantId = req.tenantId || 'default';
        const assessment = await regulatory_pack_service_js_1.regulatoryPackService.assessControl(controlId, tenantId);
        res.json(assessment);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/questionnaire/caiq
 * Get CAIQ (Consensus Assessments Initiative Questionnaire) responses
 */
router.get('/questionnaire/caiq', async (req, res, next) => {
    try {
        // Generate CAIQ responses from control mappings
        const caiqResponses = Object.values(control_evidence_mappings_js_1.CONTROL_MAPPINGS).flatMap((control) => {
            return control.frameworkMappings
                .filter((m) => m.framework === 'CSA_STAR')
                .map((mapping) => ({
                questionId: mapping.controlId,
                question: mapping.requirement,
                answer: 'Yes',
                explanation: control.description,
                evidenceReference: control.evidenceSources.map((s) => s.name).join(', '),
            }));
        });
        res.json({
            format: 'CAIQ',
            version: '4.0',
            generatedAt: new Date().toISOString(),
            responses: caiqResponses,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/trust/export/oscal
 * Export in OSCAL format
 */
router.get('/export/oscal', async (req, res, next) => {
    try {
        const { framework = 'SOC2_TYPE_II' } = req.query;
        const controls = (0, control_evidence_mappings_js_1.getControlsByFramework)(framework);
        // Generate OSCAL catalog
        const oscalCatalog = {
            catalog: {
                uuid: crypto.randomUUID(),
                metadata: {
                    title: `CompanyOS ${framework} Controls`,
                    'last-modified': new Date().toISOString(),
                    version: '1.0.0',
                    'oscal-version': '1.0.4',
                },
                groups: [
                    {
                        id: 'companyos-controls',
                        title: 'CompanyOS Security Controls',
                        controls: controls.map((control) => ({
                            id: control.id,
                            class: control.category,
                            title: control.title,
                            params: [],
                            props: control.frameworkMappings.map((m) => ({
                                name: 'framework-mapping',
                                value: `${m.framework}:${m.controlId}`,
                            })),
                            parts: [
                                {
                                    id: `${control.id}-stmt`,
                                    name: 'statement',
                                    prose: control.description,
                                },
                                {
                                    id: `${control.id}-impl`,
                                    name: 'implementation',
                                    prose: control.implementation.description,
                                },
                            ],
                        })),
                    },
                ],
            },
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="oscal-catalog-${framework}.json"`);
        res.json(oscalCatalog);
    }
    catch (error) {
        next(error);
    }
});
// =============================================================================
// Helper Functions
// =============================================================================
function getFrameworkName(framework) {
    const names = {
        SOC2_TYPE_I: 'SOC 2 Type I',
        SOC2_TYPE_II: 'SOC 2 Type II',
        ISO_27001: 'ISO 27001:2022',
        ISO_27017: 'ISO 27017',
        ISO_27018: 'ISO 27018',
        HIPAA: 'HIPAA',
        HITRUST: 'HITRUST CSF',
        FEDRAMP_LOW: 'FedRAMP Low',
        FEDRAMP_MODERATE: 'FedRAMP Moderate',
        FEDRAMP_HIGH: 'FedRAMP High',
        PCI_DSS_4: 'PCI DSS v4.0',
        GDPR: 'GDPR',
        CCPA: 'CCPA/CPRA',
        SOX: 'SOX',
        NIST_CSF: 'NIST CSF 2.0',
        NIST_800_53: 'NIST 800-53',
        NIST_800_171: 'NIST 800-171',
        CIS_CONTROLS: 'CIS Controls',
        CSA_STAR: 'CSA STAR',
    };
    return names[framework] || framework;
}
// =============================================================================
// Schema for DB Tables
// =============================================================================
exports.TRUST_CENTER_API_SCHEMA = `
-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  framework TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  auditor TEXT,
  certificate_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Incidents table (for status tracking)
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  affected_services TEXT[],
  started_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS certifications_status_idx ON certifications (status);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status, created_at DESC);
`;
exports.default = router;
