"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceCollector = exports.EvidenceCollector = void 0;
// @ts-nocheck
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const Compliance_js_1 = require("./types/Compliance.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ContinuousControls_js_1 = require("./ContinuousControls.js");
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'evidence-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'EvidenceCollector',
    };
}
// ============================================================================
// Evidence Collector Implementation
// ============================================================================
class EvidenceCollector {
    evidence = new Map();
    collectionTasks = new Map();
    controlsService;
    constructor() {
        this.controlsService = new ContinuousControls_js_1.ContinuousControlsService();
        logger_js_1.default.info('Evidence collector initialized');
    }
    // --------------------------------------------------------------------------
    // Evidence Bundle Generation (New for GA)
    // --------------------------------------------------------------------------
    async collectBundle(tenantId) {
        const bundleId = `bundle-${(0, uuid_1.v4)()}`;
        const timestamp = new Date().toISOString();
        const gitCommit = process.env.GIT_COMMIT || 'dev-snapshot';
        // Collect checks from ContinuousControls
        const checkResults = await this.controlsService.checkControls();
        // Collect mock SBOM location
        const sbomLocation = 's3://artifacts/sbom/latest.json';
        // Mock active policies
        const activePolicies = ['POLICY-001-AUTH', 'POLICY-002-ENCRYPTION'];
        const bundleContent = {
            bundleId,
            timestamp,
            gitCommit,
            checks: checkResults,
            sbom: { location: sbomLocation, verified: true },
            policies: activePolicies,
            certification: "SOC2_TYPE2_READINESS"
        };
        // Store as evidence
        await this.collectEvidence('BUNDLE-001', Compliance_js_1.ComplianceFramework.SOC2, Compliance_js_1.EvidenceType.ATTESTATION, // Using available enum value
        tenantId, 'EvidenceCollector', bundleContent, 'system');
        return (0, data_envelope_js_1.createDataEnvelope)(bundleContent, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Bundle generated'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL
        });
    }
    // --------------------------------------------------------------------------
    // Evidence Collection
    // --------------------------------------------------------------------------
    async collectEvidence(controlId, framework, type, tenantId, source, content, actorId, metadata) {
        const evidenceContent = {
            format: typeof content === 'string' ? 'text' : 'json',
            data: content,
            size: JSON.stringify(content).length,
        };
        const evidence = {
            id: (0, uuid_1.v4)(),
            type,
            controlId,
            framework,
            tenantId,
            title: `${type} evidence for ${controlId}`,
            source,
            content: evidenceContent,
            status: 'collected',
            collectedAt: new Date().toISOString(),
            collectedBy: actorId,
            expiresAt: this.calculateExpiry(type),
            metadata,
            hash: this.hashContent(content),
        };
        this.evidence.set(evidence.id, evidence);
        logger_js_1.default.info({ evidenceId: evidence.id, controlId, framework, type }, 'Evidence collected');
        return (0, data_envelope_js_1.createDataEnvelope)(evidence, {
            source: 'EvidenceCollector',
            actor: actorId,
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Evidence collected'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    async collectSystemEvidence(controlId, framework, tenantId, collectorFn) {
        try {
            const content = await collectorFn();
            return this.collectEvidence(controlId, framework, 'system_config', // Assuming this string maps to EvidenceType enum or is compatible
            tenantId, 'system-collector', content, 'system', { automated: true });
        }
        catch (error) {
            logger_js_1.default.error({ error, controlId }, 'Failed to collect system evidence');
            throw error;
        }
    }
    // --------------------------------------------------------------------------
    // Evidence Management
    // --------------------------------------------------------------------------
    getEvidence(tenantId, filters) {
        let evidenceList = Array.from(this.evidence.values()).filter((e) => e.tenantId === tenantId);
        if (filters?.controlId) {
            evidenceList = evidenceList.filter((e) => e.controlId === filters.controlId);
        }
        if (filters?.framework) {
            evidenceList = evidenceList.filter((e) => e.framework === filters.framework);
        }
        if (filters?.type) {
            evidenceList = evidenceList.filter((e) => e.type === filters.type);
        }
        if (filters?.status) {
            evidenceList = evidenceList.filter((e) => e.status === filters.status);
        }
        // Check for stale evidence
        evidenceList = evidenceList.map((e) => {
            if (e.expiresAt && new Date(e.expiresAt) < new Date() && e.status === 'collected') {
                e.status = 'stale';
            }
            return e;
        });
        return (0, data_envelope_js_1.createDataEnvelope)(evidenceList, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Evidence listing allowed'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    getEvidenceById(evidenceId) {
        const evidence = this.evidence.get(evidenceId) || null;
        return (0, data_envelope_js_1.createDataEnvelope)(evidence, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Evidence retrieval allowed'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    verifyEvidence(evidenceId) {
        const evidence = this.evidence.get(evidenceId);
        if (!evidence) {
            return (0, data_envelope_js_1.createDataEnvelope)({ valid: false, message: 'Evidence not found' }, {
                source: 'EvidenceCollector',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Evidence not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Verify hash
        const currentHash = this.hashContent(evidence.content.data);
        const valid = currentHash === evidence.hash;
        return (0, data_envelope_js_1.createDataEnvelope)({
            valid,
            message: valid ? 'Evidence integrity verified' : 'Evidence integrity check failed',
        }, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(valid ? data_envelope_js_1.GovernanceResult.ALLOW : data_envelope_js_1.GovernanceResult.FLAG, valid ? 'Evidence integrity verified' : 'Evidence integrity check failed'),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    // --------------------------------------------------------------------------
    // Evidence Status
    // --------------------------------------------------------------------------
    getEvidenceStatus(tenantId, framework) {
        const evidenceList = this.getEvidence(tenantId, { framework }).data;
        const status = {
            total: evidenceList.length,
            collected: evidenceList.filter((e) => e.status === 'collected').length,
            pending: evidenceList.filter((e) => e.status === 'pending').length,
            stale: evidenceList.filter((e) => e.status === 'stale').length,
            missing: evidenceList.filter((e) => e.status === 'missing').length,
            coveragePercentage: 0,
        };
        if (status.total > 0) {
            status.coveragePercentage = Math.round((status.collected / status.total) * 100);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(status, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Evidence status retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Collection Tasks
    // --------------------------------------------------------------------------
    createCollectionTask(task) {
        const collectionTask = {
            id: (0, uuid_1.v4)(),
            ...task,
            status: 'active',
            failureCount: 0,
        };
        this.collectionTasks.set(collectionTask.id, collectionTask);
        logger_js_1.default.info({ taskId: collectionTask.id, controlId: task.controlId }, 'Collection task created');
        return (0, data_envelope_js_1.createDataEnvelope)(collectionTask, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Collection task created'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    getCollectionTasks(tenantId, framework) {
        let tasks = Array.from(this.collectionTasks.values()).filter((t) => t.tenantId === tenantId);
        if (framework) {
            tasks = tasks.filter((t) => t.framework === framework);
        }
        return (0, data_envelope_js_1.createDataEnvelope)(tasks, {
            source: 'EvidenceCollector',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Collection tasks listed'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    calculateExpiry(type) {
        const expiryDays = {
            system_config: 7,
            access_log: 30,
            audit_trail: 90,
            policy_document: 365,
            screenshot: 30,
            test_result: 90,
            attestation: 365,
            scan_report: 30,
            metric: 7,
            custom: 90,
        };
        const days = expiryDays[type] || 90;
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    hashContent(content) {
        const str = typeof content === 'string' ? content : JSON.stringify(content);
        return crypto_1.default.createHash('sha256').update(str).digest('hex');
    }
}
exports.EvidenceCollector = EvidenceCollector;
// Export singleton
exports.evidenceCollector = new EvidenceCollector();
exports.default = EvidenceCollector;
