import { createHash } from "crypto";
import {
  TransformationCanon,
  TCCTransform,
  runConformancePack,
  createCanonReceipt,
  generateStubs,
  validateTransformationCanon,
  Implementation,
} from "@app/tcc";

const sampleTransform: TCCTransform = {
  id: "normalize-user-score",
  name: "Normalize User Score",
  version: "1.0.0",
  description: "Normalizes raw engagement signals into a bounded risk score.",
  stability: {
    level: "beta",
    changePolicy: "backwards-compatible contract",
    supportWindow: "2025-2026",
  },
  inputs: [
    {
      name: "raw_score",
      description: "Raw score in the source system (0-100).",
      type: { kind: "scalar", name: "number" },
    },
    {
      name: "event_count",
      description: "Number of recent events contributing to the score.",
      type: { kind: "scalar", name: "integer" },
    },
    {
      name: "recent_scores",
      description: "Trailing window of normalized scores.",
      type: { kind: "array", items: { kind: "scalar", name: "number" } },
    },
  ],
  outputs: [
    {
      name: "score",
      description: "Bounded normalized score between 0 and 1.",
      type: { kind: "scalar", name: "float" },
    },
    {
      name: "status",
      description: "Operational posture classification.",
      type: { kind: "scalar", name: "string" },
    },
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
        right: {
          kind: "value",
          value: ["watch", "steady", "elevated"],
        },
      },
    },
    {
      name: "monotonic-smoothing",
      description: "Smoothed score cannot exceed raw score by more than 0.2.",
      stage: "post",
      expression: {
        kind: "binary",
        op: "<=",
        left: {
          kind: "binary",
          op: "-",
          left: { kind: "ref", path: "outputs.score" },
          right: {
            kind: "binary",
            op: "/",
            left: { kind: "ref", path: "inputs.raw_score" },
            right: { kind: "value", value: 100 },
          },
        },
        right: { kind: "value", value: 0.2 },
      },
    },
    {
      name: "trailing-avg-consistency",
      description: "Outputs must stay within 0.25 of trailing average.",
      stage: "post",
      expression: {
        kind: "binary",
        op: "<=",
        left: {
          kind: "call",
          fn: "abs",
          args: [
            {
              kind: "binary",
              op: "-",
              left: { kind: "ref", path: "outputs.score" },
              right: {
                kind: "call",
                fn: "avg",
                args: [{ kind: "ref", path: "inputs.recent_scores" }],
              },
            },
          ],
        },
        right: { kind: "value", value: 0.25 },
      },
    },
  ],
  samples: [
    {
      name: "baseline",
      inputs: { raw_score: 67, event_count: 12, recent_scores: [0.4, 0.5, 0.6, 0.7] },
      parameters: { decay: 0.1 },
      expectedOutputs: { score: 0.658, status: "steady" },
    },
    {
      name: "high-signal",
      inputs: { raw_score: 94, event_count: 22, recent_scores: [0.8, 0.82, 0.79, 0.81] },
      parameters: { decay: 0.2 },
      expectedOutputs: { score: 0.913, status: "elevated" },
    },
    {
      name: "invalid-range",
      inputs: { raw_score: -4, event_count: 2, recent_scores: [0.1, 0.2, 0.3] },
      expectFailure: true,
    },
  ],
};

const sampleCanon: TransformationCanon = {
  canon: "tcc.demo",
  version: "2025.01",
  transforms: [sampleTransform],
};

const referenceImplementation: Implementation = (inputs, parameters = {}) => {
  const rawScore = Number(inputs.raw_score ?? 0);
  const recentScores = Array.isArray(inputs.recent_scores) ? inputs.recent_scores.map(Number) : [];
  const decay = Number(parameters.decay ?? 0);
  const base = Math.min(1, Math.max(0, rawScore / 100));
  const trailingAvg = recentScores.length ? recentScores.reduce((acc, val) => acc + val, 0) / recentScores.length : base;
  const smoothing = trailingAvg * Math.min(0.5, Math.max(0, decay));
  const normalized = Number((base * (1 - Math.min(decay, 0.5)) + smoothing).toFixed(3));
  const status = normalized >= 0.8 ? "elevated" : normalized >= 0.55 ? "steady" : "watch";
  return { score: normalized, status };
};

describe("Transformation Canon & Codegen", () => {
  it("validates the canon and passes the conformance pack", () => {
    const { valid, errors } = validateTransformationCanon(sampleCanon);
    expect({ valid, errors }).toEqual({ valid: true, errors: [] });

    const result = runConformancePack(sampleTransform, referenceImplementation);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.evaluatedCases).toBe(sampleTransform.samples?.length ?? 0);
  });

  it("captures counterexamples when invariants are violated", () => {
    const faultyImplementation: Implementation = () => ({ score: 1.4, status: "invalid" });
    const result = runConformancePack(sampleTransform, faultyImplementation);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0].counterexample.inputs).toEqual(sampleTransform.samples?.[0].inputs);
  });

  it("generates language stubs with embedded invariants", () => {
    const stubs = generateStubs(sampleTransform);
    expect(stubs.python.filename).toBe("normalize_user_score.py");
    expect(stubs.python.contents).toContain("_ensure(");
    expect(stubs.javascript.filename).toBe("normalizeUserScore.mjs");
    expect(stubs.javascript.contents).toContain("ensure(");
    expect(stubs.spark.filename).toBe("NormalizeUserScore.scala");
    expect(stubs.spark.contents).toContain("ensure(");
  });

  it("emits a verifiable canon receipt", () => {
    const result = runConformancePack(sampleTransform, referenceImplementation);
    jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const receipt = createCanonReceipt(sampleTransform, result);
    jest.useRealTimers();

    const recomputedSignature = createHash("sha256").update(receipt.canon).digest("hex");
    expect(receipt.signature).toBe(recomputedSignature);
    expect(receipt.generatedAt).toBe("2025-01-01T00:00:00.000Z");
  });
});
