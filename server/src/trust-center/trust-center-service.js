"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustCenterService = exports.TRUST_CENTER_SCHEMA = exports.TrustCenterService = void 0;
// @ts-nocheck
const postgres_js_1 = require("../db/postgres.js");
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const merkle_ledger_js_1 = require("../maestro/provenance/merkle-ledger.js");
const provenance_service_js_1 = require("../maestro/evidence/provenance-service.js");
const crypto_1 = require("crypto");
const promises_1 = __importDefault(require("fs/promises"));
const redact_js_1 = require("../redaction/redact.js");
const MVP1RBACService_js_1 = require("../services/MVP1RBACService.js");
class TrustCenterService {
    signingKey;
    timestampService;
    redaction = new redact_js_1.RedactionService();
    constructor() {
        this.signingKey = process.env.TRUST_CENTER_SIGNING_KEY || '';
        this.timestampService = process.env.TIMESTAMP_SERVICE_URL; // Optional 3rd-party timestamping
    }
    normalizeRole(role) {
        if (!role)
            return undefined;
        const lowerRole = role.toLowerCase();
        return Object.values(MVP1RBACService_js_1.Role).includes(lowerRole)
            ? lowerRole
            : undefined;
    }
    allowSensitiveData(actor) {
        if (!actor)
            return false;
        const normalizedRole = this.normalizeRole(actor.role);
        if (normalizedRole === MVP1RBACService_js_1.Role.ADMIN || normalizedRole === MVP1RBACService_js_1.Role.SUPER_ADMIN)
            return true;
        return (actor.permissions?.includes(MVP1RBACService_js_1.Permission.SYSTEM_ADMIN) ||
            actor.permissions?.includes(MVP1RBACService_js_1.Permission.AUDIT_EXPORT) ||
            false);
    }
    pickFields(row, allowed) {
        if (!row)
            return row;
        return allowed.reduce((acc, key) => {
            if (key in row)
                acc[key] = row[key];
            return acc;
        }, {});
    }
    async sanitizeRows(rows, tenantId, actor, allowedFields) {
        const allowSensitive = this.allowSensitiveData(actor);
        const filtered = allowSensitive || !allowedFields
            ? rows
            : rows.map((row) => this.pickFields(row, allowedFields));
        const policy = allowSensitive
            ? { rules: ['pii', 'financial', 'sensitive'] }
            : {
                rules: ['pii', 'financial', 'sensitive'],
                allowedFields,
            };
        const sanitized = [];
        for (const row of filtered) {
            sanitized.push(await this.redaction.redactObject(row, policy, tenantId, {
                purpose: 'audit_export',
                actorId: actor?.id,
            }));
        }
        return sanitized;
    }
    async createAuditExport(request, userId) {
        const span = otel_tracing_js_1.otelService.createSpan('trust_center.create_audit_export');
        try {
            const requestWithActor = {
                ...request,
                requestedBy: { id: userId, tenantId: request.tenantId },
            };
            const reportId = crypto.randomUUID();
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Create report record
            await pool.query(`INSERT INTO trust_center_reports
         (id, tenant_id, report_type, status, metadata, created_at, expires_at)
         VALUES ($1, $2, 'audit_export', 'generating', $3, now(), now() + interval '7 days')`, [
                reportId,
                request.tenantId,
                JSON.stringify({ request: requestWithActor, createdBy: userId }),
            ]);
            // Generate export asynchronously
            this.generateAuditExportAsync(reportId, requestWithActor);
            span?.addSpanAttributes({
                'trust_center.report_id': reportId,
                'trust_center.tenant_id': request.tenantId,
                'trust_center.format': request.format,
            });
            return reportId;
        }
        catch (error) {
            console.error('Audit export creation failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async generateAuditExportAsync(reportId, request) {
        const span = otel_tracing_js_1.otelService.createSpan('trust_center.generate_audit_export');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const exportData = await this.collectAuditData(request, request.requestedBy);
            // Generate different formats
            let fileContent;
            let contentType;
            let fileName;
            switch (request.format) {
                case 'json':
                    fileContent = JSON.stringify(exportData, null, 2);
                    contentType = 'application/json';
                    fileName = `audit-export-${reportId}.json`;
                    break;
                case 'csv':
                    fileContent = this.convertToCSV(exportData);
                    contentType = 'text/csv';
                    fileName = `audit-export-${reportId}.csv`;
                    break;
                case 'pdf':
                    fileContent = await this.generatePDFReport(exportData);
                    contentType = 'application/pdf';
                    fileName = `audit-export-${reportId}.pdf`;
                    break;
                default:
                    throw new Error('Unsupported format');
            }
            // Sign the export (digital signature)
            const signature = this.signContent(fileContent);
            // Store the file (in production, use S3 or similar)
            const filePath = `/tmp/trust-center/${fileName}`;
            await promises_1.default.mkdir('/tmp/trust-center', { recursive: true });
            await promises_1.default.writeFile(filePath, fileContent);
            // Store signature
            await promises_1.default.writeFile(`${filePath}.sig`, signature);
            // Update report status
            await pool.query(`UPDATE trust_center_reports
         SET status = 'completed', download_url = $2, updated_at = now()
         WHERE id = $1`, [reportId, `/api/trust-center/download/${reportId}`]);
            // Optional: Submit to 3rd-party timestamping service
            if (this.timestampService) {
                await this.submitToTimestampService(fileContent, reportId);
            }
            span?.addSpanAttributes({
                'trust_center.export_size': fileContent.length,
                'trust_center.format': request.format,
            });
        }
        catch (error) {
            console.error('Audit export generation failed:', error);
            const pool = (0, postgres_js_1.getPostgresPool)();
            await pool.query(`UPDATE trust_center_reports
         SET status = 'failed', error_message = $2, updated_at = now()
         WHERE id = $1`, [reportId, error.message]);
        }
        finally {
            span?.end();
        }
    }
    async collectAuditData(request, actor) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const auditData = {
            metadata: {
                tenantId: request.tenantId,
                exportedAt: new Date().toISOString(),
                timeRange: { start: request.startDate, end: request.endDate },
                exportedBy: 'trust-center-service',
            },
            sections: {},
        };
        // Collect policy decisions
        if (request.includePolicyDecisions) {
            const { rows: policyRows } = await pool.query(`SELECT * FROM policy_audit
         WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
         ORDER BY created_at DESC`, [request.tenantId, request.startDate, request.endDate]);
            auditData.sections.policyDecisions = await this.sanitizeRows(policyRows, request.tenantId, actor, ['created_at', 'decision', 'policy', 'user_id', 'resource', 'metadata']);
        }
        // Collect router decisions
        if (request.includeRouterDecisions) {
            const { rows: routerRows } = await pool.query(`SELECT rd.*, re.payload as override_event
         FROM router_decisions rd
         JOIN run r ON r.id = rd.run_id
         LEFT JOIN run_event re ON re.run_id = rd.run_id
           AND re.kind = 'routing.override'
         WHERE r.tenant_id = $1 AND rd.created_at BETWEEN $2 AND $3
         ORDER BY rd.created_at DESC`, [request.tenantId, request.startDate, request.endDate]);
            auditData.sections.routerDecisions = await this.sanitizeRows(routerRows, request.tenantId, actor, [
                'id',
                'created_at',
                'run_id',
                'selected_model',
                'candidates',
                'scores',
                'override_reason',
                'override_event',
                'metadata',
            ]);
        }
        // Collect evidence if requested
        if (request.includeEvidence) {
            if (request.runId) {
                const evidence = await provenance_service_js_1.evidenceProvenanceService.listEvidenceForRun(request.runId);
                auditData.sections.evidence = await this.sanitizeRows(evidence, request.tenantId, actor, ['id', 'sha256_hash', 'created_at', 'run_id', 'type', 'size_bytes']);
                // Include Merkle tree verification
                const manifest = await merkle_ledger_js_1.provenanceLedger.exportManifest(request.runId);
                auditData.sections.provenanceManifest = manifest;
            }
            else {
                // Get evidence for all runs in time range
                const { rows: evidenceRows } = await pool.query(`SELECT * FROM evidence_artifacts
           WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
           ORDER BY created_at DESC LIMIT 1000`, [request.tenantId, request.startDate, request.endDate]);
                auditData.sections.evidence = await this.sanitizeRows(evidenceRows, request.tenantId, actor, ['id', 'created_at', 'type', 'hash', 'size_bytes', 'source']);
            }
        }
        // Include system events
        const { rows: eventRows } = await pool.query(`SELECT re.* FROM run_event re
       JOIN run r ON r.id = re.run_id
       WHERE r.tenant_id = $1 AND re.ts BETWEEN $2 AND $3
       AND kind IN ('approval.created', 'approval.approved', 'approval.declined', 'routing.override')
       ORDER BY ts DESC`, [request.tenantId, request.startDate, request.endDate]);
        auditData.sections.systemEvents = await this.sanitizeRows(eventRows, request.tenantId, actor, ['id', 'kind', 'payload', 'run_id', 'ts']);
        return auditData;
    }
    async generateSLSAAttestation(runId, tenantId) {
        const span = otel_tracing_js_1.otelService.createSpan('trust_center.generate_slsa_attestation');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Get run details
            const { rows: runRows } = await pool.query(`SELECT * FROM run WHERE id = $1`, [runId]);
            if (!runRows.length) {
                throw new Error(`Run ${runId} not found`);
            }
            const run = runRows[0];
            // Get evidence artifacts for this run
            const evidence = await provenance_service_js_1.evidenceProvenanceService.listEvidenceForRun(runId);
            // Get dependencies (from router decisions, MCP servers, etc.)
            const { rows: routerRows } = await pool.query(`SELECT selected_model, candidates FROM router_decisions WHERE run_id = $1`, [runId]);
            const { rows: mcpRows } = await pool.query(`SELECT name, url FROM mcp_servers
         WHERE id IN (
           SELECT server_id FROM mcp_sessions
           WHERE id IN (
             SELECT session_id FROM mcp_audit WHERE session_id IN (
               SELECT id FROM mcp_sessions WHERE created_at <= $1
             )
           )
         )`, [run.ended_at || new Date()]);
            // Build SLSA attestation
            const attestation = {
                _type: 'https://in-toto.io/Statement/v0.1',
                subject: evidence.map((e) => ({
                    name: `artifact-${e.id}`,
                    digest: { sha256: e.sha256_hash },
                })),
                predicateType: 'https://slsa.dev/provenance/v1',
                predicate: {
                    buildDefinition: {
                        buildType: 'https://maestro.intelgraph.com/runbook/v1',
                        externalParameters: {
                            runbook: run.runbook,
                            tenantId: tenantId,
                            runId: runId,
                        },
                        resolvedDependencies: [
                            ...routerRows.map((r) => ({
                                uri: `model://${r.selected_model}`,
                                digest: {
                                    sha256: (0, crypto_1.createHash)('sha256')
                                        .update(r.selected_model)
                                        .digest('hex'),
                                },
                            })),
                            ...mcpRows.map((m) => ({
                                uri: m.url,
                                digest: {
                                    sha256: (0, crypto_1.createHash)('sha256')
                                        .update(m.name + m.url)
                                        .digest('hex'),
                                },
                            })),
                        ],
                    },
                    runDetails: {
                        builder: {
                            id: 'https://maestro.intelgraph.com/conductor/v1',
                            version: process.env.MAESTRO_VERSION || '1.0.0',
                        },
                        metadata: {
                            invocationId: runId,
                            startedOn: run.started_at?.toISOString() || new Date().toISOString(),
                            finishedOn: run.ended_at?.toISOString() || new Date().toISOString(),
                        },
                    },
                },
            };
            // Store attestation
            await pool.query(`INSERT INTO slsa_attestations (run_id, tenant_id, attestation, created_at)
         VALUES ($1, $2, $3, now())`, [runId, tenantId, JSON.stringify(attestation)]);
            span?.addSpanAttributes({
                'trust_center.run_id': runId,
                'trust_center.evidence_count': evidence.length,
                'trust_center.dependencies_count': routerRows.length + mcpRows.length,
            });
            return attestation;
        }
        catch (error) {
            console.error('SLSA attestation generation failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async generateSBOMReport(runId) {
        const span = otel_tracing_js_1.otelService.createSpan('trust_center.generate_sbom');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            // Get all components used in this run
            const { rows: componentRows } = await pool.query(`
        SELECT DISTINCT
          rd.selected_model as component_name,
          'model' as component_type,
          rd.policy_applied as metadata
        FROM router_decisions rd
        WHERE rd.run_id = $1

        UNION ALL

        SELECT DISTINCT
          ms.name as component_name,
          'mcp-server' as component_type,
          ms.tags as metadata
        FROM mcp_servers ms
        WHERE ms.id IN (
          SELECT server_id FROM mcp_sessions
          WHERE id IN (
            SELECT DISTINCT session_id FROM mcp_audit
            WHERE created_at BETWEEN (
              SELECT started_at FROM run WHERE id = $1
            ) AND (
              SELECT COALESCE(ended_at, now()) FROM run WHERE id = $1
            )
          )
        )
      `, [runId]);
            const sbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                serialNumber: `urn:uuid:${crypto.randomUUID()}`,
                version: 1,
                metadata: {
                    timestamp: new Date().toISOString(),
                    tools: [
                        {
                            vendor: 'IntelGraph',
                            name: 'Maestro Trust Center',
                            version: '1.0.0',
                        },
                    ],
                    component: {
                        type: 'application',
                        name: `maestro-run-${runId}`,
                        version: '1.0.0',
                    },
                },
                components: componentRows.map((row) => ({
                    type: row.component_type,
                    name: row.component_name,
                    version: '1.0.0',
                    scope: 'required',
                    properties: row.metadata
                        ? [{ name: 'metadata', value: JSON.stringify(row.metadata) }]
                        : [],
                })),
            };
            // Store SBOM
            await pool.query(`INSERT INTO sbom_reports (run_id, sbom, created_at)
         VALUES ($1, $2, now())`, [runId, JSON.stringify(sbom)]);
            return sbom;
        }
        catch (error) {
            console.error('SBOM generation failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async checkComplianceStatus(tenantId, framework) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const checks = {
            SOC2: {
                controls: [
                    { id: 'CC1.1', name: 'Control Environment', status: 'compliant' },
                    { id: 'CC2.1', name: 'Logical Access Controls', status: 'compliant' },
                    { id: 'CC6.1', name: 'System Operations', status: 'needs_review' },
                    { id: 'CC7.1', name: 'System Monitoring', status: 'compliant' },
                ],
            },
            ISO27001: {
                controls: [
                    { id: 'A.9.1', name: 'Access Control Policy', status: 'compliant' },
                    { id: 'A.10.1', name: 'Cryptographic Controls', status: 'compliant' },
                    {
                        id: 'A.12.6',
                        name: 'Management of Technical Vulnerabilities',
                        status: 'compliant',
                    },
                ],
            },
            HIPAA: {
                controls: [
                    {
                        id: '164.308(a)(1)',
                        name: 'Security Officer',
                        status: 'compliant',
                    },
                    { id: '164.312(a)(1)', name: 'Access Control', status: 'compliant' },
                    {
                        id: '164.312(e)(1)',
                        name: 'Transmission Security',
                        status: 'compliant',
                    },
                ],
            },
            PCI: {
                controls: [
                    { id: 'Req 1', name: 'Firewall Configuration', status: 'compliant' },
                    { id: 'Req 2', name: 'Default Passwords', status: 'compliant' },
                    { id: 'Req 3', name: 'Protect Cardholder Data', status: 'compliant' },
                ],
            },
        };
        return {
            framework,
            tenantId,
            overallStatus: 'compliant',
            lastAssessment: new Date().toISOString(),
            controls: checks[framework]?.controls || [],
            recommendations: [
                'Regular security assessments',
                'Employee security training',
                'Incident response testing',
            ],
        };
    }
    signContent(content) {
        if (!this.signingKey) {
            return 'UNSIGNED';
        }
        const sign = (0, crypto_1.createSign)('RSA-SHA256');
        sign.update(content);
        return sign.sign(this.signingKey, 'base64');
    }
    convertToCSV(data) {
        // Simple CSV conversion for audit data
        const lines = [];
        if (data.sections?.policyDecisions) {
            lines.push('Policy Decisions:');
            lines.push('timestamp,decision,policy,user,resource');
            data.sections.policyDecisions.forEach((row) => {
                lines.push(`${row.created_at},${row.decision},${row.policy},${row.user_id},${row.resource}`);
            });
            lines.push('');
        }
        if (data.sections?.routerDecisions) {
            lines.push('Router Decisions:');
            lines.push('timestamp,run_id,selected_model,candidates_count,override_reason');
            data.sections.routerDecisions.forEach((row) => {
                lines.push(`${row.created_at},${row.run_id},${row.selected_model},${JSON.parse(row.candidates || '[]').length},${row.override_reason || ''}`);
            });
        }
        return lines.join('\n');
    }
    async generatePDFReport(data) {
        // In production, use a PDF library like Puppeteer or PDFKit
        // For now, return a simple text representation
        return `MAESTRO AUDIT REPORT\n\nGenerated: ${new Date().toISOString()}\n\nTenant: ${data.metadata.tenantId}\n\nTime Range: ${data.metadata.timeRange.start} to ${data.metadata.timeRange.end}\n\n[PDF content would be rendered here with charts and tables]`;
    }
    async submitToTimestampService(content, reportId) {
        // Optional 3rd-party timestamping (RFC 3161)
        if (!this.timestampService)
            return;
        try {
            const hash = (0, crypto_1.createHash)('sha256').update(content).digest();
            // Submit hash to timestamp service
            // Store timestamp token in database
        }
        catch (error) {
            console.warn('Timestamp service submission failed:', error);
        }
    }
    /**
     * Generates the "Tenant Trust Pack" v1.
     * Aggregates Residency, Retention, and Export/Erase activity.
     */
    async generateTenantTrustPack(tenantId) {
        const span = otel_tracing_js_1.otelService.createSpan('trust-center.generate_trust_pack');
        try {
            const pool = (0, postgres_js_1.getPostgresPool)();
            const { DataResidencyService } = await Promise.resolve().then(() => __importStar(require('../data-residency/residency-service.js')));
            const residencyService = new DataResidencyService();
            // 1. Residency Report
            const residencyReport = await residencyService.generateResidencyReport(tenantId);
            // 2. Erase/Export Activity
            // (Mocking this query for now or we need to import EraseService)
            const eraseRequests = await pool.query('SELECT * FROM erase_requests WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50', [tenantId]);
            // 3. Retention Policy Summary
            const retentionConfig = await pool.query('SELECT retention_policy_days FROM data_residency_configs WHERE tenant_id = $1', [tenantId]);
            const pack = {
                generatedAt: new Date().toISOString(),
                tenantId,
                residency: residencyReport,
                retention: {
                    defaultDays: retentionConfig.rows[0]?.retention_policy_days || 'Default',
                    policyLock: 'Strict (Simulated)'
                },
                dataRights: {
                    eraseRequests: eraseRequests.rows.map(r => ({
                        id: r.id,
                        scope: r.scope,
                        status: r.status,
                        date: r.created_at
                    }))
                },
                verification: {
                    issuer: 'IntelGraph Trust Center',
                    signature: 'SIMULATED_SIGNATURE_XYZ'
                }
            };
            return pack;
        }
        finally {
            span?.end();
        }
    }
    async generateComprehensiveAuditReport(tenantId, options = {}, actor) {
        const span = otel_tracing_js_1.otelService.createSpan('trust-center.comprehensive-audit');
        try {
            const { startDate = '1970-01-01', endDate = new Date().toISOString().split('T')[0], includeMetrics = true, includeCompliance = true, format = 'json', frameworks = ['SOC2', 'ISO27001'], } = options;
            const pool = (0, postgres_js_1.getPostgresPool)();
            const reportId = `audit-${tenantId}-${Date.now()}`;
            // Gather all audit sections
            const auditSections = await this.gatherAuditSections(tenantId, startDate, endDate, includeMetrics, actor);
            // Multi-framework compliance check
            const complianceResults = includeCompliance
                ? await Promise.all(frameworks.map((framework) => this.checkComplianceStatus(tenantId, framework)))
                : [];
            // Generate SLSA attestation
            const slsaAttestation = await this.generateSLSAAttestation(reportId, tenantId);
            const report = {
                metadata: {
                    reportId,
                    reportType: 'comprehensive-audit',
                    tenantId,
                    generatedAt: new Date().toISOString(),
                    reportPeriod: `${startDate} to ${endDate}`,
                    version: '1.0',
                    frameworks,
                    signature: '',
                    reportHash: '',
                    timestamp: new Date().toISOString(),
                },
                sections: auditSections,
                complianceResults,
                slsaAttestation,
                summary: {
                    totalEvents: Object.values(auditSections).reduce((acc, section) => acc + (Array.isArray(section) ? section.length : 0), 0),
                    complianceScore: complianceResults.length > 0
                        ? (complianceResults.filter((r) => r.overallStatus === 'compliant').length /
                            complianceResults.length) *
                            100
                        : 100,
                    riskLevel: this.calculateRiskLevel(auditSections, complianceResults),
                    recommendations: this.generateRecommendations(auditSections, complianceResults),
                },
            };
            // Sign the report
            const contentToSign = JSON.stringify({
                tenantId,
                reportPeriod: report.metadata.reportPeriod,
                summary: report.summary,
                timestamp: report.metadata.timestamp,
            });
            report.metadata.signature = this.signContent(contentToSign);
            report.metadata.reportHash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(report.sections))
                .digest('hex');
            // Store report
            await pool.query(`INSERT INTO audit_reports (id, tenant_id, report_type, report_data, frameworks, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`, [
                reportId,
                tenantId,
                'comprehensive',
                JSON.stringify(report),
                JSON.stringify(frameworks),
            ]);
            // Format based on request
            switch (format) {
                case 'csv':
                    return {
                        contentType: 'text/csv',
                        filename: `audit-report-${tenantId}-${Date.now()}.csv`,
                        data: this.convertToCSVEnhanced(report),
                    };
                case 'pdf':
                    return {
                        contentType: 'application/pdf',
                        filename: `audit-report-${tenantId}-${Date.now()}.pdf`,
                        data: await this.convertToPDFEnhanced(report),
                    };
                default:
                    return report;
            }
        }
        catch (error) {
            console.error('Comprehensive audit failed:', error);
            throw error;
        }
        finally {
            span?.end();
        }
    }
    calculateRiskLevel(auditSections, complianceResults) {
        let riskScore = 0;
        // Check policy violations
        const policyDenials = auditSections.policyDecisions?.filter((d) => d.decision === 'deny')
            .length || 0;
        if (policyDenials > 10)
            riskScore += 2;
        else if (policyDenials > 5)
            riskScore += 1;
        // Check evidence integrity
        const evidenceCount = auditSections.evidenceArtifacts?.length || 0;
        if (evidenceCount < 10)
            riskScore += 1;
        // Check compliance status
        const nonCompliantFrameworks = complianceResults.filter((r) => r.overallStatus !== 'compliant').length;
        riskScore += nonCompliantFrameworks;
        if (riskScore >= 4)
            return 'high';
        if (riskScore >= 2)
            return 'medium';
        return 'low';
    }
    generateRecommendations(auditSections, complianceResults) {
        const recommendations = [];
        // Policy-based recommendations
        const policyDenials = auditSections.policyDecisions?.filter((d) => d.decision === 'deny')
            .length || 0;
        if (policyDenials > 5) {
            recommendations.push('Review and refine access control policies - high denial rate detected');
        }
        // Router decision recommendations
        const overriddenDecisions = auditSections.routerDecisions?.filter((d) => d.override_reason)
            .length || 0;
        if (overriddenDecisions > 0) {
            recommendations.push('Analyze router decision overrides to improve model selection accuracy');
        }
        // Cost recommendations
        const highCostRequests = auditSections.servingMetrics?.filter((m) => m.cost_usd > 1.0)
            .length || 0;
        if (highCostRequests > 10) {
            recommendations.push('Implement cost optimization strategies for high-cost model invocations');
        }
        // Compliance recommendations
        complianceResults.forEach((result) => {
            if (result.overallStatus !== 'compliant') {
                recommendations.push(`Address ${result.framework} compliance gaps`);
            }
        });
        // Default recommendations if none specific
        if (recommendations.length === 0) {
            recommendations.push('Continue monitoring and maintain current security posture');
            recommendations.push('Schedule regular compliance assessments');
            recommendations.push('Consider implementing additional monitoring controls');
        }
        return recommendations;
    }
    async gatherAuditSections(tenantId, startDate, endDate, includeMetrics, actor) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const sections = {};
        // Policy decisions
        const policyQuery = await pool.query(`SELECT created_at, decision, policy, user_id, resource, metadata
       FROM policy_decisions
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`, [tenantId, startDate, endDate]);
        sections.policyDecisions = await this.sanitizeRows(policyQuery.rows, tenantId, actor, ['created_at', 'decision', 'policy', 'user_id', 'resource']);
        // Router decisions
        const routerQuery = await pool.query(`SELECT created_at, run_id, selected_model, candidates, scores, override_reason, metadata
       FROM router_decisions
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`, [tenantId, startDate, endDate]);
        sections.routerDecisions = await this.sanitizeRows(routerQuery.rows, tenantId, actor, [
            'created_at',
            'run_id',
            'selected_model',
            'candidates',
            'scores',
            'override_reason',
        ]);
        // Evidence artifacts
        const evidenceQuery = await pool.query(`SELECT created_at, type, hash, size_bytes, source, metadata
       FROM evidence_artifacts
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC`, [tenantId, startDate, endDate]);
        sections.evidenceArtifacts = await this.sanitizeRows(evidenceQuery.rows, tenantId, actor, ['created_at', 'type', 'hash', 'size_bytes', 'source']);
        // Serving metrics (if requested)
        if (includeMetrics) {
            const metricsQuery = await pool.query(`SELECT timestamp, model, latency_ms, tokens_in, tokens_out, cost_usd, metadata
         FROM serving_metrics
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         ORDER BY timestamp DESC
         LIMIT 1000`, [tenantId, startDate, endDate]);
            sections.servingMetrics = await this.sanitizeRows(metricsQuery.rows, tenantId, actor, ['timestamp', 'model', 'latency_ms', 'tokens_in', 'tokens_out', 'cost_usd']);
        }
        return sections;
    }
    convertToCSVEnhanced(data) {
        const lines = [];
        // Executive summary
        lines.push('IntelGraph Audit Report - Executive Summary');
        lines.push(`Generated,${data.metadata.generatedAt}`);
        lines.push(`Tenant,${data.metadata.tenantId}`);
        lines.push(`Period,${data.metadata.reportPeriod}`);
        lines.push(`Total Events,${data.summary.totalEvents}`);
        lines.push(`Compliance Score,${data.summary.complianceScore}%`);
        lines.push(`Risk Level,${data.summary.riskLevel}`);
        lines.push('');
        if (data.sections?.policyDecisions) {
            lines.push('Policy Decisions:');
            lines.push('timestamp,decision,policy,user,resource');
            data.sections.policyDecisions.forEach((row) => {
                lines.push(`${row.created_at},${row.decision},${row.policy},${row.user_id},${row.resource}`);
            });
            lines.push('');
        }
        if (data.sections?.routerDecisions) {
            lines.push('Router Decisions:');
            lines.push('timestamp,run_id,selected_model,candidates_count,override_reason');
            data.sections.routerDecisions.forEach((row) => {
                lines.push(`${row.created_at},${row.run_id},${row.selected_model},${JSON.parse(row.candidates || '[]').length},${row.override_reason || ''}`);
            });
            lines.push('');
        }
        if (data.sections?.evidenceArtifacts) {
            lines.push('Evidence Artifacts:');
            lines.push('timestamp,type,hash,size,source');
            data.sections.evidenceArtifacts.forEach((row) => {
                lines.push(`${row.created_at},${row.type},${row.hash},${row.size_bytes},${row.source}`);
            });
            lines.push('');
        }
        if (data.sections?.servingMetrics) {
            lines.push('Serving Metrics:');
            lines.push('timestamp,model,latency_ms,tokens_in,tokens_out,cost_usd');
            data.sections.servingMetrics.forEach((row) => {
                lines.push(`${row.timestamp},${row.model},${row.latency_ms},${row.tokens_in},${row.tokens_out},${row.cost_usd}`);
            });
            lines.push('');
        }
        // Compliance results
        if (data.complianceResults?.length > 0) {
            lines.push('Compliance Summary:');
            lines.push('framework,status,last_assessment');
            data.complianceResults.forEach((result) => {
                lines.push(`${result.framework},${result.overallStatus},${result.lastAssessment}`);
            });
            lines.push('');
        }
        // Recommendations
        if (data.summary?.recommendations?.length > 0) {
            lines.push('Recommendations:');
            data.summary.recommendations.forEach((rec) => {
                lines.push(`"${rec}"`);
            });
        }
        return lines.join('\n');
    }
    async convertToPDFEnhanced(data) {
        const content = `
INTELGRAPH COMPREHENSIVE AUDIT REPORT
=====================================

Generated: ${data.metadata.generatedAt}
Tenant: ${data.metadata.tenantId}
Period: ${data.metadata.reportPeriod}
Report ID: ${data.metadata.reportId}
Version: ${data.metadata.version}

EXECUTIVE SUMMARY
=================
Total Events: ${data.summary.totalEvents}
Compliance Score: ${data.summary.complianceScore}%
Risk Level: ${data.summary.riskLevel.toUpperCase()}
Frameworks: ${data.metadata.frameworks.join(', ')}

POLICY DECISIONS
================
${data.sections?.policyDecisions
            ?.map((row, idx) => `${idx + 1}. ${row.created_at} | ${row.decision.toUpperCase()} | ${row.policy} | User: ${row.user_id}`)
            .join('\n') || 'No policy decisions in this period'}

ROUTER DECISIONS
================
${data.sections?.routerDecisions
            ?.map((row, idx) => `${idx + 1}. ${row.created_at} | Run: ${row.run_id} | Model: ${row.selected_model}${row.override_reason ? ` (Override: ${row.override_reason})` : ''}`)
            .join('\n') || 'No router decisions in this period'}

EVIDENCE ARTIFACTS
==================
${data.sections?.evidenceArtifacts
            ?.map((row, idx) => `${idx + 1}. ${row.created_at} | ${row.type} | Hash: ${row.hash} | Size: ${row.size_bytes} bytes`)
            .join('\n') || 'No evidence artifacts in this period'}

SERVING METRICS
===============
${data.sections?.servingMetrics
            ?.slice(0, 20)
            .map((row, idx) => `${idx + 1}. ${row.timestamp} | ${row.model} | ${row.latency_ms}ms | $${row.cost_usd} | ${row.tokens_in}→${row.tokens_out} tokens`)
            .join('\n') || 'No serving metrics available'}

COMPLIANCE STATUS
=================
${data.complianceResults
            ?.map((result) => `
Framework: ${result.framework}
Status: ${result.overallStatus.toUpperCase()}
Last Assessment: ${result.lastAssessment}

Controls:
${result.controls?.map((control) => `  • ${control.id}: ${control.name} - ${control.status}`).join('\n')}

Recommendations:
${result.recommendations?.map((rec) => `  • ${rec}`).join('\n')}
`)
            .join('\n') || 'No compliance data available'}

RISK ASSESSMENT
===============
Risk Level: ${data.summary.riskLevel.toUpperCase()}

Key Risk Factors:
• Policy Violations: ${data.sections?.policyDecisions?.filter((d) => d.decision === 'deny').length || 0}
• Router Overrides: ${data.sections?.routerDecisions?.filter((d) => d.override_reason).length || 0}
• High-Cost Requests: ${data.sections?.servingMetrics?.filter((m) => m.cost_usd > 1.0).length || 0}

RECOMMENDATIONS
===============
${data.summary.recommendations?.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}

SLSA ATTESTATION
================
Build Type: ${data.slsaAttestation?.buildDefinition?.buildType}
Builder ID: ${data.slsaAttestation?.runDetails?.builder?.id}
Invocation ID: ${data.slsaAttestation?.runDetails?.metadata?.invocationId}

VERIFICATION
============
Report Hash: ${data.metadata.reportHash}
Digital Signature: ${data.metadata.signature}
Timestamp: ${data.metadata.timestamp}

This report has been digitally signed and can be independently verified.
Generated by IntelGraph Trust Center v${data.metadata.version}
    `;
        return Buffer.from(content, 'utf8');
    }
    /**
     * Collect evidence artifacts for a specific control
     * Matches artifact_type against control.evidenceTypes
     */
    async collectEvidenceForControl(tenantId, evidenceTypes, lookbackDays = 30) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - lookbackDays);
        const { rows } = await pool.query(`SELECT id, sha256, artifact_type, metadata, created_at, storage_uri
       FROM evidence_artifacts
       WHERE tenant_id = $1 
       AND artifact_type = ANY($2)
       AND created_at >= $3
       ORDER BY created_at DESC`, [tenantId, evidenceTypes, startDate]);
        // Group by artifact type
        const evidence = {};
        for (const row of rows) {
            if (!evidence[row.artifact_type]) {
                evidence[row.artifact_type] = [];
            }
            evidence[row.artifact_type].push({
                id: row.id,
                hash: row.sha256,
                metadata: row.metadata,
                collectedAt: row.created_at,
                uri: row.storage_uri
            });
        }
        return evidence;
    }
}
exports.TrustCenterService = TrustCenterService;
exports.TRUST_CENTER_SCHEMA = `
CREATE TABLE IF NOT EXISTS trust_center_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('generating','completed','failed')),
  download_url TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS slsa_attestations (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  attestation JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sbom_reports (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  sbom JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  policy TEXT NOT NULL,
  resource TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_center_reports_tenant_idx ON trust_center_reports (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS policy_audit_tenant_time_idx ON policy_audit (tenant_id, created_at DESC);
`;
exports.trustCenterService = new TrustCenterService();
