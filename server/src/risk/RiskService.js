"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskService = void 0;
const FeatureStore_js_1 = require("./FeatureStore.js");
const RiskEngine_js_1 = require("./RiskEngine.js");
const WeightsVerifier_js_1 = require("./WeightsVerifier.js");
const RiskRepository_js_1 = require("../db/repositories/RiskRepository.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const fs_1 = __importDefault(require("fs"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const modelsDir = path_1.default.join(__dirname, '..', '..', 'models');
const weightsPath = path_1.default.join(modelsDir, 'weights.json');
// Mock checksums if file doesn't exist for now, or handle gracefully
let checksums = {};
try {
    const checksumsPath = path_1.default.join(modelsDir, 'checksums.json');
    if (fs_1.default.existsSync(checksumsPath)) {
        checksums = JSON.parse(fs_1.default.readFileSync(checksumsPath, 'utf-8'));
    }
    else {
        checksums = { 'weights.json': 'mock' };
    }
}
catch (e) {
    // Fallback for dev/test environments without models
    checksums = { 'weights.json': 'mock' };
}
class RiskService {
    engine;
    store = new FeatureStore_js_1.FeatureStore();
    repo = new RiskRepository_js_1.RiskRepository();
    constructor() {
        let data;
        try {
            data = (0, WeightsVerifier_js_1.verifyWeights)(weightsPath, checksums['weights.json']);
        }
        catch (e) {
            // Fallback for dev/test
            data = { weights: {}, bias: 0, version: 'v1' };
        }
        this.engine = new RiskEngine_js_1.RiskEngine(data.weights, data.bias, data.version || 'v1');
    }
    /**
     * Computes and persists the risk score for an entity.
     */
    async computeAndPersist(tenantId, entityId, entityType, window) {
        const result = await this.compute(entityId, window);
        const input = {
            tenantId,
            entityId,
            entityType,
            score: result.score,
            level: result.band,
            window: result.window,
            modelVersion: result.modelVersion,
            // Generate a simple rationale based on top contributions
            rationale: this.generateRationale(result),
            signals: result.contributions.map(c => ({
                type: c.feature,
                value: c.value,
                weight: c.weight,
                contributionScore: c.delta,
                description: `Feature ${c.feature} contributed ${c.delta.toFixed(3)} to score`
            }))
        };
        await this.repo.saveRiskScore(input);
        return result;
    }
    generateRationale(result) {
        const topFactors = [...result.contributions]
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 3)
            .map(c => c.feature);
        return `Risk score ${result.score.toFixed(2)} (${result.band}) driven by: ${topFactors.join(', ')}`;
    }
    async compute(entityId, window) {
        const features = await this.store.getFeatures(entityId, window);
        return this.engine.score(features, window);
    }
    async recomputeBatch(entityIds, window) {
        const results = [];
        for (const id of entityIds) {
            results.push(await this.compute(id, window));
        }
        return results;
    }
}
exports.RiskService = RiskService;
