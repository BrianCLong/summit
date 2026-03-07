import { describe, expect, it } from "vitest";
import { AcceptanceCriteria, TaskSpec, validateTaskSpec } from "../src/index.js";

const baseSpec: TaskSpec = {
  taskId: "task-123",
  tenantId: "tenant-1",
  title: "Sample",
  goal: "Ship feature",
  nonGoals: [],
  inputs: [],
  constraints: {
    latencyP95Ms: 500,
    budgetUSD: 2,
    contextTokensMax: 16000,
  },
  policy: {
    purpose: "engineering",
    retention: "standard-365d",
    licenseClass: "MIT-OK",
    pii: false,
  },
  acceptanceCriteria: [
    {
      id: "AC-1",
      statement: "All tests pass",
      verify: "test",
      metric: "pass-rate",
      threshold: "1.0",
    },
  ],
  risks: [],
  raci: {
    owner: "owner@example.com",
    reviewers: ["reviewer@example.com"],
  },
  sla: {
    due: "2030-01-01T00:00:00Z",
  },
  policyTags: ["purpose:engineering", "retention:standard-365d", "pii:absent"],
  language: "en",
};

describe("validateTaskSpec", () => {
  it("marks valid specs as valid and warns about optional hints", () => {
    const res = validateTaskSpec(baseSpec);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.warnings).toEqual([]);
  });

  it("detects missing acceptance criteria and invalid budgets", () => {
    const spec: TaskSpec = {
      ...baseSpec,
      constraints: {
        latencyP95Ms: 0,
        budgetUSD: -1,
        contextTokensMax: 0,
      },
      acceptanceCriteria: [],
    };
    const res = validateTaskSpec(spec);
    expect(res.valid).toBe(false);
    expect(res.errors).toEqual([
      "at least one acceptance criteria is required",
      "budget must be positive",
      "latencyP95Ms must be positive",
      "contextTokensMax must be positive",
    ]);
  });

  it("warns when pii policy tag is missing", () => {
    const spec: TaskSpec = {
      ...baseSpec,
      policy: {
        ...baseSpec.policy,
        pii: true,
      },
      policyTags: ["purpose:engineering", "retention:standard-365d"],
    };
    const res = validateTaskSpec(spec);
    expect(res.valid).toBe(true);
    expect(res.warnings).toContain("PII flagged but policy tag missing");
  });

  it("detects duplicate acceptance criteria ids", () => {
    const ac: AcceptanceCriteria = baseSpec.acceptanceCriteria[0];
    const spec: TaskSpec = {
      ...baseSpec,
      acceptanceCriteria: [ac, { ...ac }],
    };
    const res = validateTaskSpec(spec);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("acceptance criteria ids must be unique");
  });
});
