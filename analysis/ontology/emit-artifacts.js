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
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitArtifacts = emitArtifacts;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const url_1 = require("url");
const normalize_ai_influence_campaign_1 = require("./normalize-ai-influence-campaign");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
function emitArtifacts() {
    const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');
    const artifactsDir = path.join(__dirname, '../../artifacts/ontology/ai-influence-campaign');
    const schemaPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/ontology.schema.json');
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }
    const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    const fixturePaths = fixtureFiles.map(f => path.join(fixturesDir, f));
    const start = process.hrtime();
    const normalizedData = (0, normalize_ai_influence_campaign_1.normalizeFixtures)(fixturePaths);
    const end = process.hrtime(start);
    // Write report.json
    const reportPath = path.join(artifactsDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(normalizedData, null, 2));
    // Write metrics.json
    const processTimeMs = end[0] * 1000 + end[1] / 1000000;
    const metrics = {
        processed_campaigns: normalizedData.length,
        processing_time_ms: processTimeMs,
        memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024
    };
    fs.writeFileSync(path.join(artifactsDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
    // Generate a hash of the schema to put in stamp
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schemaHash = crypto.createHash('sha256').update(schemaContent).digest('hex');
    // Generate stamp.json
    const stamp = {
        ontology_version: "v0",
        schema_hash: schemaHash,
        fixture_ids: normalizedData.map(d => d.campaign_id),
        generator_version: "1"
    };
    fs.writeFileSync(path.join(artifactsDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
    console.log(`Artifacts emitted successfully in ${processTimeMs.toFixed(2)}ms`);
}
// Execute directly if it is the main module run
if (import.meta.url === `file://${process.argv[1]}`) {
    emitArtifacts();
}
