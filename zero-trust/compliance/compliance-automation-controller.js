"use strict";
/**
 * Compliance Automation Controller
 *
 * Automated compliance assessment, evidence collection, and reporting
 * for NIST 800-207 and FedRAMP frameworks.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAutomationController = void 0;
exports.createComplianceAutomationController = createComplianceAutomationController;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
// Configuration
const config = {
    assessmentSchedule: '0 2 * * *', // Daily at 2 AM
    evidenceRetention: 365, // days
    reportRetention: 7, // years
    alertThresholds: {
        critical: 0,
        high: 3,
        medium: 10,
    },
};
/**
 * Evidence Collector
 * Collects and stores compliance evidence
 */
class EvidenceCollector {
    evidence = new Map();
    async collectEvidence(controlId, requirement) {
        console.log(`[EvidenceCollector] Collecting evidence for ${controlId}: ${requirement.description}`);
        let content;
        switch (requirement.type) {
            case 'automated':
                content = await this.collectAutomatedEvidence(requirement);
                break;
            case 'manual':
                content = `Manual evidence required: ${requirement.description}`;
                break;
            default:
                content = 'Unknown evidence type';
        }
        const evidence = {
            id: crypto.randomUUID(),
            controlId,
            type: this.determineEvidenceType(requirement),
            source: requirement.source,
            collectedAt: new Date(),
            hash: this.computeHash(content),
            content,
            metadata: {
                requirement: requirement.description,
                automated: requirement.type === 'automated',
            },
        };
        // Store evidence
        const existing = this.evidence.get(controlId) || [];
        existing.push(evidence);
        this.evidence.set(controlId, existing);
        return evidence;
    }
    async collectAutomatedEvidence(requirement) {
        // Simulate evidence collection from various sources
        const source = requirement.source.toLowerCase();
        if (source.includes('prometheus') || source.includes('metric')) {
            return this.collectMetricEvidence(requirement.query || '');
        }
        else if (source.includes('kubernetes') || source.includes('k8s')) {
            return this.collectKubernetesEvidence(requirement.query || '');
        }
        else if (source.includes('spire')) {
            return this.collectSpireEvidence(requirement.query || '');
        }
        else if (source.includes('opa')) {
            return this.collectOPAEvidence(requirement.query || '');
        }
        else if (source.includes('audit') || source.includes('log')) {
            return this.collectAuditEvidence(requirement.query || '');
        }
        return JSON.stringify({
            source: requirement.source,
            collectedAt: new Date().toISOString(),
            data: 'Evidence collected successfully',
        });
    }
    async collectMetricEvidence(query) {
        // Simulate Prometheus query
        return JSON.stringify({
            query,
            result: [
                {
                    metric: { __name__: query.split('{')[0] },
                    value: [Date.now() / 1000, '99.99'],
                },
            ],
            status: 'success',
        });
    }
    async collectKubernetesEvidence(resource) {
        // Simulate Kubernetes API response
        return JSON.stringify({
            apiVersion: 'v1',
            kind: 'List',
            items: [
                {
                    kind: resource,
                    metadata: { name: 'example' },
                    spec: { /* configuration */},
                },
            ],
        });
    }
    async collectSpireEvidence(query) {
        return JSON.stringify({
            entries: [
                {
                    id: 'example-entry',
                    spiffeId: 'spiffe://cluster.local/ns/default/sa/example',
                    parentId: 'spiffe://cluster.local/spire/agent/k8s_psat/node1',
                    selectors: [{ type: 'k8s', value: 'ns:default' }],
                },
            ],
            count: 1,
        });
    }
    async collectOPAEvidence(policy) {
        return JSON.stringify({
            policy,
            result: {
                allow: true,
                violations: [],
            },
            decisionId: crypto.randomUUID(),
        });
    }
    async collectAuditEvidence(query) {
        return JSON.stringify({
            query,
            totalRecords: 1000,
            sampleRecords: [
                {
                    timestamp: new Date().toISOString(),
                    action: 'access',
                    outcome: 'success',
                    identity: 'spiffe://cluster.local/ns/default/sa/api',
                },
            ],
        });
    }
    determineEvidenceType(requirement) {
        const source = requirement.source.toLowerCase();
        if (source.includes('metric') || source.includes('prometheus')) {
            return 'metric';
        }
        else if (source.includes('config') || source.includes('kubernetes')) {
            return 'config';
        }
        else if (source.includes('log') || source.includes('audit')) {
            return 'log';
        }
        return 'document';
    }
    computeHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    getEvidence(controlId) {
        return this.evidence.get(controlId) || [];
    }
    getAllEvidence() {
        return new Map(this.evidence);
    }
}
/**
 * Control Validator
 * Validates controls against defined criteria
 */
