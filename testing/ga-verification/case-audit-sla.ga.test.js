"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const CaseAuditLog_js_1 = require("../../server/src/cases/domain/CaseAuditLog.js");
const CaseSLAService_js_1 = require("../../server/src/cases/sla/CaseSLAService.js");
// Mock Pool
class MockPool {
    query(_text, _params) {
        return Promise.resolve({ rows: [], rowCount: 0 });
    }
}
(0, node_test_1.describe)('Case Audit & SLA Verification (Tier B)', () => {
    let auditRepo;
    let slaService;
    let mockPool;
    (0, node_test_1.beforeEach)(() => {
        mockPool = new MockPool();
        auditRepo = new CaseAuditLog_js_1.CaseAuditLogRepository(mockPool);
        slaService = new CaseSLAService_js_1.CaseSLAService(mockPool);
    });
    (0, node_test_1.test)('Audit Log - Compute Hash', async () => {
        const input = {
            caseId: 'case-123',
            tenantId: 'tenant-abc',
            actorId: 'user-1',
            action: 'CASE_VIEWED',
            reasonForAccess: 'Investigation'
        };
        // Mock the queries
        mockPool.query = (text) => {
            if (text.includes('SELECT DISTINCT ON')) {
                return { rows: [] };
            } // Init cache
            if (text.includes('SELECT hash FROM')) {
                return { rows: [] };
            } // Get last hash
            if (text.includes('INSERT INTO')) {
                return {
                    rows: [{
                            audit_id: 'uuid',
                            case_id: input.caseId,
                            tenant_id: input.tenantId,
                            actor_id: input.actorId,
                            action: input.action,
                            timestamp: new Date(),
                            hash: 'mock-hash',
                            prev_hash: null,
                            resource_type: null,
                            resource_id: null,
                            details: null,
                            reason_for_access: input.reasonForAccess,
                            legal_basis: null,
                            authority_id: null,
                            policy_decision: null,
                            session_context: null
                        }]
                };
            }
            return { rows: [] };
        };
        const record = await auditRepo.append(input);
        node_assert_1.default.strictEqual(record.caseId, 'case-123');
        node_assert_1.default.strictEqual(record.hash, 'mock-hash');
    });
    (0, node_test_1.test)('SLA Service - Create Timer', async () => {
        const input = {
            caseId: 'case-123',
            tenantId: 'tenant-abc',
            type: 'RESOLUTION_TIME',
            name: 'Resolve in 24h',
            targetDurationSeconds: 86400
        };
        mockPool.query = (text, _params) => {
            if (text.includes('INSERT INTO')) {
                return {
                    rows: [{
                            sla_id: 'sla-1',
                            case_id: input.caseId,
                            tenant_id: input.tenantId,
                            type: input.type,
                            name: input.name,
                            start_time: new Date(),
                            deadline: new Date(Date.now() + 86400000),
                            status: 'ACTIVE',
                            target_duration_seconds: input.targetDurationSeconds,
                            metadata: {},
                            completed_at: null
                        }]
                };
            }
            return { rows: [] };
        };
        const timer = await slaService.createTimer(input);
        node_assert_1.default.strictEqual(timer.status, 'ACTIVE');
        node_assert_1.default.strictEqual(timer.targetDurationSeconds, 86400);
    });
});
