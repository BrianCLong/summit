"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOnboardingPlan = buildOnboardingPlan;
function outcome(stage, metrics) {
    const items = [
        {
            key: 'sso',
            description: 'SSO live',
            status: metrics.ssoLive ? 'done' : 'blocked',
            recoveryAction: 'Enable SSO with IdP admin and validate login flow'
        },
        {
            key: 'integrations',
            description: 'Integrations enabled',
            status: metrics.integrations >= (stage === 'day7' ? 1 : 2) ? 'done' : 'in-progress',
            recoveryAction: 'Pair on integration setup and provide prebuilt configs'
        },
        {
            key: 'dataset',
            description: 'First dataset ingested',
            status: metrics.datasetsIngested > 0 ? 'done' : 'blocked',
            recoveryAction: 'Use sample data or CSV import to unblock ingestion'
        },
        {
            key: 'recipes',
            description: 'Guided recipes completed',
            status: metrics.recipesCompleted >= (stage === 'day14' ? 2 : 1) ? 'done' : 'pending',
            recoveryAction: 'Assign in-app recipes with recovery automation'
        },
        {
            key: 'users',
            description: 'Active users',
            status: metrics.activeUsers >= (stage === 'day7' ? 5 : 10) ? 'done' : 'pending',
            recoveryAction: 'Invite cohorts with role-based templates and office hours'
        },
        {
            key: 'errors',
            description: 'Error budget healthy',
            status: metrics.errorsBelowBudget ? 'done' : 'blocked',
            recoveryAction: 'Enable self-heal actions and prioritize P1 stability'
        }
    ];
    if (stage !== 'day7') {
        items.push({
            key: 'dashboards',
            description: 'Dashboards or reports shipped',
            status: metrics.dashboardsShipped >= 2 ? 'done' : 'pending',
            recoveryAction: 'Preload templates and partner to publish by Day 14'
        });
    }
    if (stage === 'day14' || stage === 'day30') {
        items.push({
            key: 'champion',
            description: 'Champion trained',
            status: metrics.championTrained ? 'done' : 'pending',
            recoveryAction: 'Schedule role-based training and record the session'
        });
    }
    if (stage === 'day30') {
        items.push({
            key: 'hypercare',
            description: 'Hypercare SLA',
            status: metrics.hypercareResponseMinutes <= 30 ? 'done' : 'blocked',
            recoveryAction: 'Enable hypercare paging and escalation ladder'
        }, {
            key: 'business-review',
            description: 'Day-30 business review scheduled',
            status: metrics.businessReviewScheduled ? 'done' : 'pending',
            recoveryAction: 'Send ROI snapshot and lock calendar for review'
        }, {
            key: 'backlog',
            description: 'Backlog of next use cases',
            status: metrics.backlogOfUseCases >= 2 ? 'done' : 'pending',
            recoveryAction: 'Create next-use-case plan with timelines and owners'
        });
    }
    const blockers = items.filter((item) => item.status === 'blocked').map((item) => item.description);
    const completed = items.every((item) => item.status === 'done');
    return { stage, items, completed, blockers };
}
function buildOnboardingPlan(profile, metrics, now) {
    const outcomes = [outcome('day7', metrics), outcome('day14', metrics), outcome('day30', metrics)];
    const hypercare = [
        {
            id: `${profile.id}-hypercare-ladder`,
            category: 'support',
            description: 'Hypercare lane with SLA P1 <30m, P2 <2h and daily standups',
            slaMinutes: 30
        },
        {
            id: `${profile.id}-exec-updates`,
            category: 'governance',
            description: 'Weekly executive updates with usage deltas and planned fixes',
            requiresApproval: false,
            artifacts: ['usage-delta-report', 'incident-log', 'planned-fixes']
        },
        {
            id: `${profile.id}-timeline`,
            category: 'onboarding',
            description: 'Write launch checklist and progress to customer timeline',
            artifacts: ['launch-checklist', 'timeline-entries']
        }
    ];
    const timezoneNote = profile.timezoneOffsetMinutes ? ` (TZ offset ${profile.timezoneOffsetMinutes}m)` : '';
    hypercare.push({
        id: `${profile.id}-office-hours`,
        category: 'adoption',
        description: `Office hours and champion training${timezoneNote}`,
        requiresApproval: false
    });
    return { outcomes, hypercare };
}
