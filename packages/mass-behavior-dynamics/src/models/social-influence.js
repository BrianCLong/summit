"use strict";
/**
 * Social Influence Models
 *
 * Models how individuals influence each other's beliefs and behaviors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialInfluenceSimulator = void 0;
/**
 * Social Influence Simulator
 */
class SocialInfluenceSimulator {
    /**
     * Simulate DeGroot opinion dynamics
     *
     * x(t+1) = W * x(t)
     * where W is row-stochastic trust matrix
     */
    simulateDeGroot(opinions, trustMatrix, iterations) {
        const trajectory = [opinions];
        let current = [...opinions];
        for (let t = 0; t < iterations; t++) {
            const next = new Array(current.length).fill(0);
            for (let i = 0; i < current.length; i++) {
                for (let j = 0; j < current.length; j++) {
                    next[i] += trustMatrix[i][j] * current[j];
                }
            }
            trajectory.push(next);
            current = next;
        }
        return trajectory;
    }
    /**
     * Simulate Friedkin-Johnsen with stubborn agents
     *
     * x(t+1) = Λ*W*x(t) + (I-Λ)*x(0)
     * where Λ is diagonal susceptibility matrix
     */
    simulateFriedkinJohnsen(initialOpinions, susceptibilities, trustMatrix, iterations) {
        const trajectory = [initialOpinions];
        let current = [...initialOpinions];
        for (let t = 0; t < iterations; t++) {
            const next = new Array(current.length).fill(0);
            for (let i = 0; i < current.length; i++) {
                // Social influence component
                let socialInfluence = 0;
                for (let j = 0; j < current.length; j++) {
                    socialInfluence += trustMatrix[i][j] * current[j];
                }
                // Weighted combination with initial opinion
                next[i] =
                    susceptibilities[i] * socialInfluence +
                        (1 - susceptibilities[i]) * initialOpinions[i];
            }
            trajectory.push(next);
            current = next;
        }
        return trajectory;
    }
    /**
     * Simulate bounded confidence (Deffuant-Weisbuch)
     *
     * Agents only interact if |x_i - x_j| < ε
     */
    simulateBoundedConfidence(opinions, confidenceBound, convergenceRate, iterations) {
        const trajectory = [[...opinions]];
        const current = [...opinions];
        const n = current.length;
        for (let t = 0; t < iterations; t++) {
            // Random pairwise interaction
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            if (i !== j && Math.abs(current[i] - current[j]) < confidenceBound) {
                const delta = convergenceRate * (current[j] - current[i]);
                current[i] += delta;
                current[j] -= delta;
            }
            if (t % n === 0) {
                trajectory.push([...current]);
            }
        }
        return trajectory;
    }
    /**
     * Simulate threshold model (Granovetter)
     *
     * Agent adopts if fraction of neighbors who adopted > threshold
     */
    simulateThreshold(network, thresholds, initialAdopters, maxIterations) {
        const n = network.length;
        const adopted = new Set(initialAdopters);
        const adoptionTimes = new Map();
        for (const i of initialAdopters) {
            adoptionTimes.set(i, 0);
        }
        const trajectory = [adopted.size];
        for (let t = 1; t <= maxIterations; t++) {
            const newAdopters = [];
            for (let i = 0; i < n; i++) {
                if (adopted.has(i)) {
                    continue;
                }
                // Calculate fraction of neighbors who adopted
                let adoptedNeighbors = 0;
                let totalNeighbors = 0;
                for (let j = 0; j < n; j++) {
                    if (network[i][j] > 0) {
                        totalNeighbors++;
                        if (adopted.has(j)) {
                            adoptedNeighbors++;
                        }
                    }
                }
                const fraction = totalNeighbors > 0 ? adoptedNeighbors / totalNeighbors : 0;
                if (fraction >= thresholds[i]) {
                    newAdopters.push(i);
                }
            }
            for (const i of newAdopters) {
                adopted.add(i);
                adoptionTimes.set(i, t);
            }
            trajectory.push(adopted.size);
            if (newAdopters.length === 0) {
                break;
            }
        }
        return {
            finalAdopters: adopted,
            adoptionTimes,
            trajectory,
            cascadeSize: adopted.size / n,
            cascadeComplete: adopted.size === n,
        };
    }
}
exports.SocialInfluenceSimulator = SocialInfluenceSimulator;
