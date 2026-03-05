/**
 * World-Model Client — agent-facing interface to SWMA
 *
 * Agents interact with the world model exclusively through this interface.
 * Internal implementation details (encoder, KG client, vector store) are
 * injected via the constructor so they can be swapped in tests.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { WorldState } from "../../graphrag/world_model/state_model.js"
import type { AgentAction } from "./action_space.js"
import type { Observation } from "../../connectors/observation_pipeline.js"
import type { SelfFlowEncoder } from "../../graphrag/world_model/representation.js"
import { createWorldState } from "../../graphrag/world_model/state_model.js"
import { predictNextState } from "./dynamics_model.js"
import { randomUUID } from "crypto"

export interface WorldModelClientOptions {
  encoder: SelfFlowEncoder
  /** Stable graph snapshot node used as default anchor */
  defaultGraphSnapshotId: string
}

export interface WorldModel {
  /**
   * Build a WorldState from the provided observations.
   * The state is KG-anchored to defaultGraphSnapshotId.
   */
  observe(observations: Observation[]): Promise<WorldState>

  /**
   * Predict the next WorldState resulting from applying `action` to `state`.
   */
  predict(state: WorldState, action: AgentAction): WorldState
}

export class WorldModelClient implements WorldModel {
  private readonly encoder: SelfFlowEncoder
  private readonly defaultGraphSnapshotId: string

  constructor(options: WorldModelClientOptions) {
    this.encoder = options.encoder
    this.defaultGraphSnapshotId = options.defaultGraphSnapshotId
  }

  async observe(observations: Observation[]): Promise<WorldState> {
    const vector = await this.encoder.encode(observations)
    return createWorldState({
      id: randomUUID(),
      semantic_vector: vector,
      graph_snapshot_id: this.defaultGraphSnapshotId,
      observation_refs: observations.map((o) => o.id),
    })
  }

  predict(state: WorldState, action: AgentAction): WorldState {
    const { state: next } = predictNextState(state, action)
    return next
  }
}
