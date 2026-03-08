"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'SimulationEngine' });
/**
 * Multi-scale Adaptive Simulation Engine
 * Supports Monte Carlo, Agent-Based, and System Dynamics models
 */
class SimulationEngine {
    async runSimulation(twin, request) {
        const startTime = new Date();
        const { config, scenarios = [{ name: 'baseline', overrides: {} }] } = request;
        logger.info({ twinId: twin.metadata.id, engine: config.engine, scenarios: scenarios.length }, 'Starting simulation');
        const outcomes = await Promise.all(scenarios.map((scenario) => this.runScenario(twin, config, scenario)));
        const endTime = new Date();
        const insights = this.generateInsights(outcomes);
        const recommendations = this.generateRecommendations(twin, outcomes);
        const result = {
            id: (0, uuid_1.v4)(),
            twinId: twin.metadata.id,
            config,
            startTime,
            endTime,
            outcomes,
            insights,
            recommendations,
        };
        logger.info({
            twinId: twin.metadata.id,
            durationMs: endTime.getTime() - startTime.getTime(),
            outcomeCount: outcomes.length,
        }, 'Simulation completed');
        return result;
    }
    async runScenario(twin, config, scenario) {
        const initialState = {
            ...twin.currentStateVector.properties,
            ...scenario.overrides,
        };
        switch (config.engine) {
            case 'MONTE_CARLO':
                return this.runMonteCarlo(initialState, config, scenario);
            case 'AGENT_BASED':
                return this.runAgentBased(initialState, config, scenario);
            case 'SYSTEM_DYNAMICS':
                return this.runSystemDynamics(initialState, config, scenario);
            case 'HYBRID':
                return this.runHybrid(initialState, config, scenario);
            default:
                throw new Error(`Unknown simulation engine: ${config.engine}`);
        }
    }
    async runMonteCarlo(initialState, config, scenario) {
        const results = {};
        // Initialize result arrays for numeric properties
        for (const [key, value] of Object.entries(initialState)) {
            if (typeof value === 'number') {
                results[key] = [];
            }
        }
        // Run iterations
        for (let i = 0; i < config.iterations; i++) {
            const state = { ...initialState };
            // Simulate time steps
            for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
                for (const [key, value] of Object.entries(state)) {
                    if (typeof value === 'number') {
                        // Add random walk with drift
                        const drift = config.parameters[`${key}_drift`] ?? 0;
                        const volatility = config.parameters[`${key}_volatility`] ?? 0.1;
                        const noise = this.normalRandom() * volatility * Math.sqrt(config.timeStep);
                        state[key] = value * (1 + drift * config.timeStep + noise);
                    }
                }
            }
            // Record final state
            for (const [key, value] of Object.entries(state)) {
                if (typeof value === 'number') {
                    results[key].push(value);
                }
            }
        }
        // Compute statistics
        const finalState = {};
        const metrics = {};
        for (const [key, values] of Object.entries(results)) {
            finalState[key] = this.mean(values);
            metrics[`${key}_mean`] = this.mean(values);
            metrics[`${key}_std`] = this.stdDev(values);
            metrics[`${key}_p5`] = this.percentile(values, 5);
            metrics[`${key}_p95`] = this.percentile(values, 95);
        }
        return {
            scenario: scenario.name,
            probability: 1.0 / config.iterations,
            stateVector: {
                timestamp: new Date(),
                confidence: 0.8,
                source: 'MONTE_CARLO_SIMULATION',
                properties: finalState,
            },
            metrics,
        };
    }
    async runAgentBased(initialState, config, scenario) {
        // Simplified agent-based model
        const agentCount = config.parameters.agentCount ?? 100;
        const agents = Array.from({ length: agentCount }, (_, i) => ({
            id: i,
            state: { ...initialState },
        }));
        // Run time steps
        for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
            // Agent interactions
            for (const agent of agents) {
                // Simple interaction model
                const neighbors = agents.filter((a) => a.id !== agent.id).slice(0, 5);
                for (const [key, value] of Object.entries(agent.state)) {
                    if (typeof value === 'number') {
                        const neighborMean = neighbors.reduce((sum, n) => sum + n.state[key], 0) /
                            neighbors.length;
                        const influence = config.parameters.influence ?? 0.1;
                        agent.state[key] = value * (1 - influence) + neighborMean * influence;
                    }
                }
            }
        }
        // Aggregate agent states
        const finalState = {};
        for (const key of Object.keys(initialState)) {
            if (typeof initialState[key] === 'number') {
                finalState[key] =
                    agents.reduce((sum, a) => sum + a.state[key], 0) / agentCount;
            }
        }
        return {
            scenario: scenario.name,
            probability: 1.0,
            stateVector: {
                timestamp: new Date(),
                confidence: 0.75,
                source: 'AGENT_BASED_SIMULATION',
                properties: finalState,
            },
            metrics: { agentCount, convergence: 0.9 },
        };
    }
    async runSystemDynamics(initialState, config, scenario) {
        const state = { ...initialState };
        // System dynamics with stocks and flows
        for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
            const flows = {};
            // Compute flows based on parameters
            for (const [key, value] of Object.entries(state)) {
                if (typeof value === 'number') {
                    const inflow = config.parameters[`${key}_inflow`] ?? 0;
                    const outflow = config.parameters[`${key}_outflow`] ?? 0;
                    const feedback = config.parameters[`${key}_feedback`] ?? 0;
                    flows[key] = (inflow - outflow + value * feedback) * config.timeStep;
                }
            }
            // Update states
            for (const [key, flow] of Object.entries(flows)) {
                state[key] += flow;
            }
        }
        return {
            scenario: scenario.name,
            probability: 1.0,
            stateVector: {
                timestamp: new Date(),
                confidence: 0.85,
                source: 'SYSTEM_DYNAMICS_SIMULATION',
                properties: state,
            },
            metrics: { equilibrium: 1.0 },
        };
    }
    async runHybrid(initialState, config, scenario) {
        // Combine Monte Carlo with System Dynamics
        const mcResult = await this.runMonteCarlo(initialState, config, scenario);
        const sdResult = await this.runSystemDynamics(initialState, config, scenario);
        // Weighted ensemble
        const finalState = {};
        for (const key of Object.keys(initialState)) {
            const mcVal = mcResult.stateVector.properties[key];
            const sdVal = sdResult.stateVector.properties[key];
            if (typeof mcVal === 'number' && typeof sdVal === 'number') {
                finalState[key] = mcVal * 0.5 + sdVal * 0.5;
            }
            else {
                finalState[key] = mcVal ?? sdVal;
            }
        }
        return {
            scenario: scenario.name,
            probability: 1.0,
            stateVector: {
                timestamp: new Date(),
                confidence: 0.9,
                source: 'HYBRID_SIMULATION',
                properties: finalState,
            },
            metrics: { ...mcResult.metrics, ...sdResult.metrics },
        };
    }
    generateInsights(outcomes) {
        const insights = [];
        if (outcomes.length > 1) {
            insights.push(`Analyzed ${outcomes.length} scenarios`);
            // Find highest/lowest variance properties
            const firstOutcome = outcomes[0];
            for (const key of Object.keys(firstOutcome.stateVector.properties)) {
                const values = outcomes.map((o) => o.stateVector.properties[key]).filter((v) => typeof v === 'number');
                if (values.length > 1) {
                    const variance = this.stdDev(values) / this.mean(values);
                    if (variance > 0.2) {
                        insights.push(`High scenario sensitivity for ${key} (CV: ${(variance * 100).toFixed(1)}%)`);
                    }
                }
            }
        }
        return insights;
    }
    generateRecommendations(twin, outcomes) {
        const recommendations = [];
        // Check for risk indicators
        for (const outcome of outcomes) {
            for (const [key, value] of Object.entries(outcome.metrics)) {
                if (key.endsWith('_p95') && typeof value === 'number') {
                    const baseKey = key.replace('_p95', '');
                    const mean = outcome.metrics[`${baseKey}_mean`];
                    if (typeof mean === 'number' && value > mean * 1.5) {
                        recommendations.push(`Consider hedging strategies for ${baseKey} tail risk`);
                    }
                }
            }
        }
        if (recommendations.length === 0) {
            recommendations.push('Twin state appears stable under simulated conditions');
        }
        return recommendations;
    }
    // Helper methods
    normalRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    stdDev(arr) {
        const m = this.mean(arr);
        return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
    }
    percentile(arr, p) {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
}
exports.SimulationEngine = SimulationEngine;
