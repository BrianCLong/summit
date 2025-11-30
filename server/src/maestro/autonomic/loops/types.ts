
import { HealthSnapshot } from '../signals/types';
import { SLOAlert } from '../policy/types';

export interface AdaptationPlan {
  id: string;
  loopName: string;
  timestamp: Date;
  actions: {
    type: string; // e.g., "THROTTLE_QUEUE", "SWITCH_MODEL"
    payload: Record<string, any>;
  }[];
  justification: string;
}

export interface ControlLoop {
  name: string;
  monitor(health: HealthSnapshot, alerts: SLOAlert[]): Promise<void>;
  analyze(): Promise<boolean>; // Returns true if adaptation needed
  plan(): Promise<AdaptationPlan | null>;
  execute(plan: AdaptationPlan): Promise<void>;
}
