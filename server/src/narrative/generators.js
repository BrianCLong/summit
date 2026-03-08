"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMDrivenNarrativeGenerator = exports.RuleBasedNarrativeGenerator = void 0;
const MOMENTUM_LABELS = {
    improving: 'rising',
    degrading: 'sliding',
    steady: 'steady',
};
class RuleBasedNarrativeGenerator {
    mode = 'rule-based';
    async generate(state, recentEvents) {
        const highlightPieces = state.arcs.map((arc) => {
            const label = MOMENTUM_LABELS[arc.outlook];
            const entities = arc.keyEntities.length
                ? `Actors: ${arc.keyEntities.join(', ')}.`
                : '';
            return {
                theme: arc.theme,
                text: `${arc.theme} is ${label} with momentum ${(arc.momentum * 100).toFixed(0)}% and confidence ${(arc.confidence * 100).toFixed(0)}%. ${entities}`.trim(),
            };
        });
        const riskSignals = highlightPieces
            .filter((h) => h.text.includes('sliding') || h.text.includes('degrading'))
            .map((h) => `Watch ${h.theme} — outlook deteriorating.`);
        const opportunitySignals = highlightPieces
            .filter((h) => h.text.includes('rising') || h.text.includes('improving'))
            .map((h) => `Capitalize on ${h.theme} momentum.`);
        const primaryArc = state.arcs.sort((a, b) => b.momentum - a.momentum)[0];
        const summary = primaryArc
            ? `Tick ${state.tick}: ${primaryArc.theme} dominates the narrative with ${(primaryArc.momentum * 100).toFixed(1)}% momentum.`
            : `Tick ${state.tick}: Narrative remains in equilibrium.`;
        const recent = recentEvents
            .slice(-3)
            .map((event) => `${event.type} event: ${event.description}`);
        const summaryWithEvents = recent.length
            ? `${summary} Recent drivers: ${recent.join('; ')}.`
            : summary;
        return {
            mode: this.mode,
            summary: summaryWithEvents,
            highlights: highlightPieces,
            risks: riskSignals,
            opportunities: opportunitySignals,
        };
    }
}
exports.RuleBasedNarrativeGenerator = RuleBasedNarrativeGenerator;
class LLMDrivenNarrativeGenerator {
    mode = 'llm';
    llmClient;
    fallback;
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.fallback = new RuleBasedNarrativeGenerator();
    }
    async generate(state, recentEvents) {
        const request = { state, recentEvents };
        try {
            const response = await this.llmClient.generateNarrative(request);
            const highlights = state.arcs.map((arc) => ({
                theme: arc.theme,
                text: arc.narrative,
            }));
            return {
                mode: this.mode,
                summary: response,
                highlights,
                risks: this.extractLines(response, /risk:/i),
                opportunities: this.extractLines(response, /opportunity:/i),
            };
        }
        catch (error) {
            const fallbackResult = await this.fallback.generate(state, recentEvents);
            return {
                ...fallbackResult,
                mode: this.mode,
                summary: `${fallbackResult.summary} (LLM unavailable, fallback engaged)`,
            };
        }
    }
    extractLines(text, pattern) {
        return text
            .split(/\n|\.\s/)
            .map((line) => line.trim())
            .filter((line) => pattern.test(line))
            .map((line) => line.replace(pattern, '').trim())
            .filter(Boolean);
    }
}
exports.LLMDrivenNarrativeGenerator = LLMDrivenNarrativeGenerator;
