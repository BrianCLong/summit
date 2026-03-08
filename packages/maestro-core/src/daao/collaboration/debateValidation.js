"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebateValidator = void 0;
const prompts_1 = require("./prompts");
class DebateValidator {
    runner;
    constructor(runner) {
        this.runner = runner;
    }
    async validateAndRefine(originalSolution) {
        // 1. Critic
        const critiqueRaw = await this.runner.run(`Critique this solution:\n${originalSolution}`, prompts_1.CRITIC_PROMPT);
        let critiqueParsed;
        try {
            // Try to parse JSON. Handle potential markdown code blocks ```json ... ```
            const jsonMatch = critiqueRaw.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : critiqueRaw;
            critiqueParsed = JSON.parse(jsonStr);
        }
        catch (e) {
            // Failed to parse, treat as raw critique
            console.warn("Failed to parse critique JSON", e);
        }
        // 2. Decide if refinement is needed
        // If score is high enough (e.g. > 0.9), skip refinement?
        // MWS says "optionally runs a critic→refiner validation loop for medium/hard tasks".
        // Let's assume we always refine if we ran the critic, unless score is perfect.
        if (critiqueParsed && critiqueParsed.score >= 0.95) {
            return {
                refined: originalSolution,
                critiqueRaw,
                critiqueParsed,
                wasRefined: false
            };
        }
        // 3. Refiner
        const refinerInput = prompts_1.REFINER_PROMPT
            .replace('{{original}}', originalSolution)
            .replace('{{critique}}', critiqueRaw);
        const refined = await this.runner.run(refinerInput);
        return {
            refined,
            critiqueRaw,
            critiqueParsed,
            wasRefined: true
        };
    }
}
exports.DebateValidator = DebateValidator;
