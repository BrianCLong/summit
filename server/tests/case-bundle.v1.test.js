"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const CaseBundleService_js_1 = require("../src/cases/bundles/CaseBundleService.js");
const FixtureCaseBundleStore_js_1 = require("../src/cases/bundles/FixtureCaseBundleStore.js");
const case_bundles_js_1 = __importDefault(require("../src/routes/case-bundles.js"));
(0, globals_1.describe)('CASE_BUNDLE_V1 export/import workflow', () => {
    const createdPaths = [];
    const service = new CaseBundleService_js_1.CaseBundleService(new FixtureCaseBundleStore_js_1.FixtureCaseBundleStore());
    const originalFlag = process.env.CASE_BUNDLE_V1;
    const canListen = process.env.NO_NETWORK_LISTEN !== 'true';
    (0, globals_1.beforeAll)(() => {
        process.env.CASE_BUNDLE_V1 = '1';
    });
    (0, globals_1.afterEach)(async () => {
        const toDelete = createdPaths.splice(0, createdPaths.length);
        await Promise.all(toDelete.map((p) => promises_1.default.rm(p, { recursive: true, force: true }).catch(() => undefined)));
    });
    (0, globals_1.afterAll)(() => {
        process.env.CASE_BUNDLE_V1 = originalFlag;
    });
    (0, globals_1.it)('produces deterministic bundle hashes and ordered manifests', async () => {
        const first = await service.exportCases(['case-alpha', 'case-bravo']);
        const second = await service.exportCases(['case-alpha', 'case-bravo']);
        createdPaths.push(first.bundlePath, second.bundlePath);
        (0, globals_1.expect)(first.manifest.bundleHash).toBe(second.manifest.bundleHash);
        (0, globals_1.expect)(first.manifest.cases.map((c) => c.id)).toEqual(['case-alpha', 'case-bravo']);
        (0, globals_1.expect)(first.manifest.evidence.map((e) => e.id)[0]).toBe('evidence-alpha-1');
        const firstManifest = JSON.parse(await promises_1.default.readFile(path_1.default.join(first.bundlePath, 'manifest.json'), 'utf-8'));
        const secondManifest = JSON.parse(await promises_1.default.readFile(path_1.default.join(second.bundlePath, 'manifest.json'), 'utf-8'));
        (0, globals_1.expect)(firstManifest.cases.map((c) => c.id)).toEqual(secondManifest.cases.map((c) => c.id));
    });
    (0, globals_1.it)('imports bundles with partial restore scopes and writes a mapping report', async () => {
        const exported = await service.exportCases(['case-alpha']);
        createdPaths.push(exported.bundlePath);
        const imported = await service.importBundle(exported.bundlePath, {
            include: { graph: false },
            namespace: 'restored',
            preserveIds: true,
        });
        (0, globals_1.expect)(imported.mapping.mapping.cases[0].newId).toBe('restored:case-alpha');
        (0, globals_1.expect)(imported.mapping.mapping.graphNodes).toHaveLength(0);
        (0, globals_1.expect)(imported.mapping.warnings).toContain('graph import disabled by include flag');
        const mappingFile = await promises_1.default.readFile(imported.mappingPath, 'utf-8');
        (0, globals_1.expect)(mappingFile).toContain(imported.mapping.sourceBundleHash);
    });
    (0, globals_1.it)('fails fast on integrity mismatches', async () => {
        const exported = await service.exportCases(['case-alpha']);
        createdPaths.push(exported.bundlePath);
        const notePath = path_1.default.join(exported.bundlePath, 'notes', 'note-alpha-1.json');
        await promises_1.default.appendFile(notePath, '\ncorrupt');
        await (0, globals_1.expect)(service.importBundle(exported.bundlePath)).rejects.toThrow('integrity_mismatch');
    });
    (canListen ? globals_1.it : globals_1.it.skip)('exposes export/import endpoints behind the CASE_BUNDLE_V1 flag', async () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/case-bundles', case_bundles_js_1.default);
        const exportResponse = await (0, supertest_1.default)(app)
            .post('/api/case-bundles/export')
            .send({ caseIds: ['case-alpha'], include: { evidence: false, graph: false, notes: true } });
        createdPaths.push(exportResponse.body.bundlePath);
        (0, globals_1.expect)(exportResponse.status).toBe(200);
        (0, globals_1.expect)(exportResponse.body.manifest.bundleHash).toBeDefined();
        const importResponse = await (0, supertest_1.default)(app)
            .post('/api/case-bundles/import')
            .send({
            bundlePath: exportResponse.body.bundlePath,
            include: { evidence: false, graph: false, notes: true },
            namespace: 'api',
        });
        (0, globals_1.expect)(importResponse.status).toBe(200);
        (0, globals_1.expect)(importResponse.body.mapping.skipped).toContain('graph');
    });
});
