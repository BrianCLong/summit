"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vitest_1 = require("vitest");
const __1 = require("../..");
const sampleApiContract = {
    module: 'identity-and-accounts',
    name: 'create-service-account',
    version: 'v1',
    style: 'rest',
    path: '/v1/service-accounts',
    idempotent: true,
    owner: 'identity-platform',
    resources: ['service-account'],
    sla: { latencyMsP99: 250, availabilityPercent: 99.9, errorBudgetPercent: 1 },
};
const sampleEvent = {
    id: 'evt-123',
    source: 'identity-and-accounts',
    type: 'service-account.created',
    specversion: '1.0',
    data: { userId: 'user-1' },
    tenant_id: 'tenant-1',
    resource_id: 'service-account-1',
    provenance: { emitter: 'identity', version: 'v1', domain: 'identity' },
};
(0, vitest_1.describe)('domain identifiers', () => {
    (0, vitest_1.it)('validates canonical identifiers', () => {
        const identifiers = (0, __1.validateIdentifiers)({
            tenantId: 'tenant-123',
            accountId: 'acct-123',
            orgId: 'org-123',
            userId: 'user-123',
            serviceAccountId: 'svc-123',
            workspaceId: 'ws-123',
            teamId: 'team-123',
            roleId: 'role-123',
            planId: 'plan-123',
            entitlementId: 'ent-123',
            resourceId: 'res-123',
            eventId: 'evt-123',
        });
        (0, vitest_1.expect)(identifiers.tenantId).toBe('tenant-123');
    });
});
(0, vitest_1.describe)('contract validation', () => {
    (0, vitest_1.it)('accepts valid API and event contracts', () => {
        const contract = (0, __1.validateApiContract)(sampleApiContract);
        const event = (0, __1.validateEventContract)(sampleEvent);
        (0, vitest_1.expect)(contract.version).toBe('v1');
        (0, vitest_1.expect)(event.tenant_id).toBe('tenant-1');
    });
    (0, vitest_1.it)('detects compatibility regressions', () => {
        const nextContract = {
            ...sampleApiContract,
            resources: ['service-account'],
            sla: { ...sampleApiContract.sla, latencyMsP99: 500 },
        };
        const report = (0, __1.isApiContractCompatible)(sampleApiContract, nextContract);
        (0, vitest_1.expect)(report.compatible).toBe(false);
        (0, vitest_1.expect)(report.reasons).toContain('latency regression');
    });
    (0, vitest_1.it)('detects event field removal as incompatible', () => {
        const nextEvent = { ...sampleEvent, data: {} };
        const result = (0, __1.compareCloudEvents)(sampleEvent, nextEvent);
        (0, vitest_1.expect)(result.compatible).toBe(false);
        (0, vitest_1.expect)(result.issues).toContain('missing data fields: userId');
    });
});
(0, vitest_1.describe)('registry', () => {
    (0, vitest_1.it)('registers canonical contracts', () => {
        const registry = new __1.ContractRegistry();
        registry.register({ api: sampleApiContract, events: [sampleEvent] });
        const stored = registry.get('identity-and-accounts', 'create-service-account', 'v1');
        (0, vitest_1.expect)(stored?.api.name).toBe(sampleApiContract.name);
    });
});
(0, vitest_1.describe)('dependency enforcement', () => {
    (0, vitest_1.it)('detects circular dependencies across workspace packages', () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(process.cwd(), 'dep-graph-'));
        const packagesDir = path_1.default.join(tmpDir, 'packages');
        fs_1.default.mkdirSync(packagesDir);
        ['pkg-a', 'pkg-b'].forEach((dir) => fs_1.default.mkdirSync(path_1.default.join(packagesDir, dir)));
        fs_1.default.writeFileSync(path_1.default.join(packagesDir, 'pkg-a', 'package.json'), JSON.stringify({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '1.0.0' } }, null, 2));
        fs_1.default.writeFileSync(path_1.default.join(packagesDir, 'pkg-b', 'package.json'), JSON.stringify({ name: 'pkg-b', version: '1.0.0', dependencies: { 'pkg-a': '1.0.0' } }, null, 2));
        const result = (0, __1.enforceAcyclicDependencies)(tmpDir);
        (0, vitest_1.expect)(result.compliant).toBe(false);
        (0, vitest_1.expect)(result.cycles[0].sort()).toEqual(['pkg-a', 'pkg-b'].sort());
    });
});
(0, vitest_1.describe)('entitlements', () => {
    (0, vitest_1.it)('enforces limits and detects anomalies', () => {
        const entitlement = { planId: 'pro', module: 'navigation-shell', feature: 'command-palette', limit: 100 };
        const usage = [
            { tenantId: 't-1', feature: 'command-palette', count: 30, occurredAt: new Date() },
            { tenantId: 't-1', feature: 'command-palette', count: 60, occurredAt: new Date() },
        ];
        const evalResult = (0, __1.evaluateEntitlement)(entitlement, usage);
        (0, vitest_1.expect)(evalResult.allowed).toBe(true);
        (0, vitest_1.expect)(evalResult.remaining).toBe(10);
        const anomalies = (0, __1.detectUsageAnomalies)(entitlement, [...usage, { tenantId: 't-1', feature: 'command-palette', count: 300, occurredAt: new Date() }]);
        (0, vitest_1.expect)(anomalies[0].actual).toBeGreaterThan(entitlement.limit);
    });
    (0, vitest_1.it)('calculates proration with unused credit and upgrades', () => {
        const credit = (0, __1.calculateProratedCredit)({ oldLimit: 100, newLimit: 200, daysUsed: 10, daysInPeriod: 30 });
        (0, vitest_1.expect)(credit).toBeGreaterThan(0);
    });
});
