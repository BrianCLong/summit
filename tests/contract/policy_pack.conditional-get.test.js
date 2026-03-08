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
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
async function startServerFromSource() {
    const { createApp } = await Promise.resolve().then(() => __importStar(require('../../server/src/app.ts')));
    const app = await createApp();
    return new Promise((resolve) => {
        const srv = node_http_1.default.createServer(app);
        srv.listen(0, () => {
            const addr = srv.address();
            const port = typeof addr === 'object' && addr ? addr.port : 0;
            resolve({ url: `http://127.0.0.1:${port}`, close: () => srv.close() });
        });
    });
}
describe('Policy pack route — conditional GET', () => {
    const manifestPath = node_path_1.default.resolve(process.cwd(), 'contracts/policy-pack/v0/manifest.json');
    const tarPath = node_path_1.default.resolve(process.cwd(), 'dist/policy-pack/v0/policy-pack-v0.tar');
    beforeAll(() => {
        expect(node_fs_1.default.existsSync(tarPath)).toBe(true);
        expect(node_fs_1.default.existsSync(manifestPath)).toBe(true);
    });
    it('responds 304 with matching If-None-Match', async () => {
        const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf8'));
        const etag = `W/"sha-256:${manifest.manifest.digest.value}"`;
        const { url, close } = await startServerFromSource();
        try {
            const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, {
                headers: { 'If-None-Match': etag },
            });
            expect(res.status).toBe(304);
            expect(res.headers.get('ETag')).toBe(etag);
            expect(res.headers.get('Last-Modified')).toBeTruthy();
        }
        finally {
            close();
        }
    });
    it('responds 200 with body when ETag does not match', async () => {
        const { url, close } = await startServerFromSource();
        try {
            const res = await fetch(`${url}/v1/policy/packs/policy-pack-v0`, {
                headers: { 'If-None-Match': 'W/"sha-256:deadbeef"' },
            });
            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toContain('application/vnd.intelgraph.policy+tar');
            const buf = Buffer.from(await res.arrayBuffer());
            expect(buf.byteLength).toBeGreaterThan(0);
        }
        finally {
            close();
        }
    });
});
