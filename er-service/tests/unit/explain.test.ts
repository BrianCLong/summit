import { describe, it, expect } from "@jest/globals";
import {
  DEFAULT_SCORING_CONFIG,
  ExplainPairRequestSchema,
  ExplainPairResponseSchema,
} from "../../src/types";
import { buildFeatureContributions } from "../../src/scoring/scorer";

describe("ER explanation utilities", () => {
  const features = {
    nameSimilarity: 0.82,
    nameJaccard: 0.7,
    nameLevenshtein: 0.2,
    phoneticSimilarity: 1,
    aliasSimilarity: 0.45,
    typeMatch: true,
    propertyOverlap: 0.4,
    semanticSimilarity: 0.6,
    geographicProximity: 0.2,
    temporalCoOccurrence: 0.1,
    locationOverlap: 0.3,
    deviceIdMatch: 1,
    accountIdMatch: 0.5,
    ipAddressOverlap: 0.1,
    editDistance: 2,
  };

  it("builds normalized feature contributions", () => {
    const contributions = buildFeatureContributions(features, DEFAULT_SCORING_CONFIG.weights);

    expect(contributions).toHaveLength(Object.keys(DEFAULT_SCORING_CONFIG.weights).length);
    expect(contributions[0].contribution).toBeGreaterThanOrEqual(
      contributions[contributions.length - 1].contribution
    );

    const totalNormalized = contributions.reduce(
      (sum, entry) => sum + entry.normalizedContribution,
      0
    );
    expect(totalNormalized).toBeCloseTo(1, 5);
  });

  it("validates explain pair schema", () => {
    const request = {
      entityA: {
        id: "e1",
        type: "person",
        name: "Jane Doe",
        tenantId: "tenant-1",
        attributes: { email: "jane@example.com" },
      },
      entityB: {
        id: "e2",
        type: "person",
        name: "Janet Doe",
        tenantId: "tenant-1",
        attributes: { email: "janet@example.com" },
      },
      method: "hybrid",
      threshold: 0.7,
    };

    const parsedRequest = ExplainPairRequestSchema.parse(request);
    expect(parsedRequest.method).toBe("hybrid");

    const contributions = buildFeatureContributions(features, DEFAULT_SCORING_CONFIG.weights);

    const response = {
      score: 0.81,
      confidence: 0.77,
      method: "hybrid",
      threshold: 0.7,
      features,
      rationale: ["Name similarity: 82.0%"],
      featureWeights: DEFAULT_SCORING_CONFIG.weights,
      featureContributions: contributions,
    };

    const parsedResponse = ExplainPairResponseSchema.parse(response);
    expect(parsedResponse.featureContributions).toHaveLength(contributions.length);
  });
});
