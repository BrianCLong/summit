"use strict";
/**
 * PIG Governance Service
 *
 * Manages governance configuration, compliance tracking, and audit integration
 * aligned with NIST AI RMF and EU DSA requirements.
 */
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
exports.pigGovernanceService = exports.PIGGovernanceService = exports.defaultGovernanceServiceConfig = void 0;
const crypto = __importStar(require("crypto"));
const events_1 = require("events");
const prom_client_1 = require("prom-client");
const pino_1 = __importDefault(require("pino"));
const pg_js_1 = require("../db/pg.js");
const ledger_js_1 = require("../provenance/ledger.js");
const index_js_1 = require("../audit/index.js");
const logger = pino_1.default({ name: 'PIGGovernanceService' });
// =============================================================================
// Metrics
// =============================================================================
const governanceEventsTotal = new prom_client_1.Counter({
    name: 'pig_governance_events_total',
    help: 'Total governance events',
    labelNames: ['tenant_id', 'event_type', 'outcome'],
});
const complianceScore = new prom_client_1.Gauge({
    name: 'pig_compliance_score',
    help: 'Current compliance score (0-100)',
    labelNames: ['tenant_id', 'framework'],
});
const riskScore = new prom_client_1.Gauge({
    name: 'pig_risk_score',
    help: 'Current risk score (0-100)',
    labelNames: ['tenant_id', 'risk_category'],
});
const approvalLatency = new prom_client_1.Histogram({
    name: 'pig_approval_latency_seconds',
    help: 'Time from submission to approval',
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
    labelNames: ['asset_type'],
});
exports.defaultGovernanceServiceConfig = {
    defaultConfig: {
        requireInboundVerification: true,
        requireOutboundSigning: true,
        requiredSigningTypes: ['press_release', 'official_statement', 'executive_video'],
        auditRetentionDays: 365 * 7, // 7 years
        approvalWorkflow: {
            enabled: true,
            minApprovers: 1,
            approverRoles: ['content_admin', 'communications_manager'],
            autoApproveTypes: ['social_card'],
            timeoutHours: 24,
        },
        revocationPolicy: {
            allowImmediateRevocation: true,
            requireExplanation: true,
            autoPropagateRevocations: true,
            propagationChannels: ['website', 'twitter', 'linkedin'],
            revokedAssetRetentionDays: 365,
        },
        deepfakeThresholds: {
            flagThreshold: 0.6,
            blockThreshold: 0.85,
            autoFlag: true,
            autoBlock: false,
        },
        impersonationMonitoring: {
            enabled: true,
            platforms: ['twitter', 'linkedin', 'facebook'],
            keywords: [],
            domains: [],
            monitoredPersons: [],
            alertThreshold: 0.7,
            notifications: {
                email: true,
                slack: false,
                webhook: false,
            },
        },
    },
    enableNISTTracking: true,
    enableDSATracking: true,
    riskRegisterUpdateFrequency: 'realtime',
    complianceReportSchedule: 'weekly',
};
// =============================================================================
// Governance Service
// =============================================================================
class PIGGovernanceService extends events_1.EventEmitter {
    config;
    tenantConfigs = new Map();
    initialized = false;
    constructor(config = {}) {
        super();
        this.config = { ...exports.defaultGovernanceServiceConfig, ...config };
    }
    /**
     * Initialize the service
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Load tenant configurations
            await this.loadTenantConfigs();
            // Start background tasks
            this.startRiskRegisterUpdates();
            this.startComplianceReportGeneration();
            this.initialized = true;
            logger.info('PIGGovernanceService initialized');
        }
        catch (error) {
            logger.error({ error }, 'Failed to initialize PIGGovernanceService');
            throw error;
        }
    }
    // ===========================================================================
    // Configuration Management
    // ===========================================================================
    /**
     * Get governance configuration for a tenant
     */
    async getConfig(tenantId) {
        await this.ensureInitialized();
        if (this.tenantConfigs.has(tenantId)) {
            return this.tenantConfigs.get(tenantId);
        }
        // Load from database or return default
        const result = (await pg_js_1.pool.query(`SELECT * FROM pig_governance_configs WHERE tenant_id = $1`, [tenantId])) || { rows: [] };
        if (result.rows && result.rows.length > 0) {
            const config = this.parseConfig(result.rows[0].config);
            this.tenantConfigs.set(tenantId, config);
            return config;
        }
        // Return default config
        const defaultConfig = {
            tenantId,
            ...this.config.defaultConfig,
        };
        return defaultConfig;
    }
    /**
     * Update governance configuration for a tenant
     */
    async updateConfig(tenantId, updates, userId) {
        await this.ensureInitialized();
        const currentConfig = await this.getConfig(tenantId);
        const newConfig = {
            ...currentConfig,
            ...updates,
            tenantId,
        };
        // Store in database
        await pg_js_1.pool.query(`INSERT INTO pig_governance_configs (tenant_id, config, updated_at, updated_by)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = $2, updated_at = NOW(), updated_by = $3`, [tenantId, JSON.stringify(newConfig), userId]);
        // Update cache
        this.tenantConfigs.set(tenantId, newConfig);
        // Record governance change
        await this.recordGovernanceEvent(tenantId, 'config_updated', {
            updatedFields: Object.keys(updates),
            userId,
        });
        this.emit('config:updated', { tenantId, config: newConfig });
        return newConfig;
    }
    // ===========================================================================
    // Approval Workflow
    // ===========================================================================
    /**
     * Submit asset for approval
     */
    async submitForApproval(asset, submitterId) {
        await this.ensureInitialized();
        const config = await this.getConfig(asset.tenantId);
        // Check if auto-approve applies
        if (config.approvalWorkflow?.autoApproveTypes?.includes(asset.assetType)) {
            return {
                id: `apr_${Date.now()}_auto`,
                assetId: asset.id,
                tenantId: asset.tenantId,
                status: 'auto_approved',
                submittedBy: submitterId,
                submittedAt: new Date(),
                resolvedAt: new Date(),
                approvals: [],
                requiredApprovals: 0,
            };
        }
        const requestId = `apr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const request = {
            id: requestId,
            assetId: asset.id,
            tenantId: asset.tenantId,
            status: 'pending',
            submittedBy: submitterId,
            submittedAt: new Date(),
            expiresAt: new Date(Date.now() + (config.approvalWorkflow?.timeoutHours || 24) * 60 * 60 * 1000),
            approvals: [],
            requiredApprovals: config.approvalWorkflow?.minApprovers || 1,
        };
        // Store request
        await pg_js_1.pool.query(`INSERT INTO pig_approval_requests (
        id, asset_id, tenant_id, status, submitted_by, submitted_at,
        expires_at, approvals, required_approvals
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            request.id,
            request.assetId,
            request.tenantId,
            request.status,
            request.submittedBy,
            request.submittedAt,
            request.expiresAt,
            JSON.stringify(request.approvals),
            request.requiredApprovals,
        ]);
        // Notify approvers
        await this.notifyApprovers(request, config);
        this.emit('approval:submitted', { request });
        return request;
    }
    /**
     * Approve or reject an asset
     */
    async processApproval(requestId, approverId, decision, comment) {
        await this.ensureInitialized();
        const result = await pg_js_1.pool.query(`SELECT * FROM pig_approval_requests WHERE id = $1`, [requestId]);
        if (result.rows.length === 0) {
            throw new Error(`Approval request not found: ${requestId}`);
        }
        const request = this.mapRowToApprovalRequest(result.rows[0]);
        if (request.status !== 'pending') {
            throw new Error(`Request is no longer pending: ${request.status}`);
        }
        // Add approval/rejection
        const approval = {
            approverId,
            decision,
            comment,
            timestamp: new Date(),
        };
        request.approvals.push(approval);
        // Check if fully approved or rejected
        const approveCount = request.approvals.filter(a => a.decision === 'approve').length;
        const rejectCount = request.approvals.filter(a => a.decision === 'reject').length;
        if (rejectCount > 0) {
            request.status = 'rejected';
            request.resolvedAt = new Date();
        }
        else if (approveCount >= request.requiredApprovals) {
            request.status = 'approved';
            request.resolvedAt = new Date();
            // Record approval latency
            const latency = (request.resolvedAt.getTime() - request.submittedAt.getTime()) / 1000;
            approvalLatency.observe({ asset_type: 'unknown' }, latency);
        }
        // Update request
        await pg_js_1.pool.query(`UPDATE pig_approval_requests
       SET status = $2, approvals = $3, resolved_at = $4
       WHERE id = $1`, [
            requestId,
            request.status,
            JSON.stringify(request.approvals),
            request.resolvedAt,
        ]);
        // Record governance event
        await this.recordGovernanceEvent(request.tenantId, 'approval_processed', {
            requestId,
            decision,
            approverId,
            finalStatus: request.status,
        });
        this.emit(`approval:${request.status}`, { request });
        return request;
    }
    // ===========================================================================
    // Risk Management
    // ===========================================================================
    /**
     * Get current risk assessment
     */
    async getRiskAssessment(tenantId) {
        await this.ensureInitialized();
        // Calculate risk scores from various sources
        const [assetRisk, narrativeRisk, incidentRisk, complianceRisk,] = await Promise.all([
            this.calculateAssetRisk(tenantId),
            this.calculateNarrativeRisk(tenantId),
            this.calculateIncidentRisk(tenantId),
            this.calculateComplianceRisk(tenantId),
        ]);
        const overallScore = Math.round((assetRisk.score * 0.2) +
            (narrativeRisk.score * 0.3) +
            (incidentRisk.score * 0.3) +
            (complianceRisk.score * 0.2));
        const assessment = {
            tenantId,
            assessedAt: new Date(),
            overallScore,
            overallCategory: this.scoreToCategory(overallScore),
            categories: {
                asset: assetRisk,
                narrative: narrativeRisk,
                incident: incidentRisk,
                compliance: complianceRisk,
            },
            recommendations: this.generateRiskRecommendations(assetRisk, narrativeRisk, incidentRisk, complianceRisk),
        };
        // Update metrics
        riskScore.set({ tenant_id: tenantId, risk_category: 'overall' }, overallScore);
        riskScore.set({ tenant_id: tenantId, risk_category: 'asset' }, assetRisk.score);
        riskScore.set({ tenant_id: tenantId, risk_category: 'narrative' }, narrativeRisk.score);
        riskScore.set({ tenant_id: tenantId, risk_category: 'incident' }, incidentRisk.score);
        riskScore.set({ tenant_id: tenantId, risk_category: 'compliance' }, complianceRisk.score);
        return assessment;
    }
    /**
     * Update risk register entry
     */
    async updateRiskRegister(tenantId, riskEntry, userId) {
        await this.ensureInitialized();
        const entryId = riskEntry.id || `risk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await pg_js_1.pool.query(`INSERT INTO pig_risk_register (
        id, tenant_id, category, title, description, likelihood, impact,
        current_controls, residual_risk, treatment_plan, status, owner,
        created_at, updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), $13)
       ON CONFLICT (id)
       DO UPDATE SET
         category = $3, title = $4, description = $5, likelihood = $6, impact = $7,
         current_controls = $8, residual_risk = $9, treatment_plan = $10, status = $11,
         owner = $12, updated_at = NOW(), updated_by = $13`, [
            entryId,
            tenantId,
            riskEntry.category,
            riskEntry.title,
            riskEntry.description,
            riskEntry.likelihood,
            riskEntry.impact,
            JSON.stringify(riskEntry.currentControls),
            riskEntry.residualRisk,
            riskEntry.treatmentPlan,
            riskEntry.status,
            riskEntry.owner,
            userId,
        ]);
        await this.recordGovernanceEvent(tenantId, 'risk_register_updated', {
            entryId,
            category: riskEntry.category,
            status: riskEntry.status,
            userId,
        });
    }
    // ===========================================================================
    // Compliance Tracking
    // ===========================================================================
    /**
     * Get NIST AI RMF compliance status
     */
    async getNISTCompliance(tenantId) {
        await this.ensureInitialized();
        if (!this.config.enableNISTTracking) {
            throw new Error('NIST tracking is not enabled');
        }
        // Get config with NIST settings
        const config = await this.getConfig(tenantId);
        // Evaluate each function area
        const govern = await this.evaluateNISTGovern(tenantId);
        const map = await this.evaluateNISTMap(tenantId);
        const measure = await this.evaluateNISTMeasure(tenantId);
        const manage = await this.evaluateNISTManage(tenantId);
        const overallScore = Math.round((govern.score + map.score + measure.score + manage.score) / 4);
        const status = {
            tenantId,
            assessedAt: new Date(),
            framework: 'NIST AI RMF 1.0',
            overallScore,
            overallMaturity: this.scoreToMaturity(overallScore),
            functions: {
                govern,
                map,
                measure,
                manage,
            },
            gaps: this.identifyNISTGaps(govern, map, measure, manage),
            recommendations: this.generateNISTRecommendations(govern, map, measure, manage),
        };
        // Update compliance score metric
        complianceScore.set({ tenant_id: tenantId, framework: 'nist_rmf' }, overallScore);
        return status;
    }
    /**
     * Get EU DSA systemic risk compliance
     */
    async getDSACompliance(tenantId) {
        await this.ensureInitialized();
        if (!this.config.enableDSATracking) {
            throw new Error('DSA tracking is not enabled');
        }
        // Evaluate DSA Article 34 systemic risk categories
        const riskAssessment = await this.evaluateDSASystemicRisks(tenantId);
        // Evaluate mitigation measures (Article 35)
        const mitigationAssessment = await this.evaluateDSAMitigations(tenantId);
        const overallScore = Math.round((riskAssessment.score + mitigationAssessment.score) / 2);
        const status = {
            tenantId,
            assessedAt: new Date(),
            framework: 'EU DSA',
            overallScore,
            systemicRisks: riskAssessment,
            mitigationMeasures: mitigationAssessment,
            transparencyRequirements: await this.evaluateDSATransparency(tenantId),
            gaps: this.identifyDSAGaps(riskAssessment, mitigationAssessment),
            recommendations: this.generateDSARecommendations(riskAssessment, mitigationAssessment),
        };
        // Update compliance score metric
        complianceScore.set({ tenant_id: tenantId, framework: 'eu_dsa' }, overallScore);
        return status;
    }
    /**
     * Generate compliance report
     */
    async generateComplianceReport(tenantId, options = {}) {
        await this.ensureInitialized();
        const frameworks = options.frameworks || ['nist', 'dsa'];
        const report = {
            tenantId,
            generatedAt: new Date(),
            reportPeriod: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                end: new Date(),
            },
            executiveSummary: '',
            frameworks: {},
            riskAssessment: await this.getRiskAssessment(tenantId),
        };
        // Add framework-specific compliance
        if (frameworks.includes('nist')) {
            report.frameworks.nist = await this.getNISTCompliance(tenantId);
        }
        if (frameworks.includes('dsa')) {
            report.frameworks.dsa = await this.getDSACompliance(tenantId);
        }
        // Add risk register if requested
        if (options.includeRiskRegister) {
            report.riskRegister = await this.getRiskRegister(tenantId);
        }
        // Add audit log summary if requested
        if (options.includeAuditLog) {
            report.auditLogSummary = await this.getAuditLogSummary(tenantId, report.reportPeriod);
        }
        // Generate executive summary
        report.executiveSummary = this.generateExecutiveSummary(report);
        // Export in requested format
        switch (options.format) {
            case 'pdf':
                return this.generatePDFReport(report);
            case 'html':
                return this.generateHTMLReport(report);
            default:
                return Buffer.from(JSON.stringify(report, null, 2));
        }
    }
    // ===========================================================================
    // Audit Integration
    // ===========================================================================
    /**
     * Record a governance event
     */
    async recordGovernanceEvent(tenantId, eventType, data) {
        // Record to provenance ledger
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            timestamp: new Date(),
            actionType: `GOVERNANCE_${eventType.toUpperCase()}`,
            resourceType: 'PIGGovernance',
            resourceId: tenantId,
            actorId: data.userId || 'system',
            actorType: data.userId ? 'user' : 'system',
            payload: {
                mutationType: 'UPDATE',
                entityId: tenantId,
                entityType: 'PIGGovernance',
                newState: {
                    id: tenantId,
                    type: 'PIGGovernance',
                    version: 1,
                    data,
                    metadata: {},
                },
            },
            metadata: {
                purpose: 'governance-tracking',
                eventType,
            },
        });
        // Record to audit system
        index_js_1.advancedAuditSystem.logEvent?.({
            eventType: 'governance_event',
            action: eventType,
            tenantId,
            userId: data.userId || 'system',
            resourceId: tenantId,
            resourceType: 'PIGGovernance',
            message: `Governance event: ${eventType}`,
            details: data,
            level: 'info',
            complianceRelevant: true,
        });
        // Update metrics
        governanceEventsTotal.inc({
            tenant_id: tenantId,
            event_type: eventType,
            outcome: 'success',
        });
    }
    // ===========================================================================
    // Private Methods
    // ===========================================================================
    /**
     * Load tenant configurations from database
     */
    async loadTenantConfigs() {
        const result = (await pg_js_1.pool.query(`SELECT * FROM pig_governance_configs`)) || { rows: [] };
        for (const row of result.rows || []) {
            const config = this.parseConfig(row.config);
            this.tenantConfigs.set(row.tenant_id, config);
        }
        logger.info({ count: result.rows.length }, 'Loaded tenant governance configs');
    }
    /**
     * Parse config from database
     */
    parseConfig(config) {
        if (typeof config === 'string') {
            return JSON.parse(config);
        }
        return config;
    }
    /**
     * Start background risk register updates
     */
    startRiskRegisterUpdates() {
        if (this.config.riskRegisterUpdateFrequency === 'realtime') {
            return; // Updates happen on events
        }
        const intervalMs = this.config.riskRegisterUpdateFrequency === 'hourly'
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;
        setInterval(() => {
            this.updateAllRiskRegisters().catch(error => {
                logger.error({ error }, 'Failed to update risk registers');
            });
        }, intervalMs);
    }
    /**
     * Start compliance report generation schedule
     */
    startComplianceReportGeneration() {
        // Reports generated on-demand in this implementation
    }
    /**
     * Update all tenant risk registers
     */
    async updateAllRiskRegisters() {
        for (const tenantId of this.tenantConfigs.keys()) {
            try {
                await this.getRiskAssessment(tenantId);
            }
            catch (error) {
                logger.error({ error, tenantId }, 'Failed to update risk assessment');
            }
        }
    }
    /**
     * Calculate asset-related risk
     */
    async calculateAssetRisk(tenantId) {
        const result = await pg_js_1.pool.query(`SELECT
        COUNT(*) FILTER (WHERE status = 'revoked') as revoked_count,
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count
       FROM signed_assets WHERE tenant_id = $1`, [tenantId]);
        const { revoked_count = 0, published_count = 0, expired_count = 0 } = result.rows[0] || {};
        // Higher score = higher risk
        const revokedRatio = published_count > 0 ? revoked_count / published_count : 0;
        const expiredRatio = published_count > 0 ? expired_count / published_count : 0;
        const score = Math.min(100, Math.round((revokedRatio * 50) + (expiredRatio * 30)));
        return {
            score,
            category: this.scoreToCategory(score),
            factors: [
                { name: 'Revoked assets ratio', value: revokedRatio, weight: 0.5 },
                { name: 'Expired assets ratio', value: expiredRatio, weight: 0.3 },
            ],
        };
    }
    /**
     * Calculate narrative-related risk
     */
    async calculateNarrativeRisk(tenantId) {
        const result = await pg_js_1.pool.query(`SELECT
        COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        MAX(risk_score) as max_risk
       FROM pig_narrative_clusters WHERE tenant_id = $1`, [tenantId]);
        const { high_risk_count = 0, active_count = 0, max_risk = 0 } = result.rows[0] || {};
        const score = Math.min(100, Math.max(max_risk || 0, Math.round((high_risk_count / Math.max(1, active_count)) * 100)));
        return {
            score,
            category: this.scoreToCategory(score),
            factors: [
                { name: 'Active high-risk narratives', value: high_risk_count, weight: 0.6 },
                { name: 'Maximum narrative risk', value: max_risk || 0, weight: 0.4 },
            ],
        };
    }
    /**
     * Calculate incident-related risk
     */
    async calculateIncidentRisk(tenantId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await pg_js_1.pool.query(`SELECT
        COUNT(*) FILTER (WHERE incident->>'severity' = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE incident->>'severity' = 'high') as high_count,
        COUNT(*) as total_count
       FROM truth_bundles
       WHERE tenant_id = $1 AND created_at >= $2`, [tenantId, thirtyDaysAgo]);
        const { critical_count = 0, high_count = 0, total_count = 0 } = result.rows[0] || {};
        const score = Math.min(100, Math.round((critical_count * 30) + (high_count * 15) + (total_count * 5)));
        return {
            score,
            category: this.scoreToCategory(score),
            factors: [
                { name: 'Critical incidents (30d)', value: critical_count, weight: 0.5 },
                { name: 'High severity incidents (30d)', value: high_count, weight: 0.3 },
                { name: 'Total incidents (30d)', value: total_count, weight: 0.2 },
            ],
        };
    }
    /**
     * Calculate compliance-related risk
     */
    async calculateComplianceRisk(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 0;
        // Check configuration gaps
        if (!config.requireOutboundSigning)
            score += 20;
        if (!config.requireInboundVerification)
            score += 15;
        if (!config.approvalWorkflow?.enabled)
            score += 15;
        if (!config.impersonationMonitoring?.enabled)
            score += 10;
        if (config.auditRetentionDays < 365)
            score += 10;
        return {
            score,
            category: this.scoreToCategory(score),
            factors: [
                { name: 'Signing enabled', value: config.requireOutboundSigning ? 1 : 0, weight: 0.2 },
                { name: 'Verification enabled', value: config.requireInboundVerification ? 1 : 0, weight: 0.15 },
                { name: 'Approval workflow', value: config.approvalWorkflow?.enabled ? 1 : 0, weight: 0.15 },
                { name: 'Monitoring enabled', value: config.impersonationMonitoring?.enabled ? 1 : 0, weight: 0.1 },
            ],
        };
    }
    /**
     * Score to category mapping
     */
    scoreToCategory(score) {
        if (score >= 75)
            return 'critical';
        if (score >= 50)
            return 'high';
        if (score >= 25)
            return 'medium';
        return 'low';
    }
    /**
     * Score to maturity level
     */
    scoreToMaturity(score) {
        if (score >= 90)
            return 'optimizing';
        if (score >= 70)
            return 'managed';
        if (score >= 50)
            return 'defined';
        if (score >= 30)
            return 'developing';
        return 'initial';
    }
    /**
     * Generate risk recommendations
     */
    generateRiskRecommendations(assetRisk, narrativeRisk, incidentRisk, complianceRisk) {
        const recommendations = [];
        if (assetRisk.score > 50) {
            recommendations.push('Review and clean up revoked/expired assets');
        }
        if (narrativeRisk.score > 50) {
            recommendations.push('Escalate high-risk narrative clusters for response');
        }
        if (incidentRisk.score > 50) {
            recommendations.push('Conduct incident response readiness review');
        }
        if (complianceRisk.score > 30) {
            recommendations.push('Review and strengthen governance configuration');
        }
        return recommendations;
    }
    /**
     * Evaluate NIST Govern function
     */
    async evaluateNISTGovern(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 0;
        // Check governance policies
        if (config.approvalWorkflow?.enabled)
            score += 20;
        if (config.revocationPolicy?.requireExplanation)
            score += 15;
        if (config.auditRetentionDays >= 365 * 3)
            score += 15;
        if (config.nistRmfAlignment)
            score += 25;
        // Check roles and responsibilities (simplified)
        if (config.approvalWorkflow?.approverRoles?.length)
            score += 15;
        return {
            function: 'GOVERN',
            score: Math.min(100, score),
            subcategories: [
                { id: 'GV-1', name: 'Policies and Procedures', score: score },
                { id: 'GV-2', name: 'Roles and Responsibilities', score: score },
            ],
        };
    }
    /**
     * Evaluate NIST Map function
     */
    async evaluateNISTMap(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 50; // Base score for having the system
        if (config.impersonationMonitoring?.enabled)
            score += 20;
        if (config.impersonationMonitoring?.monitoredPersons?.length)
            score += 15;
        return {
            function: 'MAP',
            score: Math.min(100, score),
            subcategories: [
                { id: 'MP-1', name: 'Context and Use Case', score: score },
                { id: 'MP-2', name: 'Stakeholder Impact', score: score },
            ],
        };
    }
    /**
     * Evaluate NIST Measure function
     */
    async evaluateNISTMeasure(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 40;
        if (config.deepfakeThresholds)
            score += 20;
        if (config.nistRmfAlignment?.measurementFrequency)
            score += 20;
        return {
            function: 'MEASURE',
            score: Math.min(100, score),
            subcategories: [
                { id: 'MS-1', name: 'Metrics', score: score },
                { id: 'MS-2', name: 'Thresholds', score: score },
            ],
        };
    }
    /**
     * Evaluate NIST Manage function
     */
    async evaluateNISTManage(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 50;
        if (config.revocationPolicy?.autoPropagateRevocations)
            score += 25;
        if (config.impersonationMonitoring?.notifications?.email)
            score += 15;
        return {
            function: 'MANAGE',
            score: Math.min(100, score),
            subcategories: [
                { id: 'MG-1', name: 'Risk Treatment', score: score },
                { id: 'MG-2', name: 'Incident Response', score: score },
            ],
        };
    }
    /**
     * Identify NIST gaps
     */
    identifyNISTGaps(govern, map, measure, manage) {
        const gaps = [];
        if (govern.score < 70)
            gaps.push('Strengthen governance policies and procedures');
        if (map.score < 70)
            gaps.push('Improve AI system context mapping and stakeholder analysis');
        if (measure.score < 70)
            gaps.push('Enhance measurement and monitoring capabilities');
        if (manage.score < 70)
            gaps.push('Improve risk treatment and incident response processes');
        return gaps;
    }
    /**
     * Generate NIST recommendations
     */
    generateNISTRecommendations(govern, map, measure, manage) {
        return this.identifyNISTGaps(govern, map, measure, manage);
    }
    /**
     * Evaluate DSA systemic risks
     */
    async evaluateDSASystemicRisks(tenantId) {
        const identifiedRisks = [];
        let score = 80; // Start with good score, reduce for issues
        // Would analyze actual content and narratives for systemic risks
        return {
            score,
            identifiedRisks,
            mitigationsApplied: [],
        };
    }
    /**
     * Evaluate DSA mitigations
     */
    async evaluateDSAMitigations(tenantId) {
        const config = await this.getConfig(tenantId);
        let score = 50;
        if (config.requireInboundVerification)
            score += 20;
        if (config.impersonationMonitoring?.enabled)
            score += 20;
        return {
            score,
            mitigations: [
                { measure: 'Content verification', implemented: config.requireInboundVerification },
                { measure: 'Impersonation monitoring', implemented: config.impersonationMonitoring?.enabled || false },
            ],
        };
    }
    /**
     * Evaluate DSA transparency
     */
    async evaluateDSATransparency(tenantId) {
        const config = await this.getConfig(tenantId);
        return {
            contentModerationReporting: config.auditRetentionDays >= 365,
            algorithmicTransparency: true,
            termsOfServiceClarity: true,
        };
    }
    /**
     * Identify DSA gaps
     */
    identifyDSAGaps(riskAssessment, mitigationAssessment) {
        const gaps = [];
        if (riskAssessment.score < 70) {
            gaps.push('Improve systemic risk identification and assessment');
        }
        if (mitigationAssessment.score < 70) {
            gaps.push('Implement additional mitigation measures per DSA Article 35');
        }
        return gaps;
    }
    /**
     * Generate DSA recommendations
     */
    generateDSARecommendations(riskAssessment, mitigationAssessment) {
        return this.identifyDSAGaps(riskAssessment, mitigationAssessment);
    }
    /**
     * Get risk register for tenant
     */
    async getRiskRegister(tenantId) {
        const result = await pg_js_1.pool.query(`SELECT * FROM pig_risk_register WHERE tenant_id = $1 ORDER BY residual_risk DESC`, [tenantId]);
        return result.rows.map((row) => ({
            id: row.id,
            category: row.category,
            title: row.title,
            description: row.description,
            likelihood: row.likelihood,
            impact: row.impact,
            currentControls: this.parseJSON(row.current_controls),
            residualRisk: row.residual_risk,
            treatmentPlan: row.treatment_plan,
            status: row.status,
            owner: row.owner,
        }));
    }
    /**
     * Get audit log summary
     */
    async getAuditLogSummary(tenantId, period) {
        const result = await pg_js_1.pool.query(`SELECT action_type, COUNT(*) as count
       FROM provenance_ledger_v2
       WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
       GROUP BY action_type`, [tenantId, period.start, period.end]);
        return {
            totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
            eventsByType: result.rows.reduce((acc, row) => {
                acc[row.action_type] = parseInt(row.count);
                return acc;
            }, {}),
        };
    }
    /**
     * Generate executive summary for report
     */
    generateExecutiveSummary(report) {
        const riskLevel = report.riskAssessment.overallCategory;
        return `This compliance report covers the period from ${report.reportPeriod.start.toISOString().split('T')[0]} to ${report.reportPeriod.end.toISOString().split('T')[0]}.

