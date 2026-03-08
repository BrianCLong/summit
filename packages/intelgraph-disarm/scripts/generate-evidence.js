"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_ts_1 = require("../src/index.ts");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
// Helper for deterministic stringify
function deterministicStringify(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(deterministicStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => `"${key}":${deterministicStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
}
function generateEvidence() {
    try {
        const taxonomy = (0, index_ts_1.loadDisarmTaxonomy)();
        const canonicalJson = deterministicStringify(taxonomy);
        const hash = node_crypto_1.default.createHash('sha256').update(canonicalJson).digest('hex');
        const evidenceId = node_crypto_1.default.randomUUID();
        const evidence = {
            evidence_id: evidenceId,
            timestamp: new Date().toISOString(),
            artifact_type: 'disarm_taxonomy',
            schema_version: taxonomy.version,
            content_hash: hash,
            content: taxonomy,
        };
        const outputDir = node_path_1.default.resolve(__dirname, '../../../docs/evidence/moat');
        if (!node_fs_1.default.existsSync(outputDir)) {
            node_fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = node_path_1.default.join(outputDir, 'PR-0-disarm-taxonomy.evidence.json');
        node_fs_1.default.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
        console.log(`Evidence generated at: ${outputPath}`);
        console.log(`Evidence ID: ${evidenceId}`);
        console.log(`Content Hash: ${hash}`);
    }
    catch (error) {
        console.error('Failed to generate evidence:', error);
        process.exit(1);
    }
}
generateEvidence();
