import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCanary,
  extractAvailabilityObjective,
  resolveThresholds
} from "./check-canary-slo.mjs";

const baseThresholds = {
  window: "10m",
  baseline: "60m",
  errorFactor: 2,
  latencyFactor: 2,
  latencyAbsoluteLimitSec: 0.3,
  errorAbsoluteLimit: 0.02,
  availabilityObjective: 0.995
};

describe("extractAvailabilityObjective", () => {
  it("returns fallback when SLO missing", () => {
    const objective = extractAvailabilityObjective({ slos: [] });
    assert.equal(objective, 0.995);
  });

  it("reads objective from availability SLO", () => {
    const objective = extractAvailabilityObjective({
      slos: [{ name: "availability", objective: 0.99 }]
    });
    assert.equal(objective, 0.99);
  });
});

describe("resolveThresholds", () => {
  it("prefers canary thresholds from config", () => {
    const thresholds = resolveThresholds({
      canary_thresholds: {
        evaluation_window: "5m",
        error_rate_factor: 1.5,
        latency_factor: 1.8,
        latency_abs_seconds: 0.25,
        error_rate_abs: 0.015
      },
      slos: [{ name: "availability", objective: 0.99 }]
    });

    assert.equal(thresholds.window, "5m");
    assert.equal(thresholds.errorFactor, 1.5);
    assert.equal(thresholds.latencyFactor, 1.8);
    assert.equal(thresholds.latencyAbsoluteLimitSec, 0.25);
    assert.equal(thresholds.errorAbsoluteLimit, 0.015);
    assert.equal(thresholds.availabilityObjective, 0.99);
  });
});

describe("evaluateCanary", () => {
  it("passes when metrics stay within factors and objectives", () => {
    const metrics = {
      errorNow: 0.01,
      errorBaseline: 0.01,
      latencyNow: 0.15,
      latencyBaseline: 0.12,
      availabilityNow: 0.997
    };

    const problems = evaluateCanary(metrics, baseThresholds);
    assert.equal(problems.length, 0);
  });

  it("fails on error rate ratio regression", () => {
    const metrics = {
      errorNow: 0.03,
      errorBaseline: 0.01,
      latencyNow: 0.1,
      latencyBaseline: 0.1,
      availabilityNow: 0.999
    };

    const problems = evaluateCanary(metrics, baseThresholds);
    assert.ok(
      problems.some(p =>
        p.includes("Error rate ratio exceeded") && p.includes("factor=2")
      )
    );
  });

  it("fails on latency absolute guardrail when baseline ~0", () => {
    const metrics = {
      errorNow: 0,
      errorBaseline: 0,
      latencyNow: 0.35,
      latencyBaseline: 0,
      availabilityNow: 0.999
    };

    const problems = evaluateCanary(metrics, baseThresholds);
    assert.ok(
      problems.some(p => p.includes("Latency went from ~0") && p.includes("300ms"))
    );
  });

  it("fails on availability below objective", () => {
    const metrics = {
      errorNow: 0,
      errorBaseline: 0,
      latencyNow: 0.1,
      latencyBaseline: 0.1,
      availabilityNow: 0.990
    };

    const problems = evaluateCanary(metrics, baseThresholds);
    assert.ok(
      problems.some(p => p.includes("Availability 0.9900 is below objective"))
    );
  });
});
