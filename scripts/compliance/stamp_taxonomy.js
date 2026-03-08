"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const taxonomyPath = node_path_1.default.join(process.cwd(), 'governance/taxonomy.v1.json');
const evidenceDir = node_path_1.default.join(process.cwd(), 'evidence');
if (!node_fs_1.default.existsSync(evidenceDir)) {
    node_fs_1.default.mkdirSync(evidenceDir, { recursive: true });
}
const content = node_fs_1.default.readFileSync(taxonomyPath, 'utf-8');
const taxonomy = JSON.parse(content);
const hash = node_crypto_1.default.createHash('sha256').update(content).digest('hex');
const stamp = {
    artifact: 'taxonomy',
    version: taxonomy.version,
    hash: hash,
    timestamp: new Date().toISOString(),
    verified: true,
    risk_framework: 'EU_AI_ACT_ALIGNED'
};
const stampPath = node_path_1.default.join(evidenceDir, 'taxonomy.stamp.json');
node_fs_1.default.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
console.log(`✅ Taxonomy stamp created at ${stampPath}`);
console.log(`   Hash: ${hash}`);
