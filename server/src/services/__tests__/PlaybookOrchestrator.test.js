"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PlaybookOrchestrator_js_1 = require("../PlaybookOrchestrator.js");
const RemediationExecutionLogger_js_1 = require("../RemediationExecutionLogger.js");
(0, globals_1.describe)('PlaybookOrchestrator', () => {
    let orchestrator;
    let logger;
    (0, globals_1.beforeEach)(() => {
        orchestrator = PlaybookOrchestrator_js_1.PlaybookOrchestrator.getInstance();
        logger = RemediationExecutionLogger_js_1.RemediationExecutionLogger.getInstance();
    });
    (0, globals_1.it)('should find matching playbook for rate limit incident', () => {
        const incident = {
            id: 'inc-001',
            severity: 'high',
            statusPageCadence: 'real-time',
            timeline: [],
            impact: 'Rate limit exceeded - too many requests',
            mitigations: 'Investigating',
            nextSteps: 'Apply rate limiting',
            trustRelease: 'v1.0.0'
        };
        const playbook = orchestrator.findPlaybook(incident);
        (0, globals_1.expect)(playbook).toBeTruthy();
        (0, globals_1.expect)(playbook?.id).toBe('rate-limit-breach');
    });
    (0, globals_1.it)('should find matching playbook for memory leak incident', () => {
        const incident = {
            id: 'inc-002',
            severity: 'critical',
            statusPageCadence: 'real-time',
            timeline: [],
            impact: 'Memory leak detected in API service',
            mitigations: 'Restarting service',
            nextSteps: 'Monitor heap usage',
            trustRelease: 'v1.0.0'
        };
        const playbook = orchestrator.findPlaybook(incident);
        (0, globals_1.expect)(playbook).toBeTruthy();
        (0, globals_1.expect)(playbook?.id).toBe('memory-leak-detected');
    });
    (0, globals_1.it)('should find matching playbook for database connection exhaustion', () => {
        const incident = {
            id: 'inc-003',
            severity: 'critical',
            statusPageCadence: 'real-time',
            timeline: [],
            impact: 'Database connection pool exhausted',
            mitigations: 'Killing idle connections',
            nextSteps: 'Scale connection pool',
            trustRelease: 'v1.0.0'
        };
        const playbook = orchestrator.findPlaybook(incident);
        (0, globals_1.expect)(playbook).toBeTruthy();
        (0, globals_1.expect)(playbook?.id).toBe('db-connection-exhaustion');
    });
    (0, globals_1.it)('should execute playbook and log signed actions', async () => {
        const incident = {
            id: 'inc-004',
            severity: 'high',
            statusPageCadence: 'real-time',
            timeline: [],
            impact: 'Rate limit breach detected',
            mitigations: 'Auto-remediation triggered',
            nextSteps: 'Monitor',
            trustRelease: 'v1.0.0'
        };
        const playbook = orchestrator.findPlaybook(incident);
        (0, globals_1.expect)(playbook).toBeTruthy();
        if (playbook) {
            const execution = await orchestrator.executePlaybook(incident, playbook);
            (0, globals_1.expect)(execution.status).toBe('completed');
            (0, globals_1.expect)(execution.executedSteps.length).toBeGreaterThan(0);
            (0, globals_1.expect)(execution.failedSteps.length).toBe(0);
        }
    });
    (0, globals_1.it)('should return null for unmatched incident', () => {
        const incident = {
            id: 'inc-005',
            severity: 'low',
            statusPageCadence: 'daily',
            timeline: [],
            impact: 'Minor UI glitch',
            mitigations: 'None',
            nextSteps: 'Monitor',
            trustRelease: 'v1.0.0'
        };
        const playbook = orchestrator.findPlaybook(incident);
        (0, globals_1.expect)(playbook).toBeNull();
    });
});
(0, globals_1.describe)('RemediationExecutionLogger', () => {
    let logger;
    (0, globals_1.beforeEach)(() => {
        logger = RemediationExecutionLogger_js_1.RemediationExecutionLogger.getInstance();
    });
    (0, globals_1.it)('should log and sign remediation actions', async () => {
        const signedLog = await logger.logAction({
            incidentId: 'inc-test-001',
            playbookId: 'test-playbook',
            actionType: 'test_action',
            actionPayload: { test: 'data' },
            executedBy: 'system',
            outcome: 'success'
        });
        (0, globals_1.expect)(signedLog.action.id).toBeTruthy();
        (0, globals_1.expect)(signedLog.hash).toBeTruthy();
        (0, globals_1.expect)(signedLog.signature).toBeTruthy();
        (0, globals_1.expect)(signedLog.action.executedAt).toBeInstanceOf(Date);
    });
    (0, globals_1.it)('should verify valid signed logs', async () => {
        const signedLog = await logger.logAction({
            incidentId: 'inc-test-002',
            playbookId: 'test-playbook',
            actionType: 'test_action',
            actionPayload: { test: 'data' },
            executedBy: 'system',
            outcome: 'success'
        });
        const isValid = logger.verifyLog(signedLog);
        (0, globals_1.expect)(isValid).toBe(true);
    });
    (0, globals_1.it)('should detect tampering in signed logs', async () => {
        const signedLog = await logger.logAction({
            incidentId: 'inc-test-003',
            playbookId: 'test-playbook',
            actionType: 'test_action',
            actionPayload: { test: 'data' },
            executedBy: 'system',
            outcome: 'success'
        });
        // Tamper with the log
        signedLog.action.outcome = 'failure';
        const isValid = logger.verifyLog(signedLog);
        (0, globals_1.expect)(isValid).toBe(false);
    });
    (0, globals_1.it)('should verify chain integrity', async () => {
        const log1 = await logger.logAction({
            incidentId: 'inc-chain-001',
            playbookId: 'test-playbook',
            actionType: 'action_1',
            actionPayload: {},
            executedBy: 'system',
            outcome: 'success'
        });
        const log2 = await logger.logAction({
            incidentId: 'inc-chain-001',
            playbookId: 'test-playbook',
            actionType: 'action_2',
            actionPayload: {},
            executedBy: 'system',
            outcome: 'success'
        });
        const log3 = await logger.logAction({
            incidentId: 'inc-chain-001',
            playbookId: 'test-playbook',
            actionType: 'action_3',
            actionPayload: {},
            executedBy: 'system',
            outcome: 'success'
        });
        const chainResult = logger.verifyChain([log1, log2, log3]);
        (0, globals_1.expect)(chainResult.valid).toBe(true);
        (0, globals_1.expect)(chainResult.brokenAt).toBeUndefined();
    });
    (0, globals_1.it)('should detect broken chain integrity', async () => {
        const log1 = await logger.logAction({
            incidentId: 'inc-chain-002',
            playbookId: 'test-playbook',
            actionType: 'action_1',
            actionPayload: {},
            executedBy: 'system',
            outcome: 'success'
        });
        const log2 = await logger.logAction({
            incidentId: 'inc-chain-002',
            playbookId: 'test-playbook',
            actionType: 'action_2',
            actionPayload: {},
            executedBy: 'system',
            outcome: 'success'
        });
        // Break the chain by modifying previousHash
        log2.previousHash = 'tampered-hash';
        const chainResult = logger.verifyChain([log1, log2]);
        (0, globals_1.expect)(chainResult.valid).toBe(false);
        (0, globals_1.expect)(chainResult.brokenAt).toBe(1);
    });
});
