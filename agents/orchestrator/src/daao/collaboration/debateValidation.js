"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebateValidator = void 0;
const prompts_js_1 = require("./prompts.js");
class DebateValidator {
    runner;
    constructor(runner) {
        this.runner = runner;
    }
    async validate(draft) {
        // 1. Critic Step
        const criticInput = `${prompts_js_1.CRITIC_PROMPT}\n\nDraft:\n${draft}`;
        const critiqueRaw = await this.runner.run(criticInput);
        let parsedCritique;
        try {
            // Try to find JSON block if mixed with text
            const jsonMatch = critiqueRaw.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : critiqueRaw;
            parsedCritique = JSON.parse(jsonStr);
        }
        catch (e) {
            // Failed to parse, treat as unstructured
        }
        // 2. Refine Step (if needed or always run)
        // For MWS, let's always run if score < 0.9 or if unparseable
        const score = parsedCritique?.score ?? 0;
        if (score >= 0.9 && parsedCritique?.safe) {
            return {
                refined: draft,
                critiqueRaw,
                parsedCritique,
                improved: false
            };
        }
        const refinerInput = prompts_js_1.REFINER_PROMPT
            .replace('{{draft}}', draft)
            .replace('{{critique}}', critiqueRaw);
        const refined = await this.runner.run(refinerInput);
        return {
            refined,
            critiqueRaw,
            parsedCritique,
            improved: true
        };
    }
}
exports.DebateValidator = DebateValidator;
