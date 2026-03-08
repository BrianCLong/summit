"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const index_1 = require("../../clients/cos-policy-fetcher/src/index");
const node_child_process_1 = require("node:child_process");
const PACK_TAR = node_path_1.default.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
const BUNDLE_JSON = node_path_1.default.resolve(process.cwd(), 'contracts/policy-pack/v0/signing/cosign.bundle.json');
const MANIFEST = node_path_1.default.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
function startStubServer() {
    return new Promise((resolve) => {
        const srv = node_http_1.default.createServer((req, res) => {
            if (req.url?.includes('/v1/policy/packs/policy-pack-v0')) {
                const manifest = JSON.parse(node_fs_1.default.readFileSync(MANIFEST, 'utf8'));
                res.setHeader('Content-Type', 'application/vnd.intelgraph.policy+tar');
                const digestValue = manifest?.manifest?.digest?.value || manifest?.digest?.value;
                res.setHeader('Digest', `sha-256=${digestValue}`);
                res.setHeader('X-Cosign-Bundle', node_fs_1.default.readFileSync(BUNDLE_JSON, 'utf8'));
                node_fs_1.default.createReadStream(PACK_TAR).pipe(res);
            }
            else {
                res.statusCode = 404;
                res.end();
            }
        });
        srv.listen(0, () => {
            const addr = srv.address();
            const port = typeof addr === 'object' && addr ? addr.port : 0;
            resolve({
                url: `http://127.0.0.1:${port}/v1/policy/packs/policy-pack-v0`,
                close: () => srv.close(),
            });
        });
    });
}
// Utility: opa eval via CLI to confirm policy semantics did not drift
function opaEval(query, input, policyDir) {
    const r = (0, node_child_process_1.spawnSync)('opa', [
        'eval',
        query,
        '--format',
        'values',
        '--data',
        node_path_1.default.join(policyDir, 'opa'),
        '--input',
        '-',
    ], {
        input: JSON.stringify(input),
        encoding: 'utf8',
    });
    if (r.status !== 0)
        throw new Error(r.stderr.toString());
    return r.stdout.toString().trim();
}
describe('Policy Pack contract', () => {
    it('verifies signature and enforces ABAC allow for same-tenant', async () => {
        // Precondition: artifacts exist (built + signed)
        expect(node_fs_1.default.existsSync(PACK_TAR)).toBe(true);
        expect(node_fs_1.default.existsSync(BUNDLE_JSON)).toBe(true);
        const { url, close } = await startStubServer();
        try {
            const unpacked = await (0, index_1.fetchAndVerify)({ url });
            const decision = opaEval('data.cos.abac.allow', {
                subject: { tenant: 't1', purpose: 'investigation' },
                resource: { tenant: 't1', retention_until: '2099-01-01T00:00:00Z' },
            }, unpacked);
            expect(decision).toEqual('true');
        }
        finally {
            close();
        }
    });
    it('denies cross-tenant access', async () => {
        const { url, close } = await startStubServer();
        try {
            const unpacked = await (0, index_1.fetchAndVerify)({ url });
            const decision = opaEval('data.cos.abac.allow', {
                subject: { tenant: 'tA', purpose: 'investigation' },
                resource: { tenant: 'tB', retention_until: '2099-01-01T00:00:00Z' },
            }, unpacked);
            expect(decision).toEqual('false');
        }
        finally {
            close();
        }
    });
});
