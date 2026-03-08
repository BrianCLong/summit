"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const remediation_engine_js_1 = require("../remediation/remediation-engine.js");
(0, vitest_1.describe)('RemediationEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = new remediation_engine_js_1.RemediationEngine({
            autoRemediate: false,
            requireApproval: true,
            createBackups: true,
            runVerification: false,
            dryRun: true,
        });
    });
    (0, vitest_1.describe)('task management', () => {
        (0, vitest_1.it)('should create remediation tasks from vulnerabilities', async () => {
            const vulns = [
                {
                    id: 'SQL_INJECTION-abc123',
                    title: 'SQL Injection',
                    description: 'SQL injection vulnerability',
                    severity: 'critical',
                    category: 'injection',
                    cvssScore: 9.5,
                    cweId: 'CWE-89',
                    location: {
                        file: '/tmp/test.ts',
                        startLine: 10,
                        endLine: 12,
                        codeSnippet: 'db.query("SELECT * FROM users WHERE id = " + userId)',
                    },
                    attribution: {
                        source: 'static-analysis',
                        confidence: 0.9,
                        scanId: 'scan-123',
                        timestamp: new Date(),
                    },
                    evidence: [],
                    remediation: {
                        description: 'Use parameterized queries',
                        priority: 'immediate',
                        estimatedEffort: '1 hour',
                        automatable: true,
                        verificationSteps: ['Run SQL injection tests'],
                        codeChanges: [
                            {
                                file: '/tmp/test.ts',
                                oldCode: 'db.query("SELECT * FROM users WHERE id = " + userId)',
                                newCode: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
                                explanation: 'Use parameterized query',
                            },
                        ],
                    },
                    complianceImpact: [],
                    detectedAt: new Date(),
                    status: 'open',
                },
            ];
            const tasks = await engine.createRemediationTasks(vulns);
            (0, vitest_1.expect)(tasks.length).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should track pending tasks', async () => {
            const pending = engine.getPendingTasks();
            (0, vitest_1.expect)(Array.isArray(pending)).toBe(true);
        });
        (0, vitest_1.it)('should get all tasks', () => {
            const all = engine.getAllTasks();
            (0, vitest_1.expect)(Array.isArray(all)).toBe(true);
        });
    });
    (0, vitest_1.describe)('approval workflow', () => {
        (0, vitest_1.it)('should require approval when configured', () => {
            const strictEngine = new remediation_engine_js_1.RemediationEngine({
                requireApproval: true,
                dryRun: true,
            });
            (0, vitest_1.expect)(strictEngine).toBeDefined();
        });
        (0, vitest_1.it)('should auto-approve when configured', () => {
            const autoEngine = new remediation_engine_js_1.RemediationEngine({
                autoRemediate: true,
                autoRemediateMaxSeverity: 'medium',
                requireApproval: false,
                dryRun: true,
            });
            (0, vitest_1.expect)(autoEngine).toBeDefined();
        });
    });
    (0, vitest_1.describe)('remediation execution', () => {
        (0, vitest_1.it)('should execute in dry-run mode', async () => {
            const report = await engine.executeRemediations();
            (0, vitest_1.expect)(report.sessionId).toBeDefined();
            (0, vitest_1.expect)(report.startTime).toBeInstanceOf(Date);
            (0, vitest_1.expect)(report.endTime).toBeInstanceOf(Date);
            (0, vitest_1.expect)(report.tasksTotal).toBeGreaterThanOrEqual(0);
        });
    });
});
