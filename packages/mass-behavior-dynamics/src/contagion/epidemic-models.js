"use strict";
/**
 * Epidemic-Inspired Information Contagion Models
 *
 * Adapts SIR/SEIR/SEIRS models for information spreading
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkContagionModel = exports.SEIRSInformationModel = void 0;
/**
 * SEIRS Model for Information Spreading
 *
 * Compartments:
 * - Susceptible: Haven't encountered the narrative
 * - Exposed: Encountered but not yet "infected" (sharing)
 * - Infected: Actively spreading the narrative
 * - Recovered: No longer spreading, temporary immunity
 * - (loops back to Susceptible with immunity waning)
 */
class SEIRSInformationModel {
    state;
    params;
    constructor(initialState, params) {
        this.state = { ...initialState };
        this.params = params;
    }
    /**
     * Simulate one time step
     */
    step(dt = 1) {
        const { susceptible, exposed, infected, recovered } = this.state;
        const { beta, sigma, gamma, delta } = this.params;
        const N = susceptible + exposed + infected + recovered;
        // Differential equations
        const dS = -beta * susceptible * infected / N + delta * recovered;
        const dE = beta * susceptible * infected / N - sigma * exposed;
        const dI = sigma * exposed - gamma * infected;
        const dR = gamma * infected - delta * recovered;
        // Update state
        this.state = {
            susceptible: Math.max(0, susceptible + dS * dt),
            exposed: Math.max(0, exposed + dE * dt),
            infected: Math.max(0, infected + dI * dt),
            recovered: Math.max(0, recovered + dR * dt),
            resistant: this.state.resistant,
        };
        return { ...this.state };
    }
    /**
     * Calculate basic reproduction number R0
     */
    calculateR0() {
        return this.params.beta / this.params.gamma;
    }
    /**
     * Calculate effective reproduction number Rt
     */
    calculateRt() {
        const N = Object.values(this.state).reduce((a, b) => a + b, 0);
        const susceptibleFraction = this.state.susceptible / N;
        return this.calculateR0() * susceptibleFraction;
    }
    /**
     * Run simulation for specified time
     */
    simulate(duration, dt = 0.1) {
        const trajectory = [{ ...this.state }];
        const steps = Math.ceil(duration / dt);
        for (let i = 0; i < steps; i++) {
            trajectory.push(this.step(dt));
        }
        return trajectory;
    }
}
exports.SEIRSInformationModel = SEIRSInformationModel;
/**
 * Network-Based Contagion Model
 *
 * Extends epidemic model to account for network structure
 */
class NetworkContagionModel {
    network;
    nodeStates;
    params;
    constructor(network, params) {
        this.network = network;
        this.params = params;
        this.nodeStates = new Map();
        // Initialize all nodes as susceptible
        for (const node of network.keys()) {
            this.nodeStates.set(node, {
                state: 'S',
                exposureCount: 0,
                infectionTime: null,
            });
        }
    }
    /**
     * Seed initial infected nodes
     */
    seed(nodes) {
        for (const node of nodes) {
            const state = this.nodeStates.get(node);
            if (state) {
                state.state = 'I';
                state.infectionTime = 0;
            }
        }
    }
    /**
     * Run one time step
     */
    step(t) {
        const newInfections = [];
        const recoveries = [];
        // Process each node
        for (const [node, state] of this.nodeStates.entries()) {
            if (state.state === 'S') {
                // Check for infection
                const neighbors = this.network.get(node) || [];
                const infectedNeighbors = neighbors.filter((n) => this.nodeStates.get(n)?.state === 'I').length;
                if (this.params.contagionType === 'SIMPLE') {
                    // Simple contagion: each exposure has independent probability
                    const infectionProb = 1 - Math.pow(1 - this.params.beta, infectedNeighbors);
                    if (Math.random() < infectionProb) {
                        newInfections.push(node);
                    }
                }
                else {
                    // Complex contagion: requires threshold of exposures
                    state.exposureCount = infectedNeighbors;
                    const threshold = this.params.threshold || 0.25;
                    if (infectedNeighbors / neighbors.length >= threshold) {
                        newInfections.push(node);
                    }
                }
            }
            else if (state.state === 'I') {
                // Check for recovery
                if (state.infectionTime !== null && t - state.infectionTime > 1 / this.params.gamma) {
                    recoveries.push(node);
                }
            }
        }
        // Apply state changes
        for (const node of newInfections) {
            const state = this.nodeStates.get(node);
            state.state = 'I';
            state.infectionTime = t;
        }
        for (const node of recoveries) {
            const state = this.nodeStates.get(node);
            state.state = 'R';
        }
        return {
            t,
            newInfections: newInfections.length,
            totalInfected: this.countByState('I'),
            totalRecovered: this.countByState('R'),
        };
    }
    countByState(state) {
        let count = 0;
        for (const ns of this.nodeStates.values()) {
            if (ns.state === state) {
                count++;
            }
        }
        return count;
    }
}
exports.NetworkContagionModel = NetworkContagionModel;