Overall Risk Level: ${riskLevel.toUpperCase()}
Overall Risk Score: ${report.riskAssessment.overallScore}/100

${Object.entries(report.frameworks).map(([name, status]) => `${name.toUpperCase()} Compliance Score: ${status.overallScore}/100`).join('\n')}

Key Recommendations:
${report.riskAssessment.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    }
    /**
     * Generate PDF report (placeholder)
     */
    async generatePDFReport(report) {
        // Would use PDFKit or similar
        return Buffer.from(JSON.stringify(report, null, 2));
    }
    /**
     * Generate HTML report
     */
    async generateHTMLReport(report) {
        const html = `<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report - ${report.tenantId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; }
    .score { font-size: 2em; font-weight: bold; }
    .low { color: #28a745; }
    .medium { color: #ffc107; }
    .high { color: #fd7e14; }
    .critical { color: #dc3545; }
    .section { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Compliance Report</h1>
  <p>Tenant: ${report.tenantId}</p>
  <p>Generated: ${report.generatedAt.toISOString()}</p>
  <p>Period: ${report.reportPeriod.start.toISOString().split('T')[0]} to ${report.reportPeriod.end.toISOString().split('T')[0]}</p>

  <div class="section">
    <h2>Executive Summary</h2>
    <pre>${report.executiveSummary}</pre>
  </div>

  <div class="section">
    <h2>Risk Assessment</h2>
    <p class="score ${report.riskAssessment.overallCategory}">${report.riskAssessment.overallScore}/100</p>
    <p>Category: ${report.riskAssessment.overallCategory.toUpperCase()}</p>
  </div>

  ${Object.entries(report.frameworks).map(([name, status]) => `
  <div class="section">
    <h2>${name.toUpperCase()} Compliance</h2>
    <p class="score">${status.overallScore}/100</p>
    <h3>Gaps</h3>
    <ul>
      ${status.gaps.map((g) => `<li>${g}</li>`).join('')}
    </ul>
    <h3>Recommendations</h3>
    <ul>
      ${status.recommendations.map((r) => `<li>${r}</li>`).join('')}
    </ul>
  </div>
  `).join('')}
</body>
</html>`;
        return Buffer.from(html);
    }
    /**
     * Parse JSON safely
     */
    parseJSON(value) {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return value;
            }
        }
        return value;
    }
    /**
     * Map database row to ApprovalRequest
     */
    mapRowToApprovalRequest(row) {
        return {
            id: row.id,
            assetId: row.asset_id,
            tenantId: row.tenant_id,
            status: row.status,
            submittedBy: row.submitted_by,
            submittedAt: row.submitted_at,
            expiresAt: row.expires_at,
            resolvedAt: row.resolved_at,
            approvals: this.parseJSON(row.approvals),
            requiredApprovals: row.required_approvals,
        };
    }
    /**
     * Notify approvers
     */
    async notifyApprovers(request, config) {
        // Would send notifications via email, Slack, etc.
        logger.info({
            requestId: request.id,
            approverRoles: config.approvalWorkflow?.approverRoles,
        }, 'Notifying approvers');
    }
    /**
     * Ensure service is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
exports.PIGGovernanceService = PIGGovernanceService;
// Export default instance
exports.pigGovernanceService = new PIGGovernanceService();
