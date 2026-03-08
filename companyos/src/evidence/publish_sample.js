"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const publisher_js_1 = require("./publisher.js");
function readReleaseId() {
    if (process.env.RELEASE_ID)
        return process.env.RELEASE_ID;
    // Try Kubernetes downward API mounted file
    try {
        const labels = node_fs_1.default.readFileSync('/etc/podinfo/labels', 'utf8');
        const m = labels.match(/release-id="([^"]+)"/);
        if (m)
            return m[1];
    }
    catch { }
    return undefined;
}
async function main() {
    const releaseId = readReleaseId() ?? `rel_${Date.now()}`;
    const artifacts = [
        { type: 'sbom', sha256: node_crypto_1.default.randomBytes(32).toString('hex') },
        { type: 'tests', sha256: node_crypto_1.default.randomBytes(32).toString('hex') },
    ];
    const res = await (0, publisher_js_1.publishEvidence)(releaseId, 'companyos', artifacts);
    console.log('publishEvidence:', res);
}
if (process.env.NODE_ENV !== 'test') {
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