class ControlValidator {
    async validateControl(control, evidence) {
        const validationResults = [];
        for (const validation of control.validations) {
            const result = await this.runValidation(validation, evidence);
            validationResults.push(result);
        }
        const passCount = validationResults.filter((r) => r.status === 'pass').length;
        const totalCount = validationResults.length;
        const score = totalCount > 0 ? (passCount / totalCount) * 100 : 100;
        let status;
        if (score === 100) {
            status = 'pass';
        }
        else if (score >= 80) {
            status = 'partial';
        }
        else if (score > 0) {
            status = 'partial';
        }
        else {
            status = 'fail';
        }
        return {
            controlId: control.id,
            status,
            score,
            validationResults,
            evidence,
        };
    }
    async runValidation(validation, evidence) {
        console.log(`[ControlValidator] Running validation: ${validation.id}`);
        // Find relevant evidence
        const relevantEvidence = evidence.find((e) => e.content.includes(validation.query) || e.source.includes(validation.type));
        if (!relevantEvidence) {
            return {
                validationId: validation.id,
                status: 'fail',
                actualValue: null,
                expectedValue: validation.threshold,
                message: 'No evidence found for validation',
            };
        }
        // Simulate validation check
        const actualValue = this.extractValue(relevantEvidence, validation);
        const passed = this.compareValues(actualValue, validation.threshold, validation.operator);
        return {
            validationId: validation.id,
            status: passed ? 'pass' : 'fail',
            actualValue,
            expectedValue: validation.threshold,
            message: passed
                ? 'Validation passed'
                : `Expected ${validation.operator} ${validation.threshold}, got ${actualValue}`,
        };
    }
    extractValue(evidence, validation) {
        try {
            const data = JSON.parse(evidence.content);
            if (validation.type === 'metric' && data.result?.[0]?.value) {
                return parseFloat(data.result[0].value[1]);
            }
            return data;
        }
        catch {
            return evidence.content;
        }
    }
    compareValues(actual, expected, operator) {
        const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));
        const expectedNum = typeof expected === 'number' ? expected : parseFloat(String(expected));
        if (isNaN(actualNum) || isNaN(expectedNum)) {
            return actual === expected;
        }
        switch (operator) {
            case 'eq':
                return actualNum === expectedNum;
            case 'neq':
                return actualNum !== expectedNum;
            case 'gt':
                return actualNum > expectedNum;
            case 'gte':
                return actualNum >= expectedNum;
            case 'lt':
                return actualNum < expectedNum;
            case 'lte':
                return actualNum <= expectedNum;
            default:
                return false;
        }
    }
}
/**
 * Finding Manager
 * Manages compliance findings and POA&M
 */
class FindingManager {
    findings = new Map();
    poamEntries = new Map();
    createFinding(controlId, validationResult, severity) {
        const finding = {
            id: crypto.randomUUID(),
            controlId,
            severity,
            title: `${controlId}: Validation Failed`,
            description: validationResult.message,
            remediation: this.generateRemediation(controlId, validationResult),
            dueDate: this.calculateDueDate(severity),
            status: 'open',
        };
        this.findings.set(finding.id, finding);
        // Auto-create POA&M entry for high/critical findings
        if (severity === 'critical' || severity === 'high') {
            this.createPOAMEntry(finding);
        }
        return finding;
    }
    generateRemediation(controlId, validationResult) {
        return `Review ${controlId} implementation. Current value: ${validationResult.actualValue}. ` +
            `Expected: ${validationResult.expectedValue}. Update configuration to meet compliance requirements.`;
    }
    calculateDueDate(severity) {
        const daysToAdd = {
            critical: 7,
            high: 30,
            medium: 90,
            low: 180,
        };
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd[severity]);
        return date;
    }
    createPOAMEntry(finding) {
        const entry = {
            id: crypto.randomUUID(),
            findingId: finding.id,
            controlId: finding.controlId,
            weakness: finding.description,
            severity: finding.severity,
            scheduledCompletionDate: finding.dueDate || new Date(),
            milestones: [
                {
                    id: crypto.randomUUID(),
                    description: 'Investigate root cause',
                    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                },
                {
                    id: crypto.randomUUID(),
                    description: 'Implement remediation',
                    targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                },
                {
                    id: crypto.randomUUID(),
                    description: 'Verify fix and close',
                    targetDate: finding.dueDate || new Date(),
                    status: 'pending',
                },
            ],
            status: 'open',
            responsibleParty: 'Security Team',
        };
        this.poamEntries.set(entry.id, entry);
        return entry;
    }
    getOpenFindings() {
        return Array.from(this.findings.values()).filter((f) => f.status === 'open' || f.status === 'in-progress');
    }
    getFindingsBySeverity(severity) {
        return Array.from(this.findings.values()).filter((f) => f.severity === severity);
    }
    getPOAMEntries() {
        return Array.from(this.poamEntries.values());
    }
    updateFindingStatus(findingId, status) {
        const finding = this.findings.get(findingId);
        if (finding) {
            finding.status = status;
        }
    }
}
/**
 * Report Generator
 * Generates compliance reports in various formats
 */
