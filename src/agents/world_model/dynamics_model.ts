import { WorldState } from "../../graphrag/world_model/state_model";
import { AgentAction } from "./action_space";

export function predictNextState(
  state: WorldState,
  action: AgentAction
): WorldState {
  // state_t -> action -> state_t+1
  return state;
}
