/**
 * GraphQL Resolver — World Model API surface
 *
 * Exposes two queries:
 *   simulateScenario  — run a rollout for a given initial state + action sequence
 *   predictOutcome    — single-step prediction from current state
 *
 * Both operations are policy-gated: WORLD_MODEL_ENABLED must be true.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { WorldState } from "../../graphrag/world_model/state_model.js"
import type { AgentAction } from "../../agents/world_model/action_space.js"
import type { RolloutResult } from "../../agents/planning/simulation_engine.js"
import { predictNextState } from "../../agents/world_model/dynamics_model.js"
import { selectBestPolicy } from "../../agents/planning/simulation_engine.js"
import { isValidAction } from "../../agents/world_model/action_space.js"

export interface SimulateScenarioInput {
  initialState: WorldState
  /** Each element is one candidate sequence of actions */
  candidateSequences: AgentAction[][]
  goalVector?: number[]
  maxDepth?: number
}

export interface PredictOutcomeInput {
  currentState: WorldState
  action: AgentAction
}

function assertEnabled(): void {
  if (process.env["WORLD_MODEL_ENABLED"] !== "true") {
    throw new Error(
      "World model API is disabled. Set WORLD_MODEL_ENABLED=true to enable."
    )
  }
}

/**
 * GraphQL query: simulateScenario
 *
 * Runs rollout simulation over candidate action sequences and returns the
 * best-scoring plan. Throws if feature flag is off or no valid sequences
 * are provided.
 */
export function simulateScenario(input: SimulateScenarioInput): RolloutResult {
  assertEnabled()

  if (input.candidateSequences.length === 0) {
    throw new Error("simulateScenario: candidateSequences must not be empty")
  }

  for (const seq of input.candidateSequences) {
    for (const action of seq) {
      if (!isValidAction(action)) {
        throw new Error(`simulateScenario: unknown action type '${action.type}'`)
      }
    }
  }

  return selectBestPolicy(input.initialState, input.candidateSequences, {
    goalVector: input.goalVector,
    maxDepth: input.maxDepth,
  })
}

/**
 * GraphQL query: predictOutcome
 *
 * Single-step prediction: applies one action to the current state.
 */
export function predictOutcome(input: PredictOutcomeInput): WorldState {
  assertEnabled()

  if (!isValidAction(input.action)) {
    throw new Error(`predictOutcome: unknown action type '${input.action.type}'`)
  }

  const { state } = predictNextState(input.currentState, input.action)
  return state
}
