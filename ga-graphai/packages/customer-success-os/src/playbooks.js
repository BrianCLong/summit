"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prescribeAdoptionPlaybooks = prescribeAdoptionPlaybooks;
exports.prescribeSupportPlaybooks = prescribeSupportPlaybooks;
exports.prescribeExpansionPlaybooks = prescribeExpansionPlaybooks;
exports.prescribeRenewalPlaybooks = prescribeRenewalPlaybooks;
function prescribeAdoptionPlaybooks(profile, behavior, training) {
    const actions = [];
    if (behavior.unusedForDays >= 7 || behavior.dormantFeatures.length) {
        actions.push({
            id: `${profile.id}-nudges`,
            category: 'adoption',
            description: `Trigger behavior-based nudges for ${behavior.dormantFeatures.join(', ') || 'unused features'} with value reminders`
        });
    }
    if (behavior.highValuePatterns.length) {
        actions.push({
            id: `${profile.id}-recipes`,
            category: 'adoption',
            description: `Recommend recipes aligned to patterns: ${behavior.highValuePatterns.join(', ')}`
        });
    }
    if (!training.championPresent || !training.adminsTrained || !training.operatorsTrained) {
        actions.push({
            id: `${profile.id}-training`,
            category: 'adoption',
            description: 'Run role-based training for admins, operators, and executive viewers',
            artifacts: ['recordings', 'playbooks']
        });
    }
    return actions;
}
function prescribeSupportPlaybooks(alerts) {
    return alerts
        .filter((alert) => ['error-spike', 'sla-risk'].includes(alert.kind))
        .map((alert) => ({
        id: `${alert.kind}-${alert.occurredAt.getTime()}`,
        category: 'support',
        description: alert.recommendedPlaybook,
        requiresApproval: alert.severity === 'critical',
        slaMinutes: alert.kind === 'error-spike' ? 30 : 120
    }));
}
function prescribeExpansionPlaybooks(useCase, trigger, adminROIRequested) {
    const actions = [
        {
            id: `${useCase}-upgrade-path`,
            category: 'expansion',
            description: `Present in-app upgrade path tied to ${trigger} with transparent pricing`
        }
    ];
    if (adminROIRequested) {
        actions.push({
            id: `${useCase}-roi`,
            category: 'expansion',
            description: 'Deliver admin ROI dashboard with adoption + business impact',
            artifacts: ['roi-dashboard', 'qbr-export']
        });
    }
    return actions;
}
function prescribeRenewalPlaybooks(renewalDate) {
    const oneHundredTwentyDays = 120 * 24 * 60 * 60 * 1000;
    const startDate = new Date(renewalDate.getTime() - oneHundredTwentyDays);
    return [
        {
            id: 'renewal-health-pack',
            category: 'renewal',
            description: 'Build renewal health pack with usage, ROI, incidents, support history, roadmap alignment',
            artifacts: ['health-pack', 'roadmap-alignment']
        },
        {
            id: 'sponsor-touches',
            category: 'renewal',
            description: 'Schedule executive sponsor touches for strategic accounts',
            requiresApproval: false
        },
        {
            id: 'concession-policy',
            category: 'renewal',
            description: 'Apply controlled concession policy with approvals and expirations',
            requiresApproval: true
        },
        {
            id: 'post-renewal-plan',
            category: 'renewal',
            description: 'Define post-renewal expansion and success plan',
            artifacts: ['expansion-plan', 'success-plan']
        },
        {
            id: 'renewal-kickoff',
            category: 'renewal',
            description: `Start renewal motion on ${startDate.toISOString().split('T')[0]}`
        }
    ];
}
