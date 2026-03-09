import * as assert from "node:assert";
import { test } from "node:test";

import {
  computeUncertaintyDecomposition,
  calculateEntropy,
  normalizeDistribution,
  calculateMixtureDistribution,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateJSD,
} from "./mad_uncertainty";

test("calculateEntropy should handle empty distribution", () => {
  assert.strictEqual(calculateEntropy({}), 0);
});

test("calculateEntropy should compute simple distribution", () => {
  const dist = { a: 0.5, b: 0.5 };
  assert.strictEqual(calculateEntropy(dist), 1);
});

test("calculateEntropy should ignore 0 probabilities", () => {
  const dist = { a: 1, b: 0 };
  assert.strictEqual(calculateEntropy(dist), 0);
});

test("normalizeDistribution should handle normal distribution correctly", () => {
  const dist = { A: 2, B: 2 };
  const norm = normalizeDistribution(dist);
  assert.strictEqual(norm["A"], 0.5);
  assert.strictEqual(norm["B"], 0.5);
});

test("calculateMixtureDistribution should average distributions correctly", () => {
  const dist1 = { A: 1, B: 0 };
  const dist2 = { A: 0, B: 1 };
  const mix = calculateMixtureDistribution([dist1, dist2]);
  assert.strictEqual(mix["A"], 0.5);
  assert.strictEqual(mix["B"], 0.5);
});

test("computeUncertaintyDecomposition for completely identical confident agents", () => {
  // Both agents are 100% confident in 'A'
  const dists = [{ A: 1 }, { A: 1 }];
  const result = computeUncertaintyDecomposition(dists);
  assert.strictEqual(result.sysEu, 0); // Complete agreement -> 0 epistemic uncertainty
  assert.strictEqual(result.sysAu, 0); // Total confidence -> 0 aleatoric uncertainty
  assert.strictEqual(result.totalUncertainty, 0);
});

test("computeUncertaintyDecomposition for heterogeneous agents", () => {
  // Agent 1 is 100% confident in 'A', Agent 2 is 100% confident in 'B'
  const dists = [
    { A: 1, B: 0 },
    { A: 0, B: 1 },
  ];
  const result = computeUncertaintyDecomposition(dists);
  // Mixture is 50/50, entropy is 1. Avg entropy is 0. JSD = 1.
  assert.strictEqual(result.sysEu, 1); // High disagreement -> epistemic uncertainty
  assert.strictEqual(result.sysAu, 0); // Each is individually confident -> 0 aleatoric
  assert.strictEqual(result.totalUncertainty, 1);
});

test("computeUncertaintyDecomposition for uniformly unconfident agents", () => {
  // Both agents are 50/50 split
  const dists = [
    { A: 0.5, B: 0.5 },
    { A: 0.5, B: 0.5 },
  ];
  const result = computeUncertaintyDecomposition(dists);
  // Mixture is 50/50, entropy is 1. Avg entropy is 1. JSD = 0.
  assert.strictEqual(result.sysEu, 0); // Complete agreement -> 0 epistemic uncertainty
  assert.strictEqual(result.sysAu, 1); // Individually uncertain -> aleatoric uncertainty
  assert.strictEqual(result.totalUncertainty, 1);
});
