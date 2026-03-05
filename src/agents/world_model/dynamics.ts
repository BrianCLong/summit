// eslint-disable
import { EnterpriseState } from '../../graphrag/world_model/world_state';

export interface EnterpriseAction {
  type: string;
  payload: unknown;
}

export function predict(
  state: EnterpriseState,
  action: EnterpriseAction
): EnterpriseState {
  return { ...state };
}
