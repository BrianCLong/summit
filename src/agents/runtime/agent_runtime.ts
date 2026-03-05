// eslint-disable
import { EnterpriseState } from '../../graphrag/world_model/world_state';
import { EnterpriseAction } from '../world_model/dynamics';

export interface SummitAgent {
  observe(): EnterpriseState
  plan(): EnterpriseAction[]
  execute(actions: EnterpriseAction[]): void
}
