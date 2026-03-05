/**
 * Dynamics Model — state_t + action → state_t+1
 *
 * Predicts the next WorldState given a current state and a proposed enterprise
 * action. The stub implementation applies a deterministic perturbation; replace
 * with a trained model before enabling in production.
 *
 * Evidence: EVD-WORLD_MODEL-PRED-002
 */

import type { WorldState } from "../../graphrag/world_model/state_model.js"
import type { AgentAction } from "./action_space.js"
import { createWorldState } from "../../graphrag/world_model/state_model.js"
import { isValidAction } from "./action_space.js"
import { randomUUID } from "crypto"

export interface PredictedState {
  state: WorldState
  /** Model confidence in this prediction, in [0, 1] */
  confidence: number
}

/**
 * Predict the next enterprise state after applying `action` to `currentState`.
 *
 * Throws if the action is not a member of the defined action space.
 */
export function predictNextState(
  currentState: WorldState,
  action: AgentAction
): PredictedState {
  if (!isValidAction(action)) {
    throw new Error(`Unknown action type: ${action.type}`)
  }

  // Stub: perturb each dimension of the current vector by a small action-driven offset
  const actionHash = hashString(action.type + JSON.stringify(action.params))
  const perturbedVector = currentState.semantic_vector.map((v, i) => {
    const delta = (Math.sin(actionHash + i) * 0.05)
    return Math.max(0, Math.min(1, v + delta))
  })

  const nextState = createWorldState({
    id: randomUUID(),
    semantic_vector: perturbedVector,
    graph_snapshot_id: currentState.graph_snapshot_id, // inherit until KG write-back
    observation_refs: [...currentState.observation_refs],
    confidence: currentState.confidence * 0.95, // confidence decays with each step
  })

  return { state: nextState, confidence: nextState.confidence }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
