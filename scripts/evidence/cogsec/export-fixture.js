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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const FIXTURE_DIR = path.join(process.cwd(), 'GOLDEN', 'datasets', 'cogsec-io-feb2026');
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'evidence', 'cogsec-fixture');
function generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
async function exportFixture() {
    ensureDirSync(OUTPUT_DIR);
    // 1. Read input fixture
    const fixturePath = path.join(FIXTURE_DIR, 'campaign_fixture.json');
    if (!fs.existsSync(fixturePath)) {
        console.error(`Fixture not found at ${fixturePath}`);
        process.exit(1);
    }
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    // 2. Report JSON
    const reportData = {
        campaign: fixtureData.campaign,
        targets: fixtureData.targets,
        narratives: fixtureData.narratives,
        tempo: fixtureData.tempo
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(reportData, null, 2));
    // 3. Metrics JSON
    const metricsData = {
        targetCount: fixtureData.targets.length,
        narrativeCount: fixtureData.narratives.length,
        confidence: fixtureData.campaign.confidence
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metricsData, null, 2));
    // 4. Stamp JSON - MUST be deterministic (no wall-clock timestamps)
    const inputsHash = generateHash(fixtureData);
    const stampData = {
        schemaVersion: "1.0.0",
        inputsHash: inputsHash,
        gitSha: process.env.GIT_COMMIT_SHA || "unknown"
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'stamp.json'), JSON.stringify(stampData, null, 2));
    console.log(`Evidence exported successfully to ${OUTPUT_DIR}`);
}
exportFixture().catch(console.error);
