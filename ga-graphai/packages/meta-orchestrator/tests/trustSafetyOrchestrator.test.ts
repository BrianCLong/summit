import { describe, expect, it, beforeEach } from "vitest";
import {
  TRUST_SAFETY_DEFAULTS,
  TrustSafetyOrchestrator,
  type GuardrailMetrics,
  type ModerationInput,
} from "../src/index.js";

describe("TrustSafetyOrchestrator", () => {
  let orchestrator: TrustSafetyOrchestrator;

  beforeEach(() => {
    orchestrator = new TrustSafetyOrchestrator();
  });

  it("enforces guardrails and freezes decisions on SLO breaches", () => {
    const input: ModerationInput = {
      contentType: "post",
      text: "latency test",
      region: "us",
      purpose: "t&s",
    };

    const metrics: GuardrailMetrics = {
      apiReadP95Ms: TRUST_SAFETY_DEFAULTS.guardrails.apiReadP95Ms! + 50,
      apiWriteP95Ms: TRUST_SAFETY_DEFAULTS.guardrails.apiWriteP95Ms! + 10,
      stageLatencies: { detect: TRUST_SAFETY_DEFAULTS.latencyBudgets[1].maxP95Ms + 1 },
    };

    const action = orchestrator.runPipeline(input, metrics);

    expect(action.action).toBe("freeze");
    expect(action.requiresHumanReview).toBe(true);
    expect(action.reason).toContain("Tier=safe");
  });

  it("prioritizes child safety with human review and restriction", () => {
    const input: ModerationInput = {
      contentType: "image",
      mediaHash: "pdq:abcd",
      region: "us",
      purpose: "t&s",
      userAge: 14,
      signals: {
        childSafetyScore: 0.92,
        modelScore: 0.88,
        ruleScore: 0.6,
      },
    };

    const action = orchestrator.runPipeline(input);

    expect(action.action).toBe("restrict");
    expect(action.requiresHumanReview).toBe(true);
    expect(action.isChildSafetyPriority).toBe(true);
    expect(action.reason).toContain("child-safety-priority");
  });

  it("respects enforcement lane backout to freeze changes safely", () => {
    orchestrator.backoutLane("enforcement", "safety drill");

    const input: ModerationInput = {
      contentType: "comment",
      text: "normal content",
      region: "us",
      purpose: "t&s",
      signals: { modelScore: 0.7, ruleScore: 0.6 },
    };

    const action = orchestrator.runPipeline(input);

    expect(action.action).toBe("freeze");
    expect(action.requiresHumanReview).toBe(true);
    expect(orchestrator.getAuditLog().length).toBeGreaterThanOrEqual(1);
  });

  it("rejects unsupported purpose tags and flags residency mismatches", () => {
    const metricsEvaluation = orchestrator.evaluateGuardrails({}, "unknown" as never);
    expect(metricsEvaluation.ok).toBe(false);
    expect(metricsEvaluation.violations.some((v) => v.category === "purpose")).toBe(true);

    const strictOrchestrator = new TrustSafetyOrchestrator({
      residencyPolicies: [{ region: "us", storageRegion: "eu", allowExport: false }],
    });

    const input: ModerationInput = {
      contentType: "post",
      text: "export test",
      region: "us",
      purpose: "t&s",
    };

    expect(() => strictOrchestrator.runPipeline(input)).toThrowError(/Residency policy/);
  });

  it("halts earlier pipeline lanes when backout is enabled", () => {
    orchestrator.backoutLane("ingest", "maintenance");

    const action = orchestrator.runPipeline({
      contentType: "post",
      text: "backout",
      region: "us",
      purpose: "t&s",
    });

    expect(action.action).toBe("freeze");
    expect(action.reason).toContain("Lane ingest backout");
  });

  it("enforces retention budgets for pii and standard artifacts", () => {
    const strictRetention = new TrustSafetyOrchestrator({
      retention: { standardDays: 100, piiDays: 10, legalHoldEnabled: false },
    });

    expect(() =>
      strictRetention.runPipeline({
        contentType: "post",
        text: "over retain",
        region: "us",
        purpose: "t&s",
        retentionDays: 200,
        containsPii: false,
      })
    ).toThrowError(/Retention exceeds policy/);

    expect(() =>
      strictRetention.runPipeline({
        contentType: "post",
        text: "pii retain",
        region: "us",
        purpose: "t&s",
        containsPii: true,
        retentionDays: 30,
      })
    ).toThrowError(/Retention exceeds policy/);
  });

  it("merges partial configuration without dropping defaults", () => {
    const merged = new TrustSafetyOrchestrator({ guardrails: { apiReadP95Ms: 100 } });

    const evaluation = merged.evaluateGuardrails({ apiReadP95Ms: 120 });

    expect(evaluation.ok).toBe(false);
    expect(evaluation.violations.some((violation) => violation.category === "latency")).toBe(true);
    expect(
      merged.runPipeline({
        contentType: "post",
        text: "ok",
        region: "us",
        purpose: "t&s",
      }).action
    ).toBeDefined();
  });
});
