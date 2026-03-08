"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
globals_1.jest.mock('../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    })),
    getRedisClient: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        quit: globals_1.jest.fn(),
        subscribe: globals_1.jest.fn(),
    })),
}));
const orchestrator_js_1 = require("../src/cases/legal-hold/orchestrator.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('LegalHoldOrchestrator', () => {
    const baseScope = {
        connectors: ['s3-archive', 'o365'],
        dataSets: ['mailbox', 'drive'],
        searchTerms: ['contract', 'litigation'],
        retentionOverrideDays: 3650,
    };
    const baseInput = {
        caseId: 'case-001',
        holdName: 'Contoso v. Northwind',
        reason: 'Pending litigation discovery obligations',
        issuedBy: {
            id: 'user-legal',
            name: 'Legal Ops',
            role: 'legal_admin',
        },
        custodians: [
            { id: 'cust-1', name: 'Alex Legal', email: 'alex@example.com' },
            { id: 'cust-2', name: 'Robin Compliance', email: 'robin@example.com' },
        ],
        scope: baseScope,
        notificationTemplateId: 'LEGAL_HOLD_NOTICE',
        eDiscovery: {
            enabled: true,
            exportFormats: ['pst', 'zip'],
            matterId: 'matter-42',
        },
    };
    let repository;
    let connectors;
    let notificationDispatcher;
    let chainOfCustody;
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        repository = new orchestrator_js_1.InMemoryLegalHoldRepository();
        connectors = [
            new FakeConnector('s3-archive', {
                supportsVerification: true,
                supportsExport: true,
            }),
            new FakeConnector('o365', {
                supportsVerification: true,
                supportsExport: true,
            }),
        ];
        notificationDispatcher = new MockNotificationDispatcher();
        chainOfCustody = new MockChainOfCustody();
        orchestrator = new orchestrator_js_1.LegalHoldOrchestrator({
            repository,
            connectors,
            notificationDispatcher,
            chainOfCustody,
            lifecyclePolicies: [
                {
                    policyId: 'retention-001',
                    policyName: 'Default email retention',
                    retentionDays: 365,
                    suspensionApplied: false,
                    notes: 'Baseline policy',
                },
            ],
            auditWriter: async () => {
                // swallow for tests
            },
        });
    });
    (0, globals_1.it)('initiates legal hold across connectors with notifications and audit trail', async () => {
        const hold = await orchestrator.initiateHold(baseInput);
        (0, globals_1.expect)(hold.status).toBe('ACTIVE');
        (0, globals_1.expect)(connectors[0].applyHoldCalls).toBe(1);
        (0, globals_1.expect)(connectors[1].applyHoldCalls).toBe(1);
        (0, globals_1.expect)(notificationDispatcher.sent).toBe(1);
        (0, globals_1.expect)(chainOfCustody.appended).toBe(1);
        const auditPackage = await orchestrator.generateAuditPackage(hold.holdId);
        (0, globals_1.expect)(auditPackage.auditTrail.map((entry) => entry.action)).toContain('LEGAL_HOLD_INITIATED');
        (0, globals_1.expect)(auditPackage.auditTrail.map((entry) => entry.action)).toContain('LEGAL_HOLD_PRESERVATION_COMPLETE');
    });
    (0, globals_1.it)('verifies preservation state for connectors supporting verification', async () => {
        const hold = await orchestrator.initiateHold(baseInput);
        const verifications = await orchestrator.verifyPreservation(hold.holdId);
        (0, globals_1.expect)(verifications).toHaveLength(2);
        (0, globals_1.expect)(verifications.every((v) => v.verified)).toBe(true);
    });
    (0, globals_1.it)('tracks custodian acknowledgement and compliance checkpoints', async () => {
        const hold = await orchestrator.initiateHold(baseInput);
        await orchestrator.recordCustodianAcknowledgement(hold.holdId, 'cust-1', {
            id: 'cust-1',
            role: 'employee',
        });
        const checkpoints = await orchestrator.runComplianceMonitoring(hold.holdId);
        const acknowledgementCheckpoint = checkpoints.find((checkpoint) => checkpoint.checkId === 'custodian_acknowledgement');
        (0, globals_1.expect)(acknowledgementCheckpoint).toBeDefined();
        (0, globals_1.expect)(acknowledgementCheckpoint?.status).toBe('warning');
    });
    (0, globals_1.it)('collects e-discovery exports from connectors that support exports', async () => {
        const hold = await orchestrator.initiateHold(baseInput);
        const exports = await orchestrator.prepareEDiscoveryExport(hold.holdId, {
            exportFormat: 'pst',
            searchTerms: ['contract'],
        });
        (0, globals_1.expect)(exports).toHaveLength(2);
        (0, globals_1.expect)(exports.every((ex) => ex.exportPath.includes(hold.holdId))).toBe(true);
    });
    (0, globals_1.it)('releases legal hold and updates statuses', async () => {
        const hold = await orchestrator.initiateHold(baseInput);
        await orchestrator.releaseHold(hold.holdId, { id: 'user-legal', role: 'legal_admin' }, 'Case closed');
        const released = await repository.getById(hold.holdId);
        (0, globals_1.expect)(released?.status).toBe('RELEASED');
        (0, globals_1.expect)(connectors.every((connector) => connector.releaseHoldCalls === 1)).toBe(true);
    });
    (0, globals_1.it)('automates preservation with sealing and exports', async () => {
        const result = await orchestrator.automatePreservation(baseInput);
        (0, globals_1.expect)(result.verifications.every((v) => v.verified)).toBe(true);
        (0, globals_1.expect)(result.exports?.length).toBe(2);
        (0, globals_1.expect)(result.tamperSeal?.hash).toBeDefined();
        (0, globals_1.expect)(result.tamperSeal?.signature).toBeDefined();
        (0, globals_1.expect)(chainOfCustody.appended).toBe(2);
        const persisted = await repository.getById(result.hold.holdId);
        (0, globals_1.expect)(persisted?.tamperSeal?.hash).toBe(result.tamperSeal?.hash);
        (0, globals_1.expect)(persisted?.tamperSeal?.createdAt instanceof Date).toBe(true);
        (0, globals_1.expect)(persisted?.createdAt instanceof Date).toBe(true);
    });
    (0, globals_1.it)('blocks e-discovery exports when the hold does not enable them', async () => {
        const hold = await orchestrator.initiateHold({
            ...baseInput,
            eDiscovery: { enabled: false },
        });
        await (0, globals_1.expect)(orchestrator.prepareEDiscoveryExport(hold.holdId, {
            exportFormat: 'pst',
        })).rejects.toThrow('eDiscovery exports are not enabled');
    });
});
class FakeConnector {
    id;
    displayName;
    supportsVerification;
    supportsExport;
    applyHoldCalls = 0;
    releaseHoldCalls = 0;
    constructor(id, options = {}) {
        this.id = id;
        this.displayName = `${id} connector`;
        this.supportsVerification = options.supportsVerification ?? true;
        this.supportsExport = options.supportsExport ?? true;
    }
    async applyHold(input) {
        this.applyHoldCalls += 1;
        return {
            connectorId: this.id,
            referenceId: `${this.id}:${input.holdId}`,
            status: 'applied',
            location: `/preservation/${this.id}/${input.holdId}`,
        };
    }
    async verifyHold(holdId, _caseId, _scope) {
        return {
            connectorId: this.id,
            referenceId: `${this.id}:${holdId}`,
            verified: true,
            details: 'Retention lock active',
            checkedAt: new Date(),
        };
    }
    async collectPreservedData(request) {
        if (!this.supportsExport) {
            throw new Error('Export not supported');
        }
        return {
            connectorId: this.id,
            exportPath: `/exports/${request.holdId}/${this.id}.${request.exportFormat ?? 'zip'}`,
            format: request.exportFormat ?? 'zip',
            itemCount: 42,
            generatedAt: new Date(),
        };
    }
    async releaseHold(_holdId, _caseId) {
        this.releaseHoldCalls += 1;
    }
}
class MockNotificationDispatcher {
    sent = 0;
    async sendNotification() {
        this.sent += 1;
        return { id: `notif-${this.sent}`, status: 'sent' };
    }
}
class MockChainOfCustody {
    appended = 0;
    keys = (0, crypto_1.generateKeyPairSync)('ed25519');
    async appendEvent() {
        this.appended += 1;
        return `hash-${this.appended}`;
    }
    async verify() {
        return true;
    }
    getSigningKeys() {
        return this.keys;
    }
}
