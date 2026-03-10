/**
 * Scenario and Counterfactual Types
 *
 * Models alternative futures, shocks, and interventions for what-if analysis.
 */

export type ScenarioType =
  | "baseline"           // Current trajectory
  | "optimistic"         // Best-case scenario
  | "pessimistic"        // Worst-case scenario
  | "shock"              // Discontinuous event
  | "intervention"       // Strategic action
  | "counterfactual";    // What if X had/hadn't happened

export type ShockType =
  | "technological"      // Breakthrough or disruption
  | "regulatory"         // Policy change
  | "competitive"        // New entrant or exit
  | "economic"           // Market shift
  | "organizational";    // Internal change

export interface Shock {
  id: string;
  type: ShockType;
  description: string;
  impactedNodes: string[];
  magnitude: number;         // -1.0 to +1.0
  probability: number;       // 0.0 to 1.0
  timepoint: string;         // ISO timestamp or "t+30d"
  duration?: number;         // Days (undefined = permanent)
  effects: {
    adoptionDelta?: number;  // Change in adoption rate
    diffusionDelta?: number; // Change in diffusion rate
    lockInDelta?: number;    // Change in lock-in strength
    newEdges?: Array<{ from: string; to: string; type: string }>;
    removedEdges?: string[]; // Edge IDs to remove
  };
}

export interface Intervention {
  id: string;
  description: string;
  cost: number;              // Normalized 0-1
  benefit: number;           // Expected value 0-1
  targetNodes: string[];
  actions: {
    increaseAdoption?: { node: string; amount: number }[];
    accelerateDiffusion?: { node: string; multiplier: number }[];
    reduceSwitchingCost?: { from: string; to: string; amount: number }[];
    createEdge?: Array<{ from: string; to: string; type: string }>;
  };
  requiredConditions?: string[];
  expectedDuration: number;  // Days
}

export interface ScenarioBranch {
  id: string;
  type: ScenarioType;
  name: string;
  description: string;
  parentScenario?: string;
  branchPoint: string;       // ISO timestamp
  shocks: Shock[];
  interventions: Intervention[];
  assumptions: string[];
  probability?: number;      // If probabilistic
  metadata: {
    createdAt: string;
    createdBy: string;
    tags: string[];
  };
}

export interface ScenarioOutcome {
  scenarioId: string;
  finalState: {
    nodes: Map<string, {
      adoptionRate: number;
      lockInStrength: number;
      networkPosition: number;
    }>;
    edges: Map<string, {
      strength: number;
      active: boolean;
    }>;
  };
  keyMetrics: {
    avgAdoption: number;
    avgLockIn: number;
    networkDensity: number;
    innovationVelocity: number;
  };
  timeline: Array<{
    t: string;
    event: string;
    impact: number;
  }>;
  confidence: number;
}

/**
 * Apply shock to graph state
 */
export function applyShock(
  state: any,
  shock: Shock
): any {
  const newState = JSON.parse(JSON.stringify(state));

  for (const nodeId of shock.impactedNodes) {
    if (shock.effects.adoptionDelta !== undefined) {
      const node = newState.nodes?.get?.(nodeId) || newState.nodes?.find?.((n: any) => n.id === nodeId);
      if (node && node.adoptionRate !== undefined) {
        node.adoptionRate = Math.max(0, Math.min(1, node.adoptionRate + shock.effects.adoptionDelta * shock.magnitude));
      }
    }

    if (shock.effects.lockInDelta !== undefined) {
      const node = newState.nodes?.get?.(nodeId) || newState.nodes?.find?.((n: any) => n.id === nodeId);
      if (node && node.lockInStrength !== undefined) {
        node.lockInStrength = Math.max(0, Math.min(1, node.lockInStrength + shock.effects.lockInDelta * shock.magnitude));
      }
    }
  }

  // Add new edges
  if (shock.effects.newEdges) {
    for (const edge of shock.effects.newEdges) {
      newState.edges = newState.edges || [];
      newState.edges.push({
        id: `shock-${shock.id}-${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        weight: Math.abs(shock.magnitude),
        source: `shock:${shock.id}`
      });
    }
  }

  // Remove edges
  if (shock.effects.removedEdges) {
    newState.edges = (newState.edges || []).filter(
      (e: any) => !shock.effects.removedEdges!.includes(e.id)
    );
  }

  return newState;
}

/**
 * Apply intervention to graph state
 */
export function applyIntervention(
  state: any,
  intervention: Intervention
): any {
  const newState = JSON.parse(JSON.stringify(state));

  // Increase adoption
  if (intervention.actions.increaseAdoption) {
    for (const action of intervention.actions.increaseAdoption) {
      const node = newState.nodes?.get?.(action.node) || newState.nodes?.find?.((n: any) => n.id === action.node);
      if (node) {
        node.adoptionRate = Math.max(0, Math.min(1, (node.adoptionRate || 0) + action.amount));
      }
    }
  }

  // Accelerate diffusion
  if (intervention.actions.accelerateDiffusion) {
    for (const action of intervention.actions.accelerateDiffusion) {
      const node = newState.nodes?.get?.(action.node) || newState.nodes?.find?.((n: any) => n.id === action.node);
      if (node) {
        node.diffusionRate = (node.diffusionRate || 0) * action.multiplier;
      }
    }
  }

  // Create edges
  if (intervention.actions.createEdge) {
    for (const edge of intervention.actions.createEdge) {
      newState.edges = newState.edges || [];
      newState.edges.push({
        id: `intervention-${intervention.id}-${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        weight: 1.0,
        source: `intervention:${intervention.id}`
      });
    }
  }

  return newState;
}

/**
 * Branch scenario from current state
 */
export function branchScenario(
  baseScenario: ScenarioBranch,
  newScenario: Partial<ScenarioBranch>
): ScenarioBranch {
  return {
    id: newScenario.id || `branch-${Date.now()}`,
    type: newScenario.type || "counterfactual",
    name: newScenario.name || `Branch of ${baseScenario.name}`,
    description: newScenario.description || "",
    parentScenario: baseScenario.id,
    branchPoint: newScenario.branchPoint || new Date().toISOString(),
    shocks: newScenario.shocks || [],
    interventions: newScenario.interventions || [],
    assumptions: [
      ...baseScenario.assumptions,
      ...(newScenario.assumptions || [])
    ],
    probability: newScenario.probability,
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: newScenario.metadata?.createdBy || "system",
      tags: newScenario.metadata?.tags || []
    }
  };
}
