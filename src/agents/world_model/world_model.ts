/**
 * SummitWorldModel — top-level façade for the SWMA
 *
 * Composes the observation, representation, dynamics, and planning layers
 * behind a single ergonomic class. Feature-gated via WORLD_MODEL_ENABLED.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001, EVD-WORLD_MODEL-PRED-002, EVD-WORLD_MODEL-PLAN-003
 */

import type { WorldState } from "../../graphrag/world_model/state_model.js"
import type { AgentAction } from "./action_space.js"
import type { RolloutResult, SimulationOptions } from "../planning/simulation_engine.js"
import { WorldModelClient } from "./world_model_client.js"
import { StubSelfFlowEncoder } from "../../graphrag/world_model/representation.js"
import { collectObservations } from "../../connectors/observation_pipeline.js"
import { selectBestPolicy } from "../planning/simulation_engine.js"
import type { ObservationSource } from "../../connectors/observation_pipeline.js"

const FEATURE_FLAG = process.env["WORLD_MODEL_ENABLED"] === "true"

export class SummitWorldModel {
  private readonly client: WorldModelClient
  private currentState: WorldState | null = null

  constructor(graphSnapshotId: string, encoderDim = 128) {
    if (!FEATURE_FLAG) {
      throw new Error(
        "SummitWorldModel is disabled. Set WORLD_MODEL_ENABLED=true to enable."
      )
    }
    this.client = new WorldModelClient({
      encoder: new StubSelfFlowEncoder(encoderDim),
      defaultGraphSnapshotId: graphSnapshotId,
    })
  }

  /**
   * Ingest observations from all sources and update the current WorldState.
   */
  async observe(sources: ObservationSource[]): Promise<WorldState> {
    const observations = await collectObservations(sources)
    this.currentState = await this.client.observe(observations)
    return this.currentState
  }

  /**
   * Predict the next state after applying a single action to `state`.
   */
  predict(state: WorldState, action: AgentAction): WorldState {
    return this.client.predict(state, action)
  }

  /**
   * Simulate multiple candidate action sequences and return the best policy.
   */
  plan(
    state: WorldState,
    candidates: AgentAction[][],
    options?: SimulationOptions
  ): RolloutResult {
    return selectBestPolicy(state, candidates, options)
  }

  getCurrentState(): WorldState | null {
    return this.currentState
  }
}
