"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const ops_js_1 = __importDefault(require("../ops.js"));
const actions_js_1 = require("../actions.js");
const bundleStore_js_1 = require("../../policy/bundleStore.js");
const ActionPolicyService_js_1 = require("../../services/ActionPolicyService.js");
globals_1.jest.mock('../../scripts/maintenance.js', () => ({ runMaintenance: globals_1.jest.fn() }));
globals_1.jest.mock('../../audit/emit.js', () => ({
    emitAuditEvent: globals_1.jest.fn().mockResolvedValue('audit-id'),
}));
globals_1.jest.mock('../../middleware/auth.js', () => ({
    ensureAuthenticated: (_req, _res, next) => {
        _req.user = { id: 'admin', role: 'ADMIN', tenantId: 'tenant-1' };
        next();
    },
    ensureRole: () => (_req, _res, next) => next(),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        req.correlationId = 'corr-test';
        req.user = { id: 'admin', role: 'ADMIN', tenantId: 'tenant-1' };
        next();
    });
    app.use('/', ops_js_1.default);
    app.use('/api/actions', actions_js_1.actionsRouter);
    return app;
};
async function writeBundle(tmp, bundleId, version) {
    const bundle = {
        tenantId: 'tenant-1',
        bundleId,
        metadata: {},
        baseProfile: {
            id: 'base',
            version,
            regoPackage: 'actions',
            entrypoints: ['main'],
            guardrails: {},
            crossTenant: { mode: 'deny', allow: [], requireAgreements: true },
            rules: [
                {
                    id: 'rule-1',
                    effect: 'allow',
                    conditions: {},
                },
            ],
        },
        overlays: [],
    };
    const file = path_1.default.join(tmp, `${bundleId}.bundle`);
    await promises_1.default.writeFile(file, JSON.stringify(bundle));
    return { file, id: bundleId };
}
describeIf('policy hot reload endpoints', () => {
    const tmpDir = path_1.default.join(os_1.default.tmpdir(), 'policy-hot-reload-tests');
    const originalHotReload = process.env.POLICY_HOT_RELOAD;
    const originalUnsigned = process.env.ALLOW_UNSIGNED_POLICY;
    (0, globals_1.beforeAll)(async () => {
        await promises_1.default.mkdir(tmpDir, { recursive: true });
    });
    (0, globals_1.beforeEach)(() => {
        process.env.POLICY_HOT_RELOAD = 'true';
        process.env.ALLOW_UNSIGNED_POLICY = 'true';
        bundleStore_js_1.policyBundleStore.reset();
    });
    (0, globals_1.afterAll)(async () => {
        process.env.POLICY_HOT_RELOAD = originalHotReload;
        process.env.ALLOW_UNSIGNED_POLICY = originalUnsigned;
        await promises_1.default.rm(tmpDir, { recursive: true, force: true });
    });
    (0, globals_1.it)('reloads bundle versions and updates current policy', async () => {
        const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
        const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
        const app = buildApp();
        await (0, supertest_1.default)(app)
            .post('/ops/policy/reload')
            .send({ bundlePath: bundle1 })
            .expect(200);
        (0, globals_1.expect)(bundleStore_js_1.policyBundleStore.currentPolicyVersionId).toBe('bundle-one');
        await (0, supertest_1.default)(app)
            .post('/ops/policy/reload')
            .send({ bundlePath: bundle2 })
            .expect(200);
        (0, globals_1.expect)(bundleStore_js_1.policyBundleStore.currentPolicyVersionId).toBe('bundle-two');
        (0, globals_1.expect)(bundleStore_js_1.policyBundleStore.list().length).toBe(2);
    });
    (0, globals_1.it)('keeps pinned requests on their version while current advances', async () => {
        const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
        const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
        const app = buildApp();
        await (0, supertest_1.default)(app).post('/ops/policy/reload').send({ bundlePath: bundle1 });
        await (0, supertest_1.default)(app).post('/ops/policy/reload').send({ bundlePath: bundle2 });
        const observedContexts = [];
        const evaluateSpy = globals_1.jest
            .spyOn(ActionPolicyService_js_1.ActionPolicyService.prototype, 'evaluateWithOpa')
            .mockImplementation(async (req, requestHash, _meta, version) => {
            observedContexts.push(req.context);
            return {
                allow: true,
                policy_version: version,
                obligations: [],
                reason: requestHash,
            };
        });
        const pinned = await (0, supertest_1.default)(app)
            .post('/api/actions/preflight')
            .send({
            action: 'EXPORT_CASE',
            policyVersion: 'bundle-one',
            context: { policyVersion: 'bundle-one' },
        })
            .expect(200);
        (0, globals_1.expect)(evaluateSpy).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(evaluateSpy).toHaveBeenCalledWith(globals_1.expect.any(Object), globals_1.expect.any(String), globals_1.expect.any(Object), 'bundle-one');
        (0, globals_1.expect)(observedContexts[0]?.policyVersion).toBe('bundle-one');
        (0, globals_1.expect)(pinned.body.decision.policyVersion).toBe('bundle-one');
        const current = await (0, supertest_1.default)(app)
            .post('/api/actions/preflight')
            .send({ action: 'EXPORT_CASE' })
            .expect(200);
        (0, globals_1.expect)(evaluateSpy).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(evaluateSpy).toHaveBeenLastCalledWith(globals_1.expect.any(Object), globals_1.expect.any(String), globals_1.expect.any(Object), 'bundle-two');
        (0, globals_1.expect)(current.body.decision.policyVersion).toBe('bundle-two');
        evaluateSpy.mockRestore();
    });
    (0, globals_1.it)('rolls back to a prior version when requested', async () => {
        const { file: bundle1 } = await writeBundle(tmpDir, 'bundle-one', '1.0.0');
        const { file: bundle2 } = await writeBundle(tmpDir, 'bundle-two', '2.0.0');
        const app = buildApp();
        await (0, supertest_1.default)(app).post('/ops/policy/reload').send({ bundlePath: bundle1 });
        await (0, supertest_1.default)(app).post('/ops/policy/reload').send({ bundlePath: bundle2 });
        await (0, supertest_1.default)(app)
            .post('/ops/policy/rollback')
            .query({ toVersion: 'bundle-one' })
            .expect(200);
        (0, globals_1.expect)(bundleStore_js_1.policyBundleStore.currentPolicyVersionId).toBe('bundle-one');
    });
});