class ReportGenerator {
    generateReport(framework, assessmentResults) {
        const summary = this.calculateSummary(assessmentResults);
        const report = {
            id: crypto.randomUUID(),
            frameworkId: framework.id,
            generatedAt: new Date(),
            period: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                end: new Date(),
            },
            assessmentResults,
            summary,
        };
        return report;
    }
    calculateSummary(results) {
        const latestResult = results[results.length - 1];
        if (!latestResult) {
            return {
                overallScore: 0,
                controlsPassed: 0,
                controlsFailed: 0,
                controlsPartial: 0,
                findingsOpen: 0,
                findingsClosed: 0,
                trendDirection: 'stable',
            };
        }
        const controlResults = latestResult.controlResults;
        return {
            overallScore: latestResult.overallScore,
            controlsPassed: controlResults.filter((c) => c.status === 'pass').length,
            controlsFailed: controlResults.filter((c) => c.status === 'fail').length,
            controlsPartial: controlResults.filter((c) => c.status === 'partial').length,
            findingsOpen: latestResult.findings.filter((f) => f.status === 'open' || f.status === 'in-progress').length,
            findingsClosed: latestResult.findings.filter((f) => f.status === 'closed')
                .length,
            trendDirection: this.calculateTrend(results),
        };
    }
    calculateTrend(results) {
        if (results.length < 2)
            return 'stable';
        const recent = results.slice(-5);
        const scores = recent.map((r) => r.overallScore);
        const trend = scores[scores.length - 1] - scores[0];
        if (trend > 5)
            return 'improving';
        if (trend < -5)
            return 'degrading';
        return 'stable';
    }
    signReport(report, signerId) {
        const content = JSON.stringify({
            id: report.id,
            frameworkId: report.frameworkId,
            generatedAt: report.generatedAt,
            summary: report.summary,
        });
        report.signature = {
            signerId,
            algorithm: 'ECDSA-P256-SHA256',
            signature: crypto.createHash('sha256').update(content).digest('hex'),
            timestamp: new Date(),
        };
    }
    exportToOSCAL(report) {
        // Generate OSCAL-compliant JSON
        const oscal = {
            'assessment-results': {
                uuid: report.id,
                metadata: {
                    title: `${report.frameworkId} Assessment Results`,
                    'last-modified': report.generatedAt.toISOString(),
                    version: '1.0.0',
                    'oscal-version': '1.0.4',
                },
                'import-ap': {
                    href: `#${report.frameworkId}`,
                },
                results: report.assessmentResults.map((result) => ({
                    uuid: result.id,
                    title: 'Automated Assessment',
                    start: report.period.start.toISOString(),
                    end: report.period.end.toISOString(),
                    findings: result.findings.map((f) => ({
                        uuid: f.id,
                        title: f.title,
                        description: f.description,
                        'target-id': f.controlId,
                        'implementation-status': {
                            state: f.status,
                        },
                    })),
                })),
            },
        };
        return JSON.stringify(oscal, null, 2);
    }
}
/**
 * Compliance Automation Controller
 * Main controller orchestrating compliance automation
 */
