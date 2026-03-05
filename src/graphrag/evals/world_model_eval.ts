/**
 * Eval Harness — world-model prediction quality
 *
 * Provides evaluation primitives for measuring prediction accuracy and
 * planning success rate against the target deltas:
 *   - Prediction accuracy: +25% over baseline
 *   - Planning success rate: +30% over baseline
 *   - RAG grounding: +20% over baseline
 *
 * Evidence: EVD-WORLD_MODEL-PRED-002
 */

import type { WorldState } from "../world_model/state_model.js"
import type { RolloutResult } from "../../agents/planning/simulation_engine.js"

export interface EvalResult {
  score: number
  passed: boolean
  details: Record<string, unknown>
}

/**
 * Measure prediction quality: cosine similarity between predicted and actual
 * WorldState semantic vectors. Target threshold: ≥ 0.75 (arbitrary baseline;
 * replace with measured baseline once training data is available).
 */
export function evaluatePrediction(
  predicted: WorldState,
  actual: WorldState,
  threshold = 0.75
): EvalResult {
  const score = cosineSimilarity(
    predicted.semantic_vector,
    actual.semantic_vector
  )
  return {
    score,
    passed: score >= threshold,
    details: {
      predicted_id: predicted.id,
      actual_id: actual.id,
      threshold,
      cosine_similarity: score,
    },
  }
}

/**
 * Measure planning quality: did the best rollout achieve a score above the
 * threshold after applying the selected policy?
 */
export function evaluatePlan(
  result: RolloutResult,
  threshold = 0.6
): EvalResult {
  return {
    score: result.score,
    passed: result.score >= threshold,
    details: {
      actions_taken: result.actions.map((a) => a.type),
      terminal_state_id: result.terminalState.id,
      threshold,
      plan_score: result.score,
    },
  }
}

/**
 * Aggregate multiple eval results into a summary report.
 */
export function aggregateEvals(results: EvalResult[]): {
  total: number
  passed: number
  failed: number
  mean_score: number
} {
  const passed = results.filter((r) => r.passed).length
  const mean_score =
    results.length === 0
      ? 0
      : results.reduce((acc, r) => acc + r.score, 0) / results.length
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    mean_score,
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
