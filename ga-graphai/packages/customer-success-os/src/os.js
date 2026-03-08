"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operate = operate;
const advocacy_1 = require("./advocacy");
const onboarding_1 = require("./onboarding");
const playbooks_1 = require("./playbooks");
const support_1 = require("./support");
const expansion_1 = require("./expansion");
const governance_1 = require("./governance");
const healthScoring_1 = require("./healthScoring");
const timeline_1 = require("./timeline");
const reports_1 = require("./reports");
function predictiveJourney(timeline, alerts) {
    const riskIndicators = alerts.filter((alert) => ['adoption-drop', 'error-spike', 'sla-risk'].includes(alert.kind));
    const recencyBoost = timeline.some((event) => event.kind === 'recipe.completed') ? -5 : 0;
    const riskScore = Math.min(100, riskIndicators.length * 20 + recencyBoost + alerts.length * 3);
    const likelihoodNextAction = riskScore > 60 ? 'activate adoption rescue playbook' : 'prepare advocacy outreach';
    return {
        riskScore,
        likelihoodNextAction,
        explanation: `Derived from ${riskIndicators.length} high-risk alerts and ${timeline.length} timeline events`
    };
}
function operate(inputs) {
    const health = (0, healthScoring_1.calculateHealthScore)(inputs.health, inputs.previousHealth);
    const timelineInsight = (0, timeline_1.summarizeTimeline)(inputs.timeline, inputs.health.lastUpdated);
    const onboarding = (0, onboarding_1.buildOnboardingPlan)(inputs.profile, inputs.progressMetrics, inputs.health.lastUpdated);
    const adoptionActions = (0, playbooks_1.prescribeAdoptionPlaybooks)(inputs.profile, inputs.behaviorSignals, inputs.trainingSignals);
    const supportPlaybooks = (0, playbooks_1.prescribeSupportPlaybooks)(health.alerts);
    const supportPlan = (0, support_1.buildSupportPlan)(inputs.tickets, health.alerts);
    const expansionTriggers = (0, expansion_1.detectExpansionTriggers)(inputs.expansionSignals);
    const expansionActions = (0, playbooks_1.prescribeExpansionPlaybooks)(inputs.profile.targetUseCases[0], expansionTriggers[0]?.trigger || 'usage milestone', true);
    const renewalPlan = {
        startDate: new Date(inputs.renewalDate.getTime() - 120 * 24 * 60 * 60 * 1000),
        renewalDate: inputs.renewalDate,
        milestones: (0, playbooks_1.prescribeRenewalPlaybooks)(inputs.renewalDate)
    };
    const advocacy = (0, advocacy_1.identifyAdvocacyCandidates)(health);
    const governance = (0, governance_1.enforceGovernance)(inputs.governance);
    const predictiveInsights = predictiveJourney(inputs.timeline, health.alerts);
    const actions = [
        ...onboarding.hypercare,
        ...adoptionActions,
        ...supportPlaybooks,
        ...supportPlan.escalations,
        ...expansionActions,
        ...governance.approvals,
        ...renewalPlan.milestones
    ];
    const alerts = [...health.alerts];
    const stalledHours = Math.max(inputs.behaviorSignals.stalledOnboardingHours, timelineInsight.stalledOnboardingHours);
    if (stalledHours >= 72) {
        alerts.push({
            kind: 'stalled-onboarding',
            severity: 'high',
            message: 'Onboarding stalled for more than 72 hours',
            recommendedPlaybook: 'Launch recovery actions, pair on integrations, and unblock recipes',
            occurredAt: inputs.health.lastUpdated
        });
    }
    if (advocacy.length) {
        alerts.push({
            kind: 'advocacy-opportunity',
            severity: 'medium',
            message: 'Customer is healthy enough to invite to reference program',
            recommendedPlaybook: 'Offer benefits and schedule reference call',
            occurredAt: inputs.health.lastUpdated
        });
    }
    if (expansionTriggers.length) {
        alerts.push({
            kind: 'expansion-opportunity',
            severity: 'medium',
            message: 'Expansion trigger detected; align upgrade path to value moment',
            recommendedPlaybook: expansionActions[0]?.description || 'Present upgrade options',
            occurredAt: inputs.health.lastUpdated
        });
    }
    const frictionLog = (0, reports_1.buildFrictionLog)(inputs.tickets, alerts);
    const executiveUpdate = (0, reports_1.buildExecutiveUpdate)(health, timelineInsight, actions, alerts);
    return {
        health,
        checklists: onboarding.outcomes,
        actions,
        alerts,
        expansionTriggers,
        renewalPlan,
        advocacy,
        trust: governance.controls,
        predictiveInsights,
        frictionLog,
        executiveUpdate,
        timelineInsight
    };
}