class ComplianceAutomationController extends events_1.EventEmitter {
    evidenceCollector;
    controlValidator;
    findingManager;
    reportGenerator;
    frameworks = new Map();
    assessmentHistory = new Map();
    running = false;
    assessmentInterval;
    constructor() {
        super();
        this.evidenceCollector = new EvidenceCollector();
        this.controlValidator = new ControlValidator();
        this.findingManager = new FindingManager();
        this.reportGenerator = new ReportGenerator();
    }
    /**
     * Register a compliance framework
     */
    registerFramework(framework) {
        this.frameworks.set(framework.id, framework);
        this.assessmentHistory.set(framework.id, []);
        console.log(`[ComplianceAutomation] Registered framework: ${framework.name} (${framework.id})`);
    }
    /**
     * Start continuous compliance monitoring
     */
    async start() {
        if (this.running) {
            console.warn('[ComplianceAutomation] Already running');
            return;
        }
        this.running = true;
        console.log('[ComplianceAutomation] Starting continuous monitoring...');
        // Run initial assessment
        await this.runAllAssessments();
        // Schedule periodic assessments
        this.assessmentInterval = setInterval(async () => {
            await this.runAllAssessments();
        }, 24 * 60 * 60 * 1000); // Daily
        this.emit('started');
    }
    /**
     * Stop continuous monitoring
     */
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.assessmentInterval) {
            clearInterval(this.assessmentInterval);
        }
        this.emit('stopped');
        console.log('[ComplianceAutomation] Stopped');
    }
    /**
     * Run assessment for all registered frameworks
     */
    async runAllAssessments() {
        const results = new Map();
        for (const [frameworkId, framework] of this.frameworks) {
            try {
                const result = await this.runAssessment(frameworkId);
                results.set(frameworkId, result);
            }
            catch (error) {
                console.error(`[ComplianceAutomation] Assessment failed for ${frameworkId}:`, error);
            }
        }
        return results;
    }
    /**
     * Run assessment for a specific framework
     */
    async runAssessment(frameworkId) {
        const framework = this.frameworks.get(frameworkId);
        if (!framework) {
            throw new Error(`Unknown framework: ${frameworkId}`);
        }
        console.log(`[ComplianceAutomation] Running assessment for ${frameworkId}`);
        const controlResults = [];
        const findings = [];
        const allEvidence = [];
        // Assess each control
        for (const family of framework.controlFamilies) {
            for (const control of family.controls) {
                // Collect evidence
                const evidence = [];
                for (const requirement of control.implementation.evidence) {
                    const e = await this.evidenceCollector.collectEvidence(control.id, requirement);
                    evidence.push(e);
                }
                // Validate control
                const result = await this.controlValidator.validateControl(control, evidence);
                controlResults.push(result);
                allEvidence.push(...evidence);
                // Create findings for failed validations
                for (const validation of result.validationResults) {
                    if (validation.status === 'fail') {
                        const controlDef = control.validations.find((v) => v.id === validation.validationId);
                        const finding = this.findingManager.createFinding(control.id, validation, controlDef?.severity || 'medium');
                        findings.push(finding);
                    }
                }
            }
        }
        // Calculate overall score
        const totalScore = controlResults.reduce((sum, r) => sum + r.score, 0);
        const overallScore = controlResults.length > 0
            ? totalScore / controlResults.length
            : 0;
        const result = {
            id: crypto.randomUUID(),
            frameworkId,
            timestamp: new Date(),
            overallScore,
            status: overallScore >= 95 ? 'compliant' :
                overallScore >= 80 ? 'partial' : 'non-compliant',
            controlResults,
            findings,
            evidence: allEvidence,
        };
        // Store in history
        const history = this.assessmentHistory.get(frameworkId) || [];
        history.push(result);
        this.assessmentHistory.set(frameworkId, history);
        // Emit events
        this.emit('assessment_completed', { frameworkId, result });
        if (result.status === 'non-compliant') {
            this.emit('compliance_alert', { frameworkId, result });
        }
        console.log(`[ComplianceAutomation] Assessment completed for ${frameworkId}: ${result.status} (${overallScore.toFixed(1)}%)`);
        return result;
    }
    /**
     * Generate compliance report
     */
    generateReport(frameworkId) {
        const framework = this.frameworks.get(frameworkId);
        if (!framework) {
            throw new Error(`Unknown framework: ${frameworkId}`);
        }
        const history = this.assessmentHistory.get(frameworkId) || [];
        return this.reportGenerator.generateReport(framework, history);
    }
    /**
     * Export report in OSCAL format
     */
    exportOSCAL(frameworkId) {
        const report = this.generateReport(frameworkId);
        return this.reportGenerator.exportToOSCAL(report);
    }
    /**
     * Get compliance status
     */
    getComplianceStatus() {
        const status = new Map();
        for (const [frameworkId, history] of this.assessmentHistory) {
            const latest = history[history.length - 1];
            if (latest) {
                status.set(frameworkId, {
                    status: latest.status,
                    score: latest.overallScore,
                    lastAssessment: latest.timestamp,
                });
            }
        }
        return status;
    }
    /**
     * Get open findings
     */
    getOpenFindings() {
        return this.findingManager.getOpenFindings();
    }
    /**
     * Get POA&M entries
     */
    getPOAMEntries() {
        return this.findingManager.getPOAMEntries();
    }
    /**
     * Get all collected evidence
     */
    getAllEvidence() {
        return this.evidenceCollector.getAllEvidence();
    }
}
exports.ComplianceAutomationController = ComplianceAutomationController;
// Factory function
function createComplianceAutomationController() {
    const controller = new ComplianceAutomationController();
    // Register NIST 800-207 framework
    controller.registerFramework({
        id: 'nist-800-207',
        name: 'NIST SP 800-207 Zero Trust Architecture',
        version: '2020',
        controlFamilies: [
            {
                id: 'ZTA',
                name: 'Zero Trust Architecture Tenets',
                controls: [
                    {
                        id: 'ZTA-1',
                        name: 'Resource Protection',
                        description: 'All resources are protected',
                        implementation: {
                            components: ['spire-server', 'network-policies'],
                            zeroTrustMapping: ['Service mesh enrollment', 'mTLS enforcement'],
                            evidence: [
                                {
                                    type: 'automated',
                                    source: 'kubernetes',
                                    query: 'networkpolicies',
                                    description: 'Network policy coverage',
                                },
                            ],
                        },
                        validations: [
                            {
                                id: 'ZTA-1-V1',
                                type: 'metric',
                                query: 'network_policy_coverage',
                                operator: 'gte',
                                threshold: 100,
                                severity: 'critical',
                            },
                        ],
                    },
                    {
                        id: 'ZTA-2',
                        name: 'Secure Communications',
                        description: 'All communications secured',
                        implementation: {
                            components: ['istio', 'spire'],
                            zeroTrustMapping: ['mTLS everywhere', 'TLS 1.3'],
                            evidence: [
                                {
                                    type: 'automated',
                                    source: 'prometheus',
                                    query: 'mtls_success_rate',
                                    description: 'mTLS success rate',
                                },
                            ],
                        },
                        validations: [
                            {
                                id: 'ZTA-2-V1',
                                type: 'metric',
                                query: 'mtls_success_rate',
                                operator: 'gte',
                                threshold: 99.9,
                                severity: 'critical',
                            },
                        ],
                    },
                ],
            },
        ],
    });
    // Register FedRAMP framework
    controller.registerFramework({
        id: 'fedramp-high',
        name: 'FedRAMP High Baseline',
        version: 'Rev5',
        controlFamilies: [
            {
                id: 'AC',
                name: 'Access Control',
                controls: [
                    {
                        id: 'AC-2',
                        name: 'Account Management',
                        description: 'Manage system accounts',
                        implementation: {
                            components: ['identity-service', 'spire-server'],
                            zeroTrustMapping: ['Identity verification', 'Just-in-time access'],
                            evidence: [
                                {
                                    type: 'automated',
                                    source: 'spire',
                                    query: 'registered_entries',
                                    description: 'Workload identity registration',
                                },
                            ],
                        },
                        validations: [
                            {
                                id: 'AC-2-V1',
                                type: 'config',
                                query: 'identity_management',
                                operator: 'eq',
                                threshold: 'enabled',
                                severity: 'high',
                            },
                        ],
                    },
                    {
                        id: 'AC-3',
                        name: 'Access Enforcement',
                        description: 'Enforce access controls',
                        implementation: {
                            components: ['opa-gatekeeper', 'authorization-service'],
                            zeroTrustMapping: ['Policy-based access', 'Per-request authorization'],
                            evidence: [
                                {
                                    type: 'automated',
                                    source: 'opa',
                                    query: 'policy_decisions',
                                    description: 'OPA policy enforcement',
                                },
                            ],
                        },
                        validations: [
                            {
                                id: 'AC-3-V1',
                                type: 'metric',
                                query: 'opa_decisions_total',
                                operator: 'gt',
                                threshold: 0,
                                severity: 'high',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'SC',
                name: 'System and Communications Protection',
                controls: [
                    {
                        id: 'SC-8',
                        name: 'Transmission Confidentiality',
                        description: 'Protect transmitted information',
                        implementation: {
                            components: ['istio-mtls', 'certificate-authority'],
                            zeroTrustMapping: ['mTLS enforcement', 'TLS 1.3'],
                            evidence: [
                                {
                                    type: 'automated',
                                    source: 'prometheus',
                                    query: 'tls_version',
                                    description: 'TLS version compliance',
                                },
                            ],
                        },
                        validations: [
                            {
                                id: 'SC-8-V1',
                                type: 'metric',
                                query: 'tls_version_compliance',
                                operator: 'gte',
                                threshold: 100,
                                severity: 'critical',
                            },
                        ],
                    },
                ],
            },
        ],
    });
    return controller;
}
exports.default = ComplianceAutomationController;
