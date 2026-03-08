"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Mock typing issues with @jest/globals
const globals_1 = require("@jest/globals");
const ComplianceService_1 = __importDefault(require("../../src/services/ComplianceService"));
const DLPService_1 = require("../../src/services/DLPService");
// Mock dependencies
globals_1.jest.mock('../../src/services/DLPService', () => ({
    dlpService: {
        listPolicies: globals_1.jest.fn()
    }
}));
// Mock Redis
globals_1.jest.mock('../../src/db/redis', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn().mockResolvedValue(null),
        set: globals_1.jest.fn().mockResolvedValue('OK'),
    }))
}));
// Mock logger
globals_1.jest.mock('../../src/utils/logger', () => ({
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    child: globals_1.jest.fn().mockReturnValue({
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
    }),
}));
(0, globals_1.describe)('ComplianceService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        process.env.ENCRYPTION_ENABLED = 'true';
        process.env.AUDIT_LOGGING_ENABLED = 'true';
        process.env.TLS_ENABLED = 'true';
        process.env.AUTH_REQUIRED = 'true';
        process.env.MFA_ENABLED = 'true';
        process.env.MONITORING_ENABLED = 'true';
        process.env.VULN_SCANNING_ENABLED = 'true';
        // Mock DLP policies
        DLPService_1.dlpService.listPolicies.mockReturnValue([
            { id: 'pii-detection', name: 'PII Detection', enabled: true, updatedAt: new Date() },
            { id: 'data-classification', name: 'Data Classification', enabled: true, updatedAt: new Date() }
        ]);
    });
    (0, globals_1.describe)('Framework Initialization', () => {
        (0, globals_1.it)('should initialize default frameworks (GDPR, SOC2, ISO27001)', () => {
            const frameworks = ComplianceService_1.default.listFrameworks();
            (0, globals_1.expect)(frameworks.length).toBeGreaterThanOrEqual(3);
            const ids = frameworks.map(f => f.id);
            (0, globals_1.expect)(ids).toContain('gdpr');
            (0, globals_1.expect)(ids).toContain('soc2');
            (0, globals_1.expect)(ids).toContain('iso27001');
        });
        (0, globals_1.it)('should retrieve a framework by ID', () => {
            const framework = ComplianceService_1.default.getFramework('gdpr');
            (0, globals_1.expect)(framework).toBeDefined();
            (0, globals_1.expect)(framework?.name).toContain('General Data Protection Regulation');
        });
        (0, globals_1.it)('should return undefined for non-existent framework', () => {
            const framework = ComplianceService_1.default.getFramework('invalid-id');
            (0, globals_1.expect)(framework).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Assessments', () => {
        (0, globals_1.it)('should run GDPR assessment successfully when all controls are enabled', async () => {
            const report = await ComplianceService_1.default.runAssessment('gdpr');
            (0, globals_1.expect)(report).toBeDefined();
            (0, globals_1.expect)(report.frameworkId).toBe('gdpr');
            (0, globals_1.expect)(report.status).toBe('compliant');
            (0, globals_1.expect)(report.overallScore).toBe(100);
            (0, globals_1.expect)(report.evidence.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should fail GDPR assessment if PII policy is missing', async () => {
            DLPService_1.dlpService.listPolicies.mockReturnValue([]);
            const report = await ComplianceService_1.default.runAssessment('gdpr');
            (0, globals_1.expect)(report.status).toBe('non-compliant');
            const piiFinding = report.findings.find(f => f.id === 'gdpr-art-25-no-pii-policy');
            (0, globals_1.expect)(piiFinding).toBeDefined();
            (0, globals_1.expect)(piiFinding?.severity).toBe('critical');
        });
        (0, globals_1.it)('should fail SOC2 assessment if MFA is disabled', async () => {
            process.env.MFA_ENABLED = 'false';
            const report = await ComplianceService_1.default.runAssessment('soc2');
            (0, globals_1.expect)(report.status).toBe('non-compliant');
            const mfaFinding = report.findings.find(f => f.id === 'soc2-cc-6.1-no-mfa');
            (0, globals_1.expect)(mfaFinding).toBeDefined();
        });
        (0, globals_1.it)('should handle generic requirements correctly', async () => {
            // Modify a framework to test generic path (mocking or manually modifying private state if possible,
            // but since we can't easily access private map, we rely on default generic fallback if any ID doesn't match specific cases)
            // The current implementation hardcodes switch cases for all default frameworks.
            // To test generic, we would need to add a custom framework.
            ComplianceService_1.default.updateFramework('gdpr', {
                requirements: [{
                        id: 'custom-req',
                        frameworkId: 'gdpr', // This triggers generic path if not in switch? No, assessRequirement switches on frameworkId
                        // Wait, assessRequirement switches on frameworkId.
                        // Inside assessGDPRRequirement, it switches on requirement.id.
                        // If requirement.id is unknown, it falls back to assessGenericRequirement.
                        category: 'Test',
                        title: 'Test Generic',
                        description: 'Generic Test',
                        priority: 'medium',
                        status: 'partial',
                        controls: [{
                                id: 'ctrl-1',
                                type: 'technical',
                                description: 'Auto Control',
                                implementation: 'Impl',
                                automated: true,
                                effectiveness: 'high'
                            }],
                        evidence: [],
                        nextCheck: new Date(),
                        automatedCheck: true
                    }]
            });
            const report = await ComplianceService_1.default.runAssessment('gdpr');
            // The custom requirement should be processed by assessGenericRequirement since its ID is not in the switch case in assessGDPRRequirement
            // Actually assessGDPRRequirement switch has a default case: return await this.assessGenericRequirement(requirement);
            const genericEvidence = report.evidence.find(e => e.metadata.controlId === 'ctrl-1');
            (0, globals_1.expect)(genericEvidence).toBeDefined();
        });
    });
    (0, globals_1.describe)('Dashboard Data', () => {
        (0, globals_1.it)('should return dashboard data structure', async () => {
            const data = await ComplianceService_1.default.getDashboardData();
            (0, globals_1.expect)(data.frameworks.length).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(data.overallStatus).toBeDefined();
            (0, globals_1.expect)(data.upcomingAssessments).toBeDefined();
        });
    });
});
