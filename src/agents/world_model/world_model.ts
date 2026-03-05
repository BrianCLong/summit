import { WorldState } from "../../graphrag/world_model/state_model";
import { AgentAction } from "./action_space";
import { predictNextState } from "./dynamics_model";

function getCurrentState(): WorldState {
  return {
    semantic_vector: [],
    graph_snapshot_id: "snapshot-1",
    observation_refs: []
  };
}

export class SummitWorldModel {
  observe(): WorldState {
    return getCurrentState();
  }

  predict(state: WorldState, action: AgentAction) {
    return predictNextState(state, action);
  }
}
