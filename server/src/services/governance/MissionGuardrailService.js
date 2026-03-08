"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionGuardrailService = void 0;
class MissionGuardrailService {
    static instance;
    missionProfile;
    guardrails = [];
    constructor() {
        this.missionProfile = {
            statement: "To empower civil society and defend against authoritarian overreach.",
            allowedSectors: ['defense', 'healthcare', 'education', 'civil_society'],
            disallowedSectors: ['gambling', 'predatory_lending', 'authoritarian_surveillance'],
            priorities: ['privacy', 'equity', 'safety']
        };
        this.guardrails = [
            {
                id: 'gr_1',
                type: 'USE_CASE',
                description: 'Disallow predictive policing',
                check: (ctx) => ctx.useCase !== 'predictive_policing'
            },
            {
                id: 'gr_2',
                type: 'INTENSITY',
                description: 'Limit high-intensity influence ops',
                check: (ctx) => !(ctx.pipeline === 'influence_ops' && ctx.intensity > 50 && !ctx.humanReview)
            }
        ];
    }
    static getInstance() {
        if (!MissionGuardrailService.instance) {
            MissionGuardrailService.instance = new MissionGuardrailService();
        }
        return MissionGuardrailService.instance;
    }
    checkGuardrails(context) {
        const violations = [];
        // Check disallowed sectors
        if (context.sector && this.missionProfile.disallowedSectors.includes(context.sector)) {
            violations.push(`Sector ${context.sector} is disallowed by mission profile.`);
        }
        // Check specific guardrails
        for (const gr of this.guardrails) {
            try {
                if (!gr.check(context)) {
                    violations.push(`Guardrail violation: ${gr.description}`);
                }
            }
            catch (e) {
                // Fail closed
                violations.push(`Guardrail check failed for ${gr.id}`);
            }
        }
        return {
            allowed: violations.length === 0,
            violations
        };
    }
}
exports.MissionGuardrailService = MissionGuardrailService;
