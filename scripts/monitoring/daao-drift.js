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
const url_1 = require("url");
const heuristicDifficultyScorer_js_1 = require("../../agents/orchestrator/src/daao/difficulty/heuristicDifficultyScorer.js");
const llmRouter_js_1 = require("../../agents/orchestrator/src/daao/routing/llmRouter.js");
const modelCatalog_js_1 = require("../../agents/orchestrator/src/daao/routing/modelCatalog.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
    const fixturesPath = path.join(__dirname, 'fixtures', 'daao-prompts.json');
    const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
    const scorer = new heuristicDifficultyScorer_js_1.HeuristicDifficultyScorer();
    const catalog = new modelCatalog_js_1.DefaultModelCatalog();
    const router = new llmRouter_js_1.CostAwareLLMRouter(catalog);
    const results = [];
    for (const fixture of fixtures) {
        const difficulty = await scorer.estimate(fixture.text);
        const decision = await router.route(difficulty, { budget: 0.5 }); // Fixed budget for drift check
        results.push({
            fixtureId: fixture.id,
            difficultyBand: difficulty.band,
            modelId: decision.modelId,
            estimatedCost: decision.estimatedWorstCaseCost,
            reasons: decision.reasons
        });
    }
    const outDir = path.join(__dirname, 'out');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }
    const outFile = path.join(outDir, 'daao-drift.json');
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Drift check complete. Results written to ${outFile}`);
}
main().catch(console.error);
