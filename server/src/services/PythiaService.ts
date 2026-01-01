
export interface SimulationScenario {
  name: string;
  targetNodeId: string;
  interventionType: 'TAKEDOWN' | 'AMPLIFY' | 'ISOLATE';
  durationHours: number;
}

export interface SimulationResult {
  scenarioId: string;
  predictedImpactScore: number;
  confidenceInterval: [number, number];
  affectedNodesCount: number;
  timestamp: Date;
}

interface GraphNode {
  id: string;
  weight: number;
  connections: string[];
}

export class PythiaService {
  private static instance: PythiaService;

  private constructor() {}

  public static getInstance(): PythiaService {
    if (!PythiaService.instance) {
      PythiaService.instance = new PythiaService();
    }
    return PythiaService.instance;
  }

  public async simulateIntervention(scenario: SimulationScenario): Promise<SimulationResult> {
    console.log(`[Pythia] Starting simulation: ${scenario.name}`);

    // 1. Create In-Memory Graph Snapshot (Mini-World)
    const graph: Map<string, GraphNode> = new Map();
    for(let i=0; i<100; i++) {
      graph.set(`node-${i}`, {
        id: `node-${i}`,
        weight: 1.0,
        connections: [`node-${(i+1)%100}`]
      });
    }

    // 2. Apply Intervention
    let affected = 0;

    if (scenario.interventionType === 'TAKEDOWN') {
      if (graph.has(scenario.targetNodeId)) {
        graph.delete(scenario.targetNodeId);
        affected++;
        // Cascade penalty
        for (const [id, node] of graph) {
           if (node.connections.includes(scenario.targetNodeId)) {
             node.weight *= 0.5;
             affected++;
           }
        }
      }
    } else if (scenario.interventionType === 'AMPLIFY') {
      if (graph.has(scenario.targetNodeId)) {
        const node = graph.get(scenario.targetNodeId)!;
        node.weight *= 2.0;
        affected++;
        // Neighbors get boost
        for (const [id, n] of graph) {
           if (n.connections.includes(scenario.targetNodeId)) {
             n.weight *= 1.5;
             affected++;
           }
        }
      }
    } else if (scenario.interventionType === 'ISOLATE') {
      if (graph.has(scenario.targetNodeId)) {
        const node = graph.get(scenario.targetNodeId)!;
        node.connections = []; // Cut outgoing
        affected++;
        // Cut incoming
        for (const [id, n] of graph) {
          n.connections = n.connections.filter(c => c !== scenario.targetNodeId);
          if (n.connections.length === 0) affected++; // Orphaned
        }
      }
    }

    // 3. Calculate Impact
    const totalWeight = Array.from(graph.values()).reduce((sum, n) => sum + n.weight, 0);
    const initialWeight = 100.0;
    const impact = Math.abs(initialWeight - totalWeight);

    return {
      scenarioId: crypto.randomUUID(),
      predictedImpactScore: impact,
      confidenceInterval: [impact * 0.9, impact * 1.1],
      affectedNodesCount: affected,
      timestamp: new Date()
    };
  }
}
