import { Action, Campaign } from '../../campaign/schema';

export interface CogOpsPolicy {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (action: Action, campaign: Campaign) => boolean; // Returns true if allowed
}
