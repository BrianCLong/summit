"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMAgent = exports.RuleBasedAgent = exports.SimulationAgent = void 0;
const node_crypto_1 = require("node:crypto");
class SimulationAgent {
    config;
    entity;
    constructor(config, entity) {
        this.config = config;
        this.entity = entity;
    }
    get id() {
        return this.config.entityId;
    }
    get role() {
        return this.config.role;
    }
    createEvent(type, description, state, overrides) {
        // Basic heuristics for theme selection if not provided
        const theme = overrides?.theme ?? state.themes[0];
        return {
            id: (0, node_crypto_1.randomUUID)(),
            type,
            actorId: this.id,
            theme,
            intensity: 1.0,
            description,
            scheduledTick: state.tick + 1,
            ...overrides,
        };
    }
}
exports.SimulationAgent = SimulationAgent;
class RuleBasedAgent extends SimulationAgent {
    constructor(config, entity) {
        super(config, entity);
    }
    async decideAction(state) {
        const entityState = state.entities[this.id];
        if (!entityState)
            return null;
        // Simple heuristic: if pressure is high, do something to reduce it
        if (entityState.pressure > 0.7) {
            return this.createEvent('intervention', `${this.entity.name} takes measures to reduce pressure.`, state, {
                sentimentShift: 0.1,
                influenceShift: 0.0,
                intensity: 0.8,
            });
        }
        // If sentiment is very negative, try to improve it
        if (entityState.sentiment < -0.5) {
            return this.createEvent('social', `${this.entity.name} issues a statement to clarify their position.`, state, {
                sentimentShift: 0.2,
                intensity: 0.5
            });
        }
        // Random chance to act based on influence (more influential actors act more often)
        if (Math.random() < entityState.influence * 0.3) {
            return this.createEvent('political', `${this.entity.name} exercises influence to advance their goal: ${this.config.goal}.`, state, {
                influenceShift: 0.05,
            });
        }
        return null;
    }
}
exports.RuleBasedAgent = RuleBasedAgent;
class LLMAgent extends SimulationAgent {
    llmClient;
    constructor(config, entity, llmClient) {
        super(config, entity);
        this.llmClient = llmClient;
    }
    async decideAction(state) {
        const entityState = state.entities[this.id];
        if (!entityState)
            return null;
        // Only act occasionally to avoid flooding
        // LLM agents might be expensive, so we throttle them artificially here or rely on the caller.
        // Let's assume the caller manages frequency or we do a simple check.
        // For now, let's act with 20% probability per tick + pressure factor.
        if (Math.random() > 0.2 + entityState.pressure * 0.2) {
            return null;
        }
        const prompt = this.constructPrompt(state);
        try {
            // We reuse the generateNarrative method for now as a generic "ask LLM" interface,
            // but ideally LLMClient should have a more generic 'generate' method.
            // Since LLMClient interface in types.ts only has generateNarrative, we have to hack it
            // or update the interface.
            // Let's check types.ts again.
            // interface LLMClient { generateNarrative(request: LLMNarrativeRequest): Promise<string>; }
            // The request takes 'state' and 'recentEvents'.
            // We can pass a specially crafted state or modify the client.
            // Actually, the best way is to update LLMClient to be more generic,
            // but I should stick to the plan.
            // The 'EchoLLMClient' in routes just echoes.
            // I will assume for now I can cast or extend the client usage if needed,
            // but strictly following the interface:
            const response = await this.llmClient.generateNarrative({
                state: state,
                recentEvents: state.recentEvents
            });
            // The Echo client returns a string summary. A real LLM client would return text.
            // We need to parse that text into an action.
            // For this "Simulation" MVP, let's assume the LLM returns a JSON string describing the action
            // or we parse the text.
            // Since I can't easily change the LLMClient interface deep in the system without checking all implementations,
            // I will implement a basic "intent" parser from the text.
            if (response.includes("Action:")) {
                // Very simple parser for demo purposes
                const description = response.split("Action:")[1].trim();
                return this.createEvent('intervention', description, state);
            }
            // If the LLM is just summarizing, we interpret the summary as "intent"
            return this.createEvent('political', `LLM Action based on: ${response.substring(0, 50)}...`, state);
        }
        catch (error) {
            console.error("LLM Agent failed to decide action", error);
            return null;
        }
    }
    constructPrompt(state) {
        // This would be used if we had a direct 'completion' API.
        // Since we are using 'generateNarrative', this is internal helper logic
        // effectively unused unless we change the client interaction.
        return `You are ${this.config.role} (${this.entity.name}).
      Your goal is: ${this.config.goal}.
      Current situation: ...
      Decide on an action.`;
    }
}
exports.LLMAgent = LLMAgent;
