"use strict";
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
const globals_1 = require("@jest/globals");
const jwt = __importStar(require("jsonwebtoken"));
const ComprehensiveAuditLoggingService_js_1 = require("../src/services/ComprehensiveAuditLoggingService.js");
(0, globals_1.describe)('ComprehensiveAuditLoggingService', () => {
    const signingKey = 'test-signing-key';
    class FakeAuditSystem {
        events = [];
        lastHash;
        async recordEvent(event) {
            const id = `${this.events.length + 1}`;
            const timestamp = event.timestamp ?? new Date();
            const hash = `${id}:${event.eventType}:${timestamp.getTime()}`;
            const previousEventHash = this.lastHash;
            const signature = jwt.sign({ id, hash }, signingKey);
            const stored = {
                id,
                level: event.level ?? 'info',
                eventType: event.eventType ?? 'user_action',
                timestamp,
                correlationId: event.correlationId ?? 'corr-1',
                tenantId: event.tenantId ?? 'tenant-1',
                serviceId: event.serviceId ?? 'svc',
                action: event.action ?? 'action',
                outcome: event.outcome ?? 'success',
                message: event.message ?? 'msg',
                details: event.details ?? {},
                complianceRelevant: event.complianceRelevant ?? true,
                complianceFrameworks: event.complianceFrameworks ?? ['SOC2'],
                hash,
                signature,
                previousEventHash,
            };
            this.events.push(stored);
            this.lastHash = hash;
            return id;
        }
        async queryEvents(_query) {
            return [...this.events];
        }
        async generateComplianceReport(framework, start, end) {
            return {
                framework,
                period: { start, end },
                summary: {
                    totalEvents: this.events.length,
                    criticalEvents: this.events.filter((e) => e.level === 'critical').length,
                    violations: 0,
                    complianceScore: 100,
                },
                violations: [],
                recommendations: [],
            };
        }
        mutateEvent(index, update) {
            this.events[index] = { ...this.events[index], ...update };
        }
    }
    class FakeWorm {
        entries = [];
        async addAuditEntry(entry) {
            this.entries.push(entry);
        }
    }
    const buildService = (auditSystem = new FakeAuditSystem(), worm = new FakeWorm()) => ({
        service: new ComprehensiveAuditLoggingService_js_1.ComprehensiveAuditLoggingService(auditSystem, {
            signingKey,
            worm: worm,
        }),
        auditSystem,
        worm,
    });
    (0, globals_1.it)('records events with tamper-proof metadata and WORM forwarding', async () => {
        const { service, auditSystem, worm } = buildService();
        const { eventId } = await service.recordComprehensiveEvent({
            eventType: 'resource_access',
            action: 'view',
            tenantId: 'tenant-a',
            serviceId: 'intelgraph-api',
            correlationId: 'corr-123',
            message: 'Viewed resource',
            outcome: 'success',
            userId: 'user-1',
            resourceId: 'res-1',
            details: { field: 'value' },
            complianceFrameworks: ['SOC2', 'GDPR'],
        });
        (0, globals_1.expect)(eventId).toBe('1');
        (0, globals_1.expect)(auditSystem.events[0].previousEventHash).toBeUndefined();
        (0, globals_1.expect)(worm.entries).toHaveLength(1);
        (0, globals_1.expect)(worm.entries[0]).toMatchObject({
            action: 'view',
            eventType: 'resource_access',
            resource: 'res-1',
            classification: 'internal',
        });
    });
    (0, globals_1.it)('verifies tamper-proof trail and detects hash or signature issues', async () => {
        const { service, auditSystem } = buildService();
        await service.recordComprehensiveEvent({
            eventType: 'resource_access',
            action: 'view',
            tenantId: 'tenant-a',
            serviceId: 'svc',
            correlationId: 'corr',
            message: 'first',
            outcome: 'success',
        });
        await service.recordComprehensiveEvent({
            eventType: 'resource_modify',
            action: 'update',
            tenantId: 'tenant-a',
            serviceId: 'svc',
            correlationId: 'corr',
            message: 'second',
            outcome: 'success',
        });
        let verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
        (0, globals_1.expect)(verification.valid).toBe(true);
        auditSystem.mutateEvent(1, { previousEventHash: 'tampered' });
        verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
        (0, globals_1.expect)(verification.valid).toBe(false);
        (0, globals_1.expect)(verification.failures[0]).toMatchObject({ reason: 'hash_chain_mismatch' });
        auditSystem.mutateEvent(1, { previousEventHash: auditSystem.events[0].hash, signature: 'bad' });
        verification = await service.verifyTamperProofTrail({ tenantIds: ['tenant-a'] });
        (0, globals_1.expect)(verification.valid).toBe(false);
        (0, globals_1.expect)(verification.failures.some((f) => f.reason === 'invalid_signature')).toBe(true);
    });
    (0, globals_1.it)('produces compliance evidence that bundles reports and integrity results', async () => {
        const { service } = buildService();
        const start = new Date('2024-01-01');
        const end = new Date('2024-02-01');
        await service.recordComprehensiveEvent({
            eventType: 'policy_decision',
            action: 'allow',
            tenantId: 'tenant-a',
            serviceId: 'svc',
            correlationId: 'corr',
            message: 'policy allow',
            outcome: 'success',
            level: 'critical',
        });
        const evidence = await service.generateComplianceEvidence('SOC2', start, end, {
            tenantIds: ['tenant-a'],
        });
        (0, globals_1.expect)(evidence.report.summary.totalEvents).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(evidence.integrity.valid).toBe(true);
        (0, globals_1.expect)(evidence.report.framework).toBe('SOC2');
    });
});
