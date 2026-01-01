
import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
import { SecurityIncidentPipeline, SecurityEvent } from '../services/SecurityIncidentPipeline.js';
import { AlertTriageV2Service } from '../services/AlertTriageV2Service.js';
import { Neo4jService } from '../db/neo4j.js';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system.js';

describe('SecurityIncidentPipeline', () => {
    // Mocks
    const prisma = {} as any;
    const redis = {} as any;
    const logger = {
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
    } as any;

    const neo4j = {
        run: mock.fn(async () => ({ records: [] }))
    } as unknown as Neo4jService;

    const auditSystem = {
        getLogsForActor: mock.fn(async () => [{ id: 'log-1', action: 'login' }])
    } as unknown as AdvancedAuditSystem;

    const triageService = new AlertTriageV2Service();

    const pipeline = new SecurityIncidentPipeline(
        prisma,
        redis,
        logger,
        neo4j,
        auditSystem,
        triageService
    );

    test('should process high severity event and create incident', async () => {
        const event: SecurityEvent = {
            id: 'evt-1',
            type: 'suspicious_login',
            severity: 'high',
            timestamp: new Date(),
            tenantId: 't-1',
            actorId: 'user-1',
            details: {}
        };

        const incident = await pipeline.processEvent(event);

        assert.ok(incident, 'Incident should be created');
        assert.strictEqual(incident?.severity, 'high');
        assert.strictEqual(incident?.status, 'new');
        assert.ok(incident?.riskScore >= 0.7);
        assert.strictEqual(incident?.evidence.length, 2, 'Should have logs and graph evidence');

        // Check log evidence
        const logs = incident?.evidence.find(e => e.type === 'logs');
        assert.deepStrictEqual(logs?.data, [{ id: 'log-1', action: 'login' }]);
    });

    test('should ignore low risk events', async () => {
         const event: SecurityEvent = {
            id: 'evt-2',
            type: 'ping',
            severity: 'low',
            timestamp: new Date(),
            tenantId: 't-1',
            actorId: 'user-2',
            details: {}
        };

        const incident = await pipeline.processEvent(event);
        assert.strictEqual(incident, null, 'Incident should NOT be created for low risk');
    });
});
