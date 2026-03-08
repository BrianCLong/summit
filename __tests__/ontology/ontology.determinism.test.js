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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const url_1 = require("url");
const normalize_ai_influence_campaign_1 = require("../../analysis/ontology/normalize-ai-influence-campaign");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
(0, node_test_1.describe)('Ontology Determinism', () => {
    const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');
    (0, node_test_1.it)('should produce identical normalized results on repeated runs', () => {
        const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
        const fixturePaths = fixtureFiles.map(f => path.join(fixturesDir, f));
        const run1 = (0, normalize_ai_influence_campaign_1.normalizeFixtures)(fixturePaths);
        const run2 = (0, normalize_ai_influence_campaign_1.normalizeFixtures)(fixturePaths);
        assert.deepStrictEqual(run1, run2);
        assert.strictEqual(JSON.stringify(run1), JSON.stringify(run2));
    });
});
