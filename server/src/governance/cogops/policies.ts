import { CogOpsPolicy } from './policy';
import { Action, Campaign } from '../../campaign/schema';

export const defaultPolicies: CogOpsPolicy[] = [
  {
    id: 'POL-ELECTION-01',
    name: 'Election Interference Safeguard',
    description: 'Prevents amplification of unverified claims during election periods.',
    severity: 'critical',
    check: (action: Action, campaign: Campaign) => {
      if (action.type === 'amplify') {
        const narrative = campaign.narratives.find(n => n.id === action.targetId);
        const metadata = narrative?.metadata as any;
        if (metadata?.topic === 'election' && !metadata?.verified) {
            return false;
        }
      }
      return true;
    }
  },
  {
    id: 'POL-DEEPFAKE-LABEL',
    name: 'Deepfake Labeling Requirement',
    description: 'All synthetic media actions must be labeled.',
    severity: 'high',
    check: (action: Action, campaign: Campaign) => {
       const metadata = action.metadata as any;
       if (metadata?.is_synthetic && !metadata?.label) {
           return false;
       }
       return true;
    }
  }
];
