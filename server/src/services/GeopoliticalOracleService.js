"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geopoliticalOracle = exports.GeopoliticalOracleService = void 0;
const registry_js_1 = require("../prompts/registry.js");
const logger_js_1 = require("../utils/logger.js");
const SafetyBoundary_js_1 = require("./SafetyBoundary.js");
class GeopoliticalOracleService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!GeopoliticalOracleService.instance) {
            GeopoliticalOracleService.instance = new GeopoliticalOracleService();
        }
        return GeopoliticalOracleService.instance;
    }
    /**
     * Generic executor for geopolitical prompts with JSON parsing
     */
    async executePrompt(promptId, inputs) {
        try {
            // Safety Translation Step:
            // Artifact B: Indirect Prompt Injection Defense.
            // We explicitly sanitize any "context_data" input before it reaches the prompt template.
            if (inputs.context_data && typeof inputs.context_data === 'string') {
                const preCheck = SafetyBoundary_js_1.safetyBoundary.scanInputForInjection(inputs.context_data);
                if (!preCheck.safe) {
                    logger_js_1.logger.warn(`Prompt execution blocked by SafetyBoundary: ${preCheck.reason}`);
                    throw new Error(`Safety Violation: ${preCheck.reason}`);
                }
                // Mutate inputs to use sanitized version
                // This ensures the prompt template receives the wrapped content
                inputs.context_data = SafetyBoundary_js_1.safetyBoundary.sanitizeInput(inputs.context_data);
            }
            const renderedPrompt = registry_js_1.promptRegistry.render(promptId, inputs);
            logger_js_1.logger.info(`Executed prompt ${promptId}`, { inputs });
            // Placeholder execution
            // In a real system, we would also verify the *output* using safetyBoundary.verifyOutput(response)
            const mockResponse = {
                executed: true,
                prompt_id: promptId,
                rendered_content: renderedPrompt,
                // Simulating a safe response for the mock
                generated_text: "Analysis complete. No anomalies detected."
            };
            // Artifact A: Constitution Check (Output)
            // Verify the generated response is safe
            const outputCheck = SafetyBoundary_js_1.safetyBoundary.verifyOutput(mockResponse.generated_text);
            if (!outputCheck.safe) {
                throw new Error(`Output Safety Violation: ${outputCheck.reason}`);
            }
            return mockResponse;
        }
        catch (error) {
            logger_js_1.logger.error(`Failed to execute prompt ${promptId}`, { error: error.message });
            throw error;
        }
    }
    // 84
    async calculateEliteFractureIndex(country, contextData) {
        return this.executePrompt('geopolitics.elite-fracture-index@v1', { country, context_data: contextData });
    }
    // 85
    async runSuccessionSim(capital, contextData) {
        return this.executePrompt('geopolitics.succession-war-simulator@v1', { capital, context_data: contextData });
    }
    // 86
    async getNuclearBreakoutDate(country, contextData) {
        return this.executePrompt('geopolitics.nuclear-breakout-countdown@v1', { country, context_data: contextData });
    }
    // 87
    async detectColorRevolution(country, contextData) {
        return this.executePrompt('geopolitics.color-revolution-kill-chain@v1', { country, context_data: contextData });
    }
    // 88
    async predictFoodRiots(city, contextData) {
        return this.executePrompt('geopolitics.food-riot-predictor@v1', { city, context_data: contextData });
    }
    // 89
    async assessNavalBlockade(countryA, countryB, contextData) {
        return this.executePrompt('geopolitics.naval-blockade-feasibility@v1', { country_a: countryA, country_b: countryB, context_data: contextData });
    }
    // 90
    async detectAllianceDeathSpiral(allianceName, contextData) {
        return this.executePrompt('geopolitics.alliance-death-spiral@v1', { alliance_name: allianceName, context_data: contextData });
    }
    // 91
    async monitorLeaderHealth(leaderName, contextData) {
        return this.executePrompt('geopolitics.leader-health-black-swan@v1', { leader_name: leaderName, context_data: contextData });
    }
    // 92
    async predictWaterWar(riverBasin, contextData) {
        return this.executePrompt('geopolitics.water-war-trigger-map@v1', { river_basin: riverBasin, context_data: contextData });
    }
    // 93
    async measureDiasporaWeaponization(diasporaGroup, contextData) {
        return this.executePrompt('geopolitics.diaspora-weaponization-index@v1', { diaspora_group: diasporaGroup, context_data: contextData });
    }
    // 94
    async calculateElectionTheftLimit(election, contextData) {
        return this.executePrompt('geopolitics.election-theft-feasibility@v1', { election, context_data: contextData });
    }
    // 95
    async generateSanctionsEscapeRoute(sanctionedEntity, contextData) {
        return this.executePrompt('geopolitics.sanctions-escape-route@v1', { sanctioned_entity: sanctionedEntity, context_data: contextData });
    }
    // 96
    async validateArcticClaim(contextData) {
        return this.executePrompt('geopolitics.arctic-claim-validator@v1', { context_data: contextData });
    }
    // 97
    async trackDeDollarization(country, contextData) {
        return this.executePrompt('geopolitics.currency-de-dollarization@v1', { country, context_data: contextData });
    }
    // 98
    async scoreCoupProofness(country, contextData) {
        return this.executePrompt('geopolitics.coup-proofness-score@v1', { country, context_data: contextData });
    }
    // 99
    async warningGenocide(region, contextData) {
        return this.executePrompt('geopolitics.genocide-early-warning@v1', { region, context_data: contextData });
    }
    // 100
    async identifyMineralChokePoints(mineral, contextData) {
        return this.executePrompt('geopolitics.strategic-mineral-choke-point@v1', { mineral, context_data: contextData });
    }
    // 101
    async predictTaiwanInvasionWindow(contextData) {
        return this.executePrompt('geopolitics.taiwan-invasion-weather-window@v1', { context_data: contextData });
    }
    // 102
    async checkPowerTransitionClock(currentHegemon, contextData) {
        return this.executePrompt('geopolitics.global-power-transition-clock@v1', { current_hegemon: currentHegemon, context_data: contextData });
    }
    // 103
    async planFalseFlag(target, objective, contextData) {
        return this.executePrompt('geopolitics.false-flag-planner@v1', { target, objective, context_data: contextData });
    }
    // 104
    async listNuclearWinterSurvivors(contextData) {
        return this.executePrompt('geopolitics.nuclear-winter-survivor-list@v1', { context_data: contextData });
    }
    // 105
    async simulateRedButton(country, contextData) {
        return this.executePrompt('geopolitics.red-button-simulator@v1', { country, context_data: contextData });
    }
    // 106
    async askTheFinalQuestion(prompt102Value) {
        return this.executePrompt('geopolitics.the-final-question@v1', { prompt_102_value: prompt102Value });
    }
}
exports.GeopoliticalOracleService = GeopoliticalOracleService;
exports.geopoliticalOracle = GeopoliticalOracleService.getInstance();
