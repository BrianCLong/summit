"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeveloperExperienceGuide = void 0;
class DeveloperExperienceGuide {
    knowledgeGraph;
    policyGateway;
    events = [];
    constructor(options) {
        this.knowledgeGraph = options.knowledgeGraph;
        this.policyGateway = options.policyGateway;
    }
    recommendGoldenPath(serviceId, persona, context) {
        const serviceContext = this.knowledgeGraph.queryService(serviceId);
        if (!serviceContext) {
            return undefined;
        }
        const environmentId = context.environmentId ?? serviceContext.environments?.[0]?.id ?? 'unknown';
        const guardrails = this.policyGateway.evaluate({
            action: persona === 'sre' ? 'orchestration.rollback' : 'orchestration.deploy',
            resource: `service:${serviceId}`,
            context: context.actor,
        }, context.guardContext);
        const steps = this.buildSteps(persona, environmentId, guardrails.requiresApproval);
        const risk = serviceContext.risk;
        const suggestedSurvey = persona === 'feature-dev' && (!risk || risk.score < 0.4);
        return {
            serviceId,
            environmentId,
            steps,
            guardrails,
            risk,
            suggestedSurvey,
        };
    }
    recordEvent(event) {
        this.events.push(event);
    }
    telemetrySummary() {
        if (this.events.length === 0) {
            return { totalEvents: 0, successRate: 0, frictionHotspots: {} };
        }
        const total = this.events.length;
        const successes = this.events.filter((event) => event.success).length;
        const satisfactionScores = this.events
            .map((event) => event.satisfactionScore)
            .filter((score) => typeof score === 'number');
        const frictionHotspots = {};
        for (const event of this.events) {
            for (const tag of event.frictionTags ?? []) {
                frictionHotspots[tag] = (frictionHotspots[tag] ?? 0) + 1;
            }
        }
        const averageSatisfaction = satisfactionScores.length > 0
            ? Number((satisfactionScores.reduce((acc, score) => acc + score, 0) /
                satisfactionScores.length).toFixed(2))
            : undefined;
        return {
            totalEvents: total,
            successRate: Number((successes / total).toFixed(2)),
            averageSatisfaction,
            frictionHotspots,
        };
    }
    buildSteps(persona, environmentId, requiresApproval) {
        const base = [`Open portal golden path for ${environmentId}`, 'Run pipeline dry-run'];
        if (persona === 'platform-engineer') {
            base.unshift('Review knowledge graph diff for service');
        }
        if (persona === 'sre') {
            base.push('Trigger rehearsal mode for self-healing runbook');
        }
        if (requiresApproval) {
            base.push('Request approval via guardrail gateway before execution');
        }
        base.push('Capture DX survey response');
        return base;
    }
}
exports.DeveloperExperienceGuide = DeveloperExperienceGuide;
