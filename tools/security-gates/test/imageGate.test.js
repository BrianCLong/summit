"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const imageGate_ts_1 = require("../src/imageGate.ts");
(0, node_test_1.test)('fails when artifacts are missing', async () => {
    const config = {
        stageImages: [
            {
                name: 'ghcr.io/example/app@sha256:bad',
                digest: 'sha256:bad',
                signaturePath: 'missing.sig',
                provenancePath: 'missing.intoto.jsonl'
            }
        ]
    };
    const result = await (0, imageGate_ts_1.enforceImageGate)(process.cwd(), config);
    node_assert_1.default.strictEqual(result.ok, false);
    node_assert_1.default.ok(result.details.length > 0);
});
(0, node_test_1.test)('passes when digest, signature, and provenance are present', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'image-gate-'));
    const sigPath = node_path_1.default.join(tmpDir, 'sig');
    const provPath = node_path_1.default.join(tmpDir, 'prov');
    node_fs_1.default.writeFileSync(sigPath, 'signature');
    node_fs_1.default.writeFileSync(provPath, 'provenance');
    const config = {
        stageImages: [
            {
                name: 'ghcr.io/example/app@sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
                digest: 'sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
                signaturePath: sigPath,
                provenancePath: provPath
            }
        ]
    };
    const result = await (0, imageGate_ts_1.enforceImageGate)('/', config);
    node_assert_1.default.strictEqual(result.ok, true);
});
