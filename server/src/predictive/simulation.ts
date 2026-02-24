import { SimpleGraphEngine } from './SimpleGraph';
import { SimulationRequest, SimulationResult, SimulationStep } from '../contracts/predictive/types';

export class CampaignSimulator {
  static simulate(graph: SimpleGraphEngine, request: SimulationRequest): SimulationResult {
    const { seedEntityIds, steps, parameters } = request;
    const { spreadProbability, decayFactor } = parameters;

    const trajectory: SimulationStep[] = [];
    let currentInfected = new Set<string>(seedEntityIds);
    let allInfected = new Set<string>(seedEntityIds);

    // Initial state
    trajectory.push({
      step: 0,
      infectedNodeIds: Array.from(currentInfected),
      activeEdges: []
    });

    for (let t = 1; t <= steps; t++) {
      const nextInfected = new Set<string>();
      const activeEdges: string[] = [];

      // Decay check: nodes might stop being active spreaders,
      // but for "campaign reach" we usually care about cumulative reach or current active spreaders.
      // Let's model simple SI (Susceptible-Infected) with probability.

      for (const nodeId of currentInfected) {
        // If node is "exhausted" it might stop spreading, but let's keep it simple:
        // Active nodes try to infect neighbors.

        // Apply decay to probability if needed (e.g. signal strength fades)
        // Here we assume constant probability for simplicity, or we could track "energy" per node.

        const neighbors = graph.getNeighbors(nodeId);

        for (const neighborId of neighbors) {
          if (!allInfected.has(neighborId)) {
            // Roll dice
            if (Math.random() < spreadProbability) {
              nextInfected.add(neighborId);
              allInfected.add(neighborId);
              activeEdges.push(`${nodeId}->${neighborId}`);
            }
          }
        }
      }

      // Update state
      if (nextInfected.size === 0) break; // Trajectory ends if no new infections

      // For next step, who spreads?
      // Option A: Only newly infected (SI model with recovery/inactive after 1 step)
      // Option B: All infected (SI model, persistent)
      // "Decay factor" usually implies signal loss. Let's say effective spread prob drops?
      // Or let's assume "Information Cascade" where only newly activated nodes spread efficiently.

      // Let's go with: newly infected become the active spreaders for next round.
      // + a small chance for old infected to re-spread? No, keep it simple.
      currentInfected = nextInfected;

      trajectory.push({
        step: t,
        infectedNodeIds: Array.from(nextInfected),
        activeEdges
      });
    }

    return {
      trajectory,
      impactAssessment: {
        totalReached: allInfected.size,
        criticalNodesReached: [] // Filter allInfected by some criteria if available in graph
      }
    };
  }
}
