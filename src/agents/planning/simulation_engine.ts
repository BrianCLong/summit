/**
 * Planning Engine — rollout simulation + best-policy selection
 *
 * Algorithm:
 *   1. For each candidate action sequence, roll out N steps through the dynamics model.
 *   2. Score each terminal state (cosine similarity to a goal vector, weighted by confidence).
 *   3. Return the action sequence with the highest aggregate score.
 *
 * Feature-gated: WORLD_MODEL_ENABLED=true required.
 *
 * Evidence: EVD-WORLD_MODEL-PLAN-003
 */

import type { WorldState } from "../../graphrag/world_model/state_model.js"
import type { AgentAction } from "../world_model/action_space.js"
import { predictNextState } from "../world_model/dynamics_model.js"

export interface RolloutResult {
  actions: AgentAction[]
  terminalState: WorldState
  score: number
}

export interface SimulationOptions {
  /** Maximum steps per rollout (default: 3) */
  maxDepth?: number
  /** Goal vector to score terminal states against */
  goalVector?: number[]
}

/**
 * Simulate one action sequence from `initialState` and return the terminal state + score.
 */
export function simulatePlan(
  initialState: WorldState,
  actions: AgentAction[],
  options: SimulationOptions = {}
): RolloutResult {
  const maxDepth = options.maxDepth ?? 3
  let state = initialState
  const depth = Math.min(actions.length, maxDepth)

  for (let i = 0; i < depth; i++) {
    const { state: next } = predictNextState(state, actions[i])
    state = next
  }

  const score = scoreState(state, options.goalVector)
  return { actions: actions.slice(0, depth), terminalState: state, score }
}

/**
 * Given multiple candidate action sequences, run a rollout for each and
 * return the best-scoring policy.
 */
export function selectBestPolicy(
  initialState: WorldState,
  candidates: AgentAction[][],
  options: SimulationOptions = {}
): RolloutResult {
  if (candidates.length === 0) {
    throw new Error("selectBestPolicy: no candidate action sequences provided")
  }

  let best: RolloutResult | null = null
  for (const actions of candidates) {
    const result = simulatePlan(initialState, actions, options)
    if (best === null || result.score > best.score) {
      best = result
    }
  }
  return best!
}

/** Score a terminal state: cosine similarity to goal vector × confidence. */
function scoreState(state: WorldState, goalVector?: number[]): number {
  const confidence = state.confidence
  if (!goalVector || goalVector.length === 0) {
    return confidence
  }
  const sim = cosineSimilarity(state.semantic_vector, goalVector)
  return sim * confidence
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
