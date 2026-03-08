"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPolicies = void 0;
exports.defaultPolicies = [
    {
        id: 'POL-ELECTION-01',
        name: 'Election Interference Safeguard',
        description: 'Prevents amplification of unverified claims during election periods.',
        severity: 'critical',
        check: (action, campaign) => {
            if (action.type === 'amplify') {
                const narrative = campaign.narratives.find(n => n.id === action.targetId);
                const metadata = narrative?.metadata;
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
        check: (action, campaign) => {
            const metadata = action.metadata;
            if (metadata?.is_synthetic && !metadata?.label) {
                return false;
            }
            return true;
        }
    }
];
