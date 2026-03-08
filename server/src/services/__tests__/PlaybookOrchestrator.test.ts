import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PlaybookOrchestrator } from '../PlaybookOrchestrator.js';
import { RemediationExecutionLogger } from '../RemediationExecutionLogger.js';
import type { Incident } from '../../trust-center/service.js';

describe('PlaybookOrchestrator', () => {
    let orchestrator: PlaybookOrchestrator;
    let logger: RemediationExecutionLogger;

    beforeEach(() => {
        orchestrator = PlaybookOrchestrator.getInstance();
        logger = RemediationExecutionLogger.getInstance();
    });

    it('should find matching playbook for rate limit incident', () => {
        const incident: Incident = {
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
        expect(playbook).toBeTruthy();
        expect(playbook?.id).toBe('rate-limit-breach');
    });

    it('should find matching playbook for memory leak incident', () => {
        const incident: Incident = {
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
        expect(playbook).toBeTruthy();
        expect(playbook?.id).toBe('memory-leak-detected');
    });

    it('should find matching playbook for database connection exhaustion', () => {
        const incident: Incident = {
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
        expect(playbook).toBeTruthy();
        expect(playbook?.id).toBe('db-connection-exhaustion');
    });

    it('should execute playbook and log signed actions', async () => {
        const incident: Incident = {
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
        expect(playbook).toBeTruthy();

        if (playbook) {
            const execution = await orchestrator.executePlaybook(incident, playbook);

            expect(execution.status).toBe('completed');
            expect(execution.executedSteps.length).toBeGreaterThan(0);
            expect(execution.failedSteps.length).toBe(0);
        }
    });

    it('should return null for unmatched incident', () => {
        const incident: Incident = {
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
        expect(playbook).toBeNull();
    });
});

describe('RemediationExecutionLogger', () => {
    let logger: RemediationExecutionLogger;

    beforeEach(() => {
        logger = RemediationExecutionLogger.getInstance();
    });

    it('should log and sign remediation actions', async () => {
        const signedLog = await logger.logAction({
            incidentId: 'inc-test-001',
            playbookId: 'test-playbook',
            actionType: 'test_action',
            actionPayload: { test: 'data' },
            executedBy: 'system',
            outcome: 'success'
        });

        expect(signedLog.action.id).toBeTruthy();
        expect(signedLog.hash).toBeTruthy();
        expect(signedLog.signature).toBeTruthy();
        expect(signedLog.action.executedAt).toBeInstanceOf(Date);
    });

    it('should verify valid signed logs', async () => {
        const signedLog = await logger.logAction({
            incidentId: 'inc-test-002',
            playbookId: 'test-playbook',
            actionType: 'test_action',
            actionPayload: { test: 'data' },
            executedBy: 'system',
            outcome: 'success'
        });

        const isValid = logger.verifyLog(signedLog);
        expect(isValid).toBe(true);
    });

    it('should detect tampering in signed logs', async () => {
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
        expect(isValid).toBe(false);
    });

    it('should verify chain integrity', async () => {
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
        expect(chainResult.valid).toBe(true);
        expect(chainResult.brokenAt).toBeUndefined();
    });

    it('should detect broken chain integrity', async () => {
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
        expect(chainResult.valid).toBe(false);
        expect(chainResult.brokenAt).toBe(1);
    });
});
