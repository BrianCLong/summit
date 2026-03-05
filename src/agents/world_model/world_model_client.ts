import { WorldState } from "../../graphrag/world_model/state_model";
import { AgentAction } from "./action_space";

export interface WorldModel {
  observe(): WorldState;
  predict(state: WorldState, action: AgentAction): WorldState;
}
