import { describe, expect, it, beforeEach } from "vitest";
import { PredictiveInsightEngine } from "../src/predictive-insights.js";
import { CostGuard } from "@ga-graphai/cost-guard";
import { OrchestrationKnowledgeGraph } from "@ga-graphai/knowledge-graph";
import {
  loadGoldenIntelGraph,
  type GoldenGraphScenario,
} from "../../../../scripts/testing/load-golden-intelgraph.js";
import type { HealthSignal } from "../src/types.js";

describe("PredictiveInsightEngine", () => {
  let knowledgeGraph: OrchestrationKnowledgeGraph;
  let costGuard: CostGuard;
  let scenario: GoldenGraphScenario;

  beforeEach(async () => {
    const loaded = await loadGoldenIntelGraph({ scenario: "toy" });
    // Toy scenario keeps readiness checks fast while exercising golden fixtures.
    knowledgeGraph = loaded.graph;
    scenario = loaded.scenario;
    costGuard = new CostGuard();
  });

  it("builds readiness insight blending risk and health signals", () => {
    const serviceId = scenario.services[0].id;
    const environmentId = scenario.environments[0].id;
    const engine = new PredictiveInsightEngine({
      knowledgeGraph,
      costGuard,
      riskThresholds: { high: 0.6, medium: 0.35 },
    });

    const latencySignal: HealthSignal = {
      assetId: serviceId,
      metric: "latency_p99",
      value: 1200,
      timestamp: new Date(),
    };
    engine.observeHealthSignal(latencySignal);

    const insight = engine.buildInsight(serviceId, environmentId);
    expect(insight).toBeDefined();
    expect(insight?.readinessScore).toBeLessThanOrEqual(1);
    expect(insight?.recommendations.some((rec) => rec.includes("release readiness survey"))).toBe(
      true
    );
  });

  it("returns high risk insights sorted by score", () => {
    const engine = new PredictiveInsightEngine({ knowledgeGraph, costGuard });
    const results = engine.listHighRiskInsights();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].riskScore).toBeGreaterThanOrEqual(results[results.length - 1].riskScore);
  });
});
