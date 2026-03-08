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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const service_js_1 = require("../src/service.js");
const quantum_safe_ledger_js_1 = require("../src/quantum-safe-ledger.js");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const grpc_js_1 = require("../src/grpc.js");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
function buildSignature(fact) {
    const hybrid = (0, quantum_safe_ledger_js_1.generateHybridKeyPair)();
    const hash = (0, quantum_safe_ledger_js_1.computeLedgerHash)(fact, fact.timestamp);
    const signature = (0, quantum_safe_ledger_js_1.signHybrid)(hash, hybrid);
    return { signature, hybrid };
}
(0, vitest_1.describe)('LedgerService REST and GraphQL', () => {
    const now = () => new Date('2024-01-01T00:00:00.000Z');
    const service = new service_js_1.LedgerService({ now });
    const app = (0, express_1.default)();
    app.use((0, service_js_1.buildLedgerRouter)(service));
    (0, vitest_1.it)('accepts claims and exports manifests', async () => {
        const fact = {
            id: 'claim-1',
            category: 'intel',
            actor: 'alice',
            action: 'publish',
            resource: 'report-1',
            payload: { classification: 'secret' },
            timestamp: now().toISOString(),
        };
        const { signature } = buildSignature(fact);
        const accessToken = service.issueAccess('alice', 'intel');
        const claimResp = await (0, supertest_1.default)(app)
            .post('/ledger/claim')
            .send({ caseId: 'case-1', fact, signature, accessToken })
            .expect(201);
        (0, vitest_1.expect)(claimResp.body.entry.id).toBe('claim-1');
        const exportResp = await (0, supertest_1.default)(app).get('/ledger/export/case-1').expect(200);
        (0, vitest_1.expect)(exportResp.body.manifest.transforms).toHaveLength(1);
        (0, vitest_1.expect)(exportResp.body.manifest.ledgerHead).toBeTruthy();
    });
    (0, vitest_1.it)('serves GraphQL manifest and entries', async () => {
        const query = `query { prov_entries(caseId:"case-1", limit:5) { id } prov_manifest(caseId:"case-1") { caseId version merkleRoot } }`;
        const resp = await (0, supertest_1.default)(app)
            .post('/graphql')
            .send({ query })
            .expect(200);
        (0, vitest_1.expect)(resp.body.data.prov_entries.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(resp.body.data.prov_manifest.caseId).toBe('case-1');
    });
});
(0, vitest_1.describe)('LedgerService gRPC', () => {
    const now = () => new Date('2024-02-02T00:00:00.000Z');
    const service = new service_js_1.LedgerService({ now });
    let server;
    let client;
    (0, vitest_1.beforeAll)(async () => {
        await new Promise((resolve) => {
            server = (0, grpc_js_1.createGrpcServer)(service, {
                bind: '0.0.0.0:0',
                onReady: (port) => {
                    const protoPath = node_path_1.default.join(__dirname, '../src/proto/prov-ledger.proto');
                    const pkgDef = protoLoader.loadSync(protoPath, { longs: String, enums: String, defaults: true });
                    const pkg = grpc.loadPackageDefinition(pkgDef);
                    client = new pkg.prov.Ledger(`localhost:${port}`, grpc.credentials.createInsecure());
                    resolve();
                },
            });
        });
    });
    (0, vitest_1.afterAll)(() => {
        server.forceShutdown();
    });
    (0, vitest_1.it)('appends claim and exports manifest over gRPC', async () => {
        const fact = {
            id: 'grpc-1',
            category: 'intel',
            actor: 'bob',
            action: 'create',
            resource: 'asset-9',
            payload: Buffer.from('{}'),
            timestamp: now().toISOString(),
        };
        const { signature } = buildSignature(fact);
        const accessToken = service.issueAccess('bob', 'intel');
        const entry = await new Promise((resolve, reject) => {
            client.AppendClaim({ caseId: 'grpc-case', fact, signature, accessToken }, (err, resp) => {
                if (err)
                    return reject(err);
                resolve(resp.entry);
            });
        });
        (0, vitest_1.expect)(entry.id).toBe('grpc-1');
        const manifest = await new Promise((resolve, reject) => {
            client.ExportManifest({ caseId: 'grpc-case' }, (err, resp) => {
                if (err)
                    return reject(err);
                resolve(resp);
            });
        });
        (0, vitest_1.expect)(manifest.transforms?.length ?? 0).toBeGreaterThan(0);
    });
});
