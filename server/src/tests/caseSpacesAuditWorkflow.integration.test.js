"use strict";
/**
 * Case Spaces and Audit Workflow Integration Test
 * Tests the complete flow of case access with audit logging
 * Demonstrates cross-service audit logging capability
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AuditAccessLogRepo_js_1 = require("../repos/AuditAccessLogRepo.js");
const CaseService_js_1 = require("../cases/CaseService.js");
const globals_1 = require("@jest/globals");
// Mock Pool for integration testing
class MockPool {
    cases = new Map();
    auditLogs = [];
    async query(sql, params) {
        // Simulate database operations
        if (sql.includes('INSERT INTO maestro.cases')) {
            const caseData = {
                id: params[0],
                tenant_id: params[1],
                title: params[2],
                description: params[3],
                status: params[4],
                compartment: params[5],
                policy_labels: params[6],
                metadata: JSON.parse(params[7]),
                created_at: new Date(),
                updated_at: new Date(),
                created_by: params[8],
                closed_at: null,
                closed_by: null,
            };
            this.cases.set(params[0], caseData);
            return { rows: [caseData] };
        }
        if (sql.includes('INSERT INTO maestro.audit_access_logs')) {
            const logData = {
                id: params[0],
                tenant_id: params[1],
                case_id: params[2],
                user_id: params[3],
                action: params[4],
                resource_type: params[5],
                resource_id: params[6],
                reason: params[7],
                legal_basis: params[8],
                warrant_id: params[9],
                authority_reference: params[10],
                approval_chain: JSON.parse(params[11]),
                ip_address: params[12],
                user_agent: params[13],
                session_id: params[14],
                request_id: params[15],
                correlation_id: params[16],
                hash: params[17],
                previous_hash: params[18],
                metadata: JSON.parse(params[19]),
                created_at: new Date(),
            };
            this.auditLogs.push(logData);
            return { rows: [logData] };
        }
        if (sql.includes('SELECT * FROM maestro.cases WHERE id')) {
            const caseId = params[0];
            const caseData = this.cases.get(caseId);
            return { rows: caseData ? [caseData] : [] };
        }
        if (sql.includes('SELECT * FROM maestro.audit_access_logs')) {
            if (sql.includes('ORDER BY created_at DESC LIMIT 1')) {
                // For hash initialization
                return { rows: [] };
            }
            if (params[1]) {
                // Filter by caseId
                const filtered = this.auditLogs.filter((log) => log.case_id === params[1]);
                return { rows: filtered };
            }
            return { rows: this.auditLogs };
        }
        return { rows: [] };
    }
    async connect() {
        return {
            query: this.query.bind(this),
            release: globals_1.jest.fn(),
        };
    }
    // Helper methods for testing
    getCases() {
        return Array.from(this.cases.values());
    }
    getAuditLogs() {
        return this.auditLogs;
    }
    clear() {
        this.cases.clear();
        this.auditLogs = [];
    }
}
(0, globals_1.describe)('Case Spaces and Audit Workflow Integration', () => {
    let mockPool;
    let caseService;
    let auditRepo;
    (0, globals_1.beforeEach)(() => {
        mockPool = new MockPool();
        caseService = new CaseService_js_1.CaseService(mockPool);
        auditRepo = new AuditAccessLogRepo_js_1.AuditAccessLogRepo(mockPool);
    });
    (0, globals_1.afterEach)(() => {
        mockPool.clear();
    });
    (0, globals_1.it)('should create a case and log the creation in audit trail', async () => {
        const caseData = {
            tenantId: 'tenant-123',
            title: 'Fraud Investigation Case',
            description: 'Investigating suspicious transactions',
            compartment: 'SECRET',
            policyLabels: ['fraud', 'financial'],
        };
        const userId = 'investigator-1';
        // Create case with audit context
        const createdCase = await caseService.createCase(caseData, userId, {
            reason: 'New fraud case opened based on alert #12345',
            legalBasis: 'investigation',
        });
        (0, globals_1.expect)(createdCase).toBeDefined();
        (0, globals_1.expect)(createdCase.title).toBe('Fraud Investigation Case');
        // Verify audit log was created
        const auditLogs = mockPool.getAuditLogs();
        (0, globals_1.expect)(auditLogs).toHaveLength(1);
        (0, globals_1.expect)(auditLogs[0].action).toBe('create');
        (0, globals_1.expect)(auditLogs[0].case_id).toBe(createdCase.id);
        (0, globals_1.expect)(auditLogs[0].reason).toBe('New fraud case opened based on alert #12345');
        (0, globals_1.expect)(auditLogs[0].legal_basis).toBe('investigation');
    });
    (0, globals_1.it)('should enforce reason-for-access when viewing a case', async () => {
        // First create a case
        const createdCase = await caseService.createCase({
            tenantId: 'tenant-123',
            title: 'Test Case',
        }, 'user-1', {
            reason: 'Case creation',
            legalBasis: 'investigation',
        });
        // View the case with proper audit context
        const viewedCase = await caseService.getCase(createdCase.id, 'tenant-123', 'analyst-2', {
            reason: 'Reviewing case for ongoing investigation',
            legalBasis: 'investigation',
        });
        (0, globals_1.expect)(viewedCase).toBeDefined();
        // Verify both create and view logs exist
        const auditLogs = mockPool.getAuditLogs();
        (0, globals_1.expect)(auditLogs).toHaveLength(2);
        (0, globals_1.expect)(auditLogs[0].action).toBe('create');
        (0, globals_1.expect)(auditLogs[1].action).toBe('view');
        (0, globals_1.expect)(auditLogs[1].user_id).toBe('analyst-2');
    });
    (0, globals_1.it)('should track export operations with legal basis', async () => {
        // Create a case
        const createdCase = await caseService.createCase({
            tenantId: 'tenant-123',
            title: 'Legal Case',
        }, 'user-1', {
            reason: 'Case creation',
            legalBasis: 'investigation',
        });
        // Export with court order
        await caseService.exportCase(createdCase.id, 'tenant-123', 'legal-officer-1', {
            reason: 'Data export for court proceedings',
            legalBasis: 'court_order',
            warrantId: 'warrant-2024-001',
            authorityReference: 'District Court Order #2024-001',
        });
        const auditLogs = mockPool.getAuditLogs();
        const exportLog = auditLogs.find((log) => log.action === 'export');
        (0, globals_1.expect)(exportLog).toBeDefined();
        (0, globals_1.expect)(exportLog?.legal_basis).toBe('court_order');
        (0, globals_1.expect)(exportLog?.warrant_id).toBe('warrant-2024-001');
        (0, globals_1.expect)(exportLog?.authority_reference).toBe('District Court Order #2024-001');
    });
    (0, globals_1.it)('should support cross-service audit logging with correlation ID', async () => {
        const correlationId = 'workflow-abc-123';
        // Simulate multiple services accessing the same case
        const createdCase = await caseService.createCase({
            tenantId: 'tenant-123',
            title: 'Multi-Service Case',
        }, 'user-1', {
            reason: 'Workflow initiated',
            legalBasis: 'investigation',
            correlationId,
        });
        // Service 1: View the case
        await auditRepo.logAccess({
            tenantId: 'tenant-123',
            caseId: createdCase.id,
            userId: 'service-1',
            action: 'process',
            resourceType: 'case',
            resourceId: createdCase.id,
            reason: 'Automated risk analysis',
            legalBasis: 'investigation',
            correlationId,
        });
        // Service 2: Access the case
        await auditRepo.logAccess({
            tenantId: 'tenant-123',
            caseId: createdCase.id,
            userId: 'service-2',
            action: 'enrich',
            resourceType: 'case',
            resourceId: createdCase.id,
            reason: 'Data enrichment workflow',
            legalBasis: 'investigation',
            correlationId,
        });
        // Retrieve all logs for the correlation ID
        const correlatedLogs = await auditRepo.getLogsByCorrelationId(correlationId, 'tenant-123');
        (0, globals_1.expect)(correlatedLogs).toHaveLength(3); // create + process + enrich
        (0, globals_1.expect)(correlatedLogs.every((log) => log.correlationId === correlationId)).toBe(true);
    });
    (0, globals_1.it)('should verify audit trail integrity', async () => {
        // Create multiple audit entries
        const createdCase = await caseService.createCase({
            tenantId: 'tenant-123',
            title: 'Integrity Test Case',
        }, 'user-1', {
            reason: 'Test case',
            legalBasis: 'investigation',
        });
        await caseService.getCase(createdCase.id, 'tenant-123', 'user-2', {
            reason: 'View 1',
            legalBasis: 'investigation',
        });
        await caseService.getCase(createdCase.id, 'tenant-123', 'user-3', {
            reason: 'View 2',
            legalBasis: 'investigation',
        });
        // Verify integrity
        const integrity = await auditRepo.verifyIntegrity('tenant-123');
        (0, globals_1.expect)(integrity.valid).toBe(true);
        (0, globals_1.expect)(integrity.totalLogs).toBe(3);
        (0, globals_1.expect)(integrity.validLogs).toBe(3);
        (0, globals_1.expect)(integrity.invalidLogs).toHaveLength(0);
    });
    (0, globals_1.it)('should retrieve audit logs for ombudsman review', async () => {
        // Create case and perform multiple operations
        const createdCase = await caseService.createCase({
            tenantId: 'tenant-123',
            title: 'Compliance Review Case',
        }, 'user-1', {
            reason: 'Compliance investigation',
            legalBasis: 'regulatory_compliance',
        });
        await caseService.getCase(createdCase.id, 'tenant-123', 'user-2', {
            reason: 'Review for compliance',
            legalBasis: 'regulatory_compliance',
        });
        await caseService.exportCase(createdCase.id, 'tenant-123', 'user-3', {
            reason: 'Export for audit',
            legalBasis: 'regulatory_compliance',
        });
        // Ombudsman query: Get all logs for this case
        const caseLogs = await auditRepo.getLogsForCase(createdCase.id, 'tenant-123');
        (0, globals_1.expect)(caseLogs).toHaveLength(3);
        (0, globals_1.expect)(caseLogs[0].action).toBe('create');
        (0, globals_1.expect)(caseLogs[1].action).toBe('view');
        (0, globals_1.expect)(caseLogs[2].action).toBe('export');
        // Verify all have proper legal basis
        (0, globals_1.expect)(caseLogs.every((log) => log.legalBasis === 'regulatory_compliance')).toBe(true);
    });
    (0, globals_1.it)('should fail when attempting to access without reason', async () => {
        const input = {
            tenantId: 'tenant-123',
            caseId: 'case-123',
            userId: 'user-123',
            action: 'view',
            reason: '', // Empty reason - should fail
            legalBasis: 'investigation',
        };
        await (0, globals_1.expect)(auditRepo.logAccess(input)).rejects.toThrow('Reason is required for audit logging');
    });
    (0, globals_1.it)('should fail when attempting to access without legal basis', async () => {
        const input = {
            tenantId: 'tenant-123',
            caseId: 'case-123',
            userId: 'user-123',
            action: 'view',
            reason: 'Valid reason',
            // legalBasis is missing - should fail
        };
        await (0, globals_1.expect)(auditRepo.logAccess(input)).rejects.toThrow('Legal basis is required for audit logging');
    });
});
