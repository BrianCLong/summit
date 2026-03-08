"use strict";
/**
 * Quantum Annealing Simulator
 * Simulates quantum annealing for optimization problems
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumAnnealer = void 0;
exports.createQuantumAnnealer = createQuantumAnnealer;
class QuantumAnnealer {
    temperature = 1.0;
    coolingRate = 0.95;
    async anneal(problem, maxIterations = 10000) {
        // Initialize random solution
        let currentSolution = this.initializeSolution(problem.numVars);
        let currentEnergy = this.computeEnergy(currentSolution, problem.qubo);
        let bestSolution = [...currentSolution];
        let bestEnergy = currentEnergy;
        const schedule = [];
        let temperature = this.temperature;
        for (let iter = 0; iter < maxIterations; iter++) {
            // Propose a new solution by flipping a random bit
            const newSolution = this.proposeSolution(currentSolution);
            const newEnergy = this.computeEnergy(newSolution, problem.qubo);
            // Decide whether to accept new solution
            const deltaE = newEnergy - currentEnergy;
            const acceptanceProbability = Math.exp(-deltaE / temperature);
            if (deltaE < 0 || Math.random() < acceptanceProbability) {
                currentSolution = newSolution;
                currentEnergy = newEnergy;
                if (currentEnergy < bestEnergy) {
                    bestSolution = [...currentSolution];
                    bestEnergy = currentEnergy;
                }
            }
            // Cool down
            temperature *= this.coolingRate;
            // Record schedule
            if (iter % 100 === 0) {
                schedule.push({ time: iter, temperature });
            }
            // Early termination if temperature is very low
            if (temperature < 1e-10) {
                break;
            }
        }
        return {
            solution: bestSolution,
            energy: bestEnergy,
            iterations: schedule.length,
            annealingSchedule: schedule,
        };
    }
    initializeSolution(numVars) {
        return Array(numVars).fill(0).map(() => Math.random() < 0.5 ? 0 : 1);
    }
    proposeSolution(current) {
        const newSolution = [...current];
        const flipIndex = Math.floor(Math.random() * current.length);
        newSolution[flipIndex] = 1 - newSolution[flipIndex];
        return newSolution;
    }
    computeEnergy(solution, qubo) {
        let energy = 0;
        for (let i = 0; i < solution.length; i++) {
            for (let j = 0; j < solution.length; j++) {
                energy += qubo[i][j] * solution[i] * solution[j];
            }
        }
        return energy;
    }
    setTemperature(temp) {
        this.temperature = temp;
    }
    setCoolingRate(rate) {
        this.coolingRate = rate;
    }
}
exports.QuantumAnnealer = QuantumAnnealer;
function createQuantumAnnealer() {
    return new QuantumAnnealer();
}
