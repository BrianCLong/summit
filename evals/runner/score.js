"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sumScores = exports.weightedScore = exports.toPercent = exports.formatDelta = exports.summarizeChecks = exports.computeSuiteScore = exports.persistScoreHistory = exports.persistScore = exports.loadBaselineScore = exports.combineScores = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const filesystem_js_1 = require("./filesystem.js");
const scoreWeights = {
    deterministic: 0.7,
    rubric: 0.3,
};
const safeNumber = (value) => value ?? 0;
const combineScores = (skill, runId, deterministic, rubric, baselineScore, dropThreshold) => {
    const combinedScore = deterministic.score * scoreWeights.deterministic +
        rubric.score * scoreWeights.rubric;
    const delta = baselineScore === null ? null : combinedScore - baselineScore;
    const regressionPass = delta === null ? true : delta >= -Math.abs(dropThreshold);
    const overallPass = deterministic.overall_pass && rubric.overall_pass && regressionPass;
    return {
        skill,
        run_id: runId,
        deterministic,
        rubric,
        combined_score: Math.round(combinedScore),
        overall_pass: overallPass,
        regression: {
            baseline_score: baselineScore,
            delta,
            drop_threshold: dropThreshold,
            pass: regressionPass,
        },
    };
};
exports.combineScores = combineScores;
const loadBaselineScore = async (baselinePath) => {
    try {
        const baseline = await (0, filesystem_js_1.readJson)(baselinePath);
        return baseline.combined_score;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error) {
            const code = error.code;
            if (code === 'ENOENT') {
                return null;
            }
        }
        throw error;
    }
};
exports.loadBaselineScore = loadBaselineScore;
const persistScore = async (outputPath, summary) => {
    await (0, filesystem_js_1.writeJson)(outputPath, summary);
};
exports.persistScore = persistScore;
const persistScoreHistory = async (historyDir, runId, summary) => {
    await promises_1.default.mkdir(historyDir, { recursive: true });
    const historyPath = node_path_1.default.join(historyDir, `${runId}.json`);
    await (0, filesystem_js_1.writeJson)(historyPath, summary);
};
exports.persistScoreHistory = persistScoreHistory;
const computeSuiteScore = (summaries) => {
    if (summaries.length === 0) {
        return { score: 0, overall_pass: false };
    }
    const total = summaries.reduce((acc, summary) => acc + summary.combined_score, 0);
    const score = Math.round(total / summaries.length);
    const overallPass = summaries.every((summary) => summary.overall_pass);
    return { score, overall_pass: overallPass };
};
exports.computeSuiteScore = computeSuiteScore;
const summarizeChecks = (deterministic, rubric) => {
    const checks = [...deterministic.checks, ...rubric.checks];
    return checks.reduce((acc, check) => {
        if (check.pass) {
            acc.pass += 1;
        }
        else {
            acc.fail += 1;
        }
        return acc;
    }, { pass: 0, fail: 0 });
};
exports.summarizeChecks = summarizeChecks;
const formatDelta = (delta) => {
    if (delta === null) {
        return 'n/a';
    }
    const rounded = Math.round(delta * 100) / 100;
    return `${rounded >= 0 ? '+' : ''}${rounded}`;
};
exports.formatDelta = formatDelta;
const toPercent = (value) => Math.round(value * 100);
exports.toPercent = toPercent;
const weightedScore = (score) => {
    const normalized = Math.min(Math.max(score, 0), 100);
    return Math.round(normalized);
};
exports.weightedScore = weightedScore;
const sumScores = (...scores) => scores.reduce((acc, score) => acc + safeNumber(score), 0);
exports.sumScores = sumScores;
