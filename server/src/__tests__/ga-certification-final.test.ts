import { jest, describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';
import { ImmutableAuditLogService } from '../services/ImmutableAuditLogService.js';
import { EnhancedGovernanceService } from '../services/EnhancedGovernanceRBACService.js';
import { WarrantService } from '../services/WarrantService.js';
import express from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import pino from 'pino';

/**
 * GA Certification Final Integration Test
 * 
 * Verifies the "Run Spine" for GA readiness:
 * 1. Governance Context Extraction
 * 2. RBAC/ABAC Policy Enforcement
 * 3. Cryptographically Signed Audit Logging
 * 4. Tamper-Proof Chain Verification
 */
describe('GA Certification: Enhanced Governance & Immutable Auditing', () => {
    let auditService: ImmutableAuditLogService;
    let governanceService: EnhancedGovernanceService;
    let tempAuditDir: string;
    let mockPool: any;
    let mockWarrantService: any;
    let app: express.Express;
    const logger = pino({ level: 'silent' });

    beforeAll(async () => {
        // Create a unique temporary directory for this test's audit logs
        tempAuditDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-ga-audit-'));

        auditService = new ImmutableAuditLogService({
            logPath: tempAuditDir,
            enabled: true,
            batchSize: 1, // Process immediately for test predictability
            tamperDetectionEnabled: true
        });

        // Mock DB Pool
        mockPool = {
            query: jest.fn()
        };

        // Mock Warrant Service
        mockWarrantService = {
            getWarrant: jest.fn(),
            initialize: jest.fn(),
        };

        governanceService = new EnhancedGovernanceService(
            mockPool as unknown as Pool,
            mockWarrantService as unknown as WarrantService,
            auditService,
            logger
        );

        app = express();
        app.use(express.json());

        // Mock Session Middleware
        app.use((req: any, res, next) => {
            req.user = {
                id: 'cert-user-001',
                roles: ['analyst'],
                tenantId: 'tenant-alpha',
                permissions: ['data:read', 'investigation:create'],
                clearance: 'secret',
                department: 'intelligence',
                location: 'US-EAST-1'
            };
            next();
        });

        // Governance Middleware
        app.use(governanceService.createGovernanceMiddleware({
            requirePurpose: true,
            requireReason: true,
            strictMode: true
        }));

        app.get('/api/v1/investigations/spine-test', (req, res) => {
            res.json({
                status: 'certified',
                governance: (req as any).governance,
                auditId: (req as any).auditId
            });
        });
    });

    afterAll(async () => {
        // Cleanup temporary audit logs
        if (tempAuditDir) {
            await fs.rm(tempAuditDir, { recursive: true, force: true });
        }
    });

    it('should certify the complete "Run Spine" with signed audit logs on success', async () => {
        // 1. Setup: Purpose configuration in DB
        mockPool.query.mockResolvedValue({
            rows: [{
                purpose_code: 'investigation',
                purpose_name: 'Standard Investigation',
                requires_warrant: false,
                requires_approval: false,
                max_data_sensitivity: 'secret',
                is_active: true
            }]
        });

        // 2. Action: Perform guarded request
        const response = await request(app)
            .get('/api/v1/investigations/spine-test')
            .set('x-purpose', 'investigation')
            .set('x-reason-for-access', 'GA certification run-spine verification test');

        // 3. Verify Response
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('certified');

        // 4. Verify Audit Log Integration
        // Allow time for async write
        await new Promise(resolve => setTimeout(resolve, 800));

        const files = await fs.readdir(tempAuditDir);
        const auditFiles = files.filter(f => f.endsWith('.log'));
        expect(auditFiles.length).toBeGreaterThan(0);

        const latestLog = await fs.readFile(path.join(tempAuditDir, auditFiles[0]), 'utf-8');
        const entry = JSON.parse(latestLog.split('\n').filter(l => l.trim()).pop()!);

        expect(entry.eventType).toBe('DATA_ACCESS');
        expect(entry.userId).toBe('cert-user-001');
        expect(entry.result).toBe('success');
        expect(entry.signature).toBeDefined();
        expect(entry.currentHash).toBeDefined();
    });

    it('should reject and audit access attempts with insufficient clearance', async () => {
        // 1. Setup: Request top_secret purpose with secret clearance
        mockPool.query.mockResolvedValue({
            rows: [{
                purpose_code: 'sensitive_audit',
                max_data_sensitivity: 'top_secret',
                is_active: true
            }]
        });

        // 2. Action: Perform request
        const response = await request(app)
            .get('/api/v1/investigations/spine-test')
            .set('x-purpose', 'sensitive_audit')
            .set('x-reason-for-access', 'Testing clearance rejection auditing');

        // 3. Verify Rejection
        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Insufficient clearance');

        // 4. Verify Audit Log (SECURITY_ALERT)
        await new Promise(resolve => setTimeout(resolve, 500));

        const files = await fs.readdir(tempAuditDir);
        const auditFiles = files.filter(f => f.endsWith('.log'));
        const latestLog = await fs.readFile(path.join(tempAuditDir, auditFiles[0]), 'utf-8');

        expect(latestLog).toContain('SECURITY_ALERT');
        expect(latestLog).toContain('Insufficient clearance');
        expect(latestLog).toContain('"result":"denied"');
    });

    it('should reject and audit requests with suspicious reasons', async () => {
        const response = await request(app)
            .get('/api/v1/investigations/spine-test')
            .set('x-purpose', 'investigation')
            .set('x-reason-for-access', 'test placeholder asdf');

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('REASON_SUSPICIOUS');

        await new Promise(resolve => setTimeout(resolve, 500));

        const files = await fs.readdir(tempAuditDir);
        const auditFiles = files.filter(f => f.endsWith('.log'));
        const latestLog = await fs.readFile(path.join(tempAuditDir, auditFiles[0]), 'utf-8');

        expect(latestLog).toContain('Suspicious access reason');
    });

    it('should verify the cryptographic integrity of the audit chain', async () => {
        // Perform multiple actions to build a chain
        mockPool.query.mockResolvedValue({
            rows: [{ purpose_code: 'investigation', max_data_sensitivity: 'secret', is_active: true }]
        });

        await request(app)
            .get('/api/v1/investigations/spine-test')
            .set('x-purpose', 'investigation')
            .set('x-reason-for-access', 'Chain building request 1');

        await request(app)
            .get('/api/v1/investigations/spine-test')
            .set('x-purpose', 'investigation')
            .set('x-reason-for-access', 'Chain building request 2');

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use service method to verify integrity
        const report = await auditService.verifyIntegrity();
        expect(report.valid).toBe(true);
        expect(report.tamperedEvents).toBe(0);
        expect(report.chainIntegrity).toBe(true);
    });
});
