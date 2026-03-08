"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_crypto_1 = require("node:crypto");
const tcc_1 = require("@app/tcc");
const transform = {
    id: "normalize-user-score",
    name: "Normalize User Score",
    version: "1.0.0",
    description: "Normalizes raw engagement signals into a bounded risk score.",
    stability: {
        level: "beta",
        changePolicy: "backwards-compatible contract",
    },
    inputs: [
        { name: "raw_score", type: { kind: "scalar", name: "number" } },
        { name: "event_count", type: { kind: "scalar", name: "integer" } },
        { name: "recent_scores", type: { kind: "array", items: { kind: "scalar", name: "number" } } },
    ],
    outputs: [
        { name: "score", type: { kind: "scalar", name: "float" } },
        { name: "status", type: { kind: "scalar", name: "string" } },
    ],
    invariants: [
        {
            name: "raw-score-range",
            description: "Raw score must be within 0 and 100 inclusive.",
            stage: "pre",
            expression: {
                kind: "logical",
                op: "and",
                expressions: [
                    {
                        kind: "binary",
                        op: ">=",
                        left: { kind: "ref", path: "inputs.raw_score" },
                        right: { kind: "value", value: 0 },
                    },
                    {
                        kind: "binary",
                        op: "<=",
                        left: { kind: "ref", path: "inputs.raw_score" },
                        right: { kind: "value", value: 100 },
                    },
                ],
            },
        },
        {
            name: "recent-scores-window",
            description: "At least three scores are required for smoothing.",
            stage: "pre",
            expression: {
                kind: "binary",
                op: ">=",
                left: { kind: "call", fn: "len", args: [{ kind: "ref", path: "inputs.recent_scores" }] },
                right: { kind: "value", value: 3 },
            },
        },
        {
            name: "score-range",
            description: "Normalized score must stay within 0..1.",
            stage: "post",
            expression: {
                kind: "logical",
                op: "and",
                expressions: [
                    {
                        kind: "binary",
                        op: ">=",
                        left: { kind: "ref", path: "outputs.score" },
                        right: { kind: "value", value: 0 },
                    },
                    {
                        kind: "binary",
                        op: "<=",
                        left: { kind: "ref", path: "outputs.score" },
                        right: { kind: "value", value: 1 },
                    },
                ],
            },
        },
        {
            name: "status-domain",
            description: "Status must belong to an approved label set.",
            stage: "post",
            expression: {
                kind: "binary",
                op: "in",
                left: { kind: "ref", path: "outputs.status" },
                right: { kind: "value", value: ["watch", "steady", "elevated"] },
            },
        },
    ],
    samples: [
        {
            name: "baseline",
            inputs: { raw_score: 67, event_count: 12, recent_scores: [0.4, 0.5, 0.6, 0.7] },
            parameters: { decay: 0.1 },
        },
    ],
};
const canon = {
    canon: "tcc.demo",
    version: "2025.01",
    transforms: [transform],
};
const implementation = (inputs, parameters = {}) => {
    const raw = Number(inputs.raw_score ?? 0);
    const decay = Number(parameters.decay ?? 0);
    const base = Math.min(1, Math.max(0, raw / 100));
    const recent = Array.isArray(inputs.recent_scores) ? inputs.recent_scores.map(Number) : [];
    const avg = recent.length ? recent.reduce((acc, value) => acc + value, 0) / recent.length : base;
    const normalized = Number((base * (1 - Math.min(decay, 0.5)) + avg * Math.min(decay, 0.5)).toFixed(3));
    const status = normalized >= 0.8 ? "elevated" : normalized >= 0.55 ? "steady" : "watch";
    return { score: normalized, status };
};
const validation = (0, tcc_1.validateTransformationCanon)(canon);
node_assert_1.strict.equal(validation.valid, true, `Validation errors: ${validation.errors.join(", ")}`);
const result = (0, tcc_1.runConformancePack)(transform, implementation);
node_assert_1.strict.equal(result.passed, true, `Unexpected failures: ${JSON.stringify(result.failures, null, 2)}`);
const receipt = (0, tcc_1.createCanonReceipt)(transform, result);
const recomputed = (0, node_crypto_1.createHash)("sha256").update(receipt.canon).digest("hex");
node_assert_1.strict.equal(receipt.signature, recomputed, "Receipt signature mismatch");
const stubs = (0, tcc_1.generateStubs)(transform);
node_assert_1.strict.ok(stubs.python.contents.includes("_ensure"), "Python stub missing invariant guards");
node_assert_1.strict.ok(stubs.spark.contents.includes("ensure"), "Scala stub missing invariant guards");
node_assert_1.strict.ok(stubs.javascript.contents.includes("ensure"), "JavaScript stub missing invariant guards");
console.log("TCC conformance runner completed successfully.");
