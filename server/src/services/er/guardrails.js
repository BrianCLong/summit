"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFixtures = loadFixtures;
exports.getDataset = getDataset;
exports.computeMetrics = computeMetrics;
exports.resolveThresholds = resolveThresholds;
exports.evaluateGuardrails = evaluateGuardrails;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_FIXTURES_PATH = path_1.default.join(process.cwd(), 'tests/fixtures/er/evaluation-fixtures.json');
let cachedFixtures = null;
function loadFixtures(fixturesPath) {
    const resolvedPath = fixturesPath || process.env.ER_GUARDRAIL_FIXTURES_PATH || DEFAULT_FIXTURES_PATH;
    if (cachedFixtures && resolvedPath === DEFAULT_FIXTURES_PATH) {
        return cachedFixtures;
    }
    const raw = fs_1.default.readFileSync(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.datasets || !Array.isArray(parsed.datasets)) {
        throw new Error('ER guardrail fixtures missing datasets');
    }
    if (resolvedPath === DEFAULT_FIXTURES_PATH) {
        cachedFixtures = parsed.datasets;
    }
    return parsed.datasets;
}
function getDataset(datasetId, fixtures) {
    const datasets = fixtures || loadFixtures();
    const dataset = datasets.find(item => item.datasetId === datasetId);
    if (!dataset) {
        throw new Error(`ER guardrail dataset not found: ${datasetId}`);
    }
    return dataset;
}
function computeMetrics(dataset, scoreFn, matchThreshold) {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    for (const pair of dataset.pairs) {
        const score = scoreFn(pair.entityA, pair.entityB);
        const predictedMatch = score >= matchThreshold;
        if (predictedMatch && pair.isMatch) {
            truePositives += 1;
        }
        else if (predictedMatch && !pair.isMatch) {
            falsePositives += 1;
        }
        else if (!predictedMatch && pair.isMatch) {
            falseNegatives += 1;
        }
    }
    const precisionDenominator = truePositives + falsePositives;
    const recallDenominator = truePositives + falseNegatives;
    return {
        precision: precisionDenominator === 0 ? 0 : truePositives / precisionDenominator,
        recall: recallDenominator === 0 ? 0 : truePositives / recallDenominator,
        truePositives,
        falsePositives,
        falseNegatives,
        totalPairs: dataset.pairs.length,
    };
}
function resolveThresholds() {
    const minPrecision = Number.parseFloat(process.env.ER_GUARDRAIL_MIN_PRECISION || '0.85');
    const minRecall = Number.parseFloat(process.env.ER_GUARDRAIL_MIN_RECALL || '0.8');
    const matchThreshold = Number.parseFloat(process.env.ER_GUARDRAIL_MATCH_THRESHOLD || '0.8');
    return {
        minPrecision,
        minRecall,
        matchThreshold,
    };
}
function evaluateGuardrails(datasetId, scoreFn, fixtures) {
    const dataset = getDataset(datasetId, fixtures);
    const thresholds = resolveThresholds();
    const metrics = computeMetrics(dataset, scoreFn, thresholds.matchThreshold);
    const passed = metrics.precision >= thresholds.minPrecision &&
        metrics.recall >= thresholds.minRecall;
    return {
        datasetId,
        metrics,
        thresholds,
        passed,
        evaluatedAt: new Date().toISOString(),
    };
}
