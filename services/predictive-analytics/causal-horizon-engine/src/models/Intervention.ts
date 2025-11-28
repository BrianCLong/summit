export enum InterventionType {
  HARD = 'HARD', // Set variable to fixed value
  SOFT = 'SOFT', // Shift distribution of variable
}

export interface Intervention {
  variable: string;
  value: any;
  type: InterventionType;
  cost?: number;
  feasibility?: number; // [0, 1] - how feasible is this intervention
}

export interface InterventionSet {
  interventions: Intervention[];
  totalCost: number;
  expectedEffect: number;
  confidence: number;
  rank?: number;
}

export interface Target {
  variable: string;
  desiredValue?: any;
  threshold?: number; // Minimum probability threshold
}

export interface Constraints {
  maxCost?: number;
  maxInterventions?: number;
  requiredVariables?: string[];
  forbiddenVariables?: string[];
}

/**
 * Validate intervention
 */
export function validateIntervention(intervention: Intervention): boolean {
  if (!intervention.variable || intervention.variable.trim() === '') {
    return false;
  }

  if (intervention.value === undefined || intervention.value === null) {
    return false;
  }

  if (intervention.cost !== undefined && intervention.cost < 0) {
    return false;
  }

  if (
    intervention.feasibility !== undefined &&
    (intervention.feasibility < 0 || intervention.feasibility > 1)
  ) {
    return false;
  }

  return true;
}

/**
 * Calculate total cost of intervention set
 */
export function calculateTotalCost(interventions: Intervention[]): number {
  return interventions.reduce((sum, intervention) => {
    return sum + (intervention.cost || 0);
  }, 0);
}

/**
 * Check if intervention set satisfies constraints
 */
export function satisfiesConstraints(
  interventions: Intervention[],
  constraints: Constraints
): boolean {
  // Check max cost
  if (constraints.maxCost !== undefined) {
    const totalCost = calculateTotalCost(interventions);
    if (totalCost > constraints.maxCost) {
      return false;
    }
  }

  // Check max interventions
  if (
    constraints.maxInterventions !== undefined &&
    interventions.length > constraints.maxInterventions
  ) {
    return false;
  }

  const variables = new Set(interventions.map((i) => i.variable));

  // Check required variables
  if (constraints.requiredVariables) {
    for (const required of constraints.requiredVariables) {
      if (!variables.has(required)) {
        return false;
      }
    }
  }

  // Check forbidden variables
  if (constraints.forbiddenVariables) {
    for (const forbidden of constraints.forbiddenVariables) {
      if (variables.has(forbidden)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Merge multiple interventions on the same variable (last one wins)
 */
export function mergeInterventions(
  interventions: Intervention[]
): Intervention[] {
  const merged = new Map<string, Intervention>();

  for (const intervention of interventions) {
    merged.set(intervention.variable, intervention);
  }

  return Array.from(merged.values());
}

/**
 * Compare intervention sets by expected effect (descending)
 */
export function compareInterventionSets(
  a: InterventionSet,
  b: InterventionSet
): number {
  // First, compare by expected effect (higher is better)
  if (a.expectedEffect !== b.expectedEffect) {
    return b.expectedEffect - a.expectedEffect;
  }

  // If effects are equal, prefer lower cost
  if (a.totalCost !== b.totalCost) {
    return a.totalCost - b.totalCost;
  }

  // If costs are equal, prefer fewer interventions
  return a.interventions.length - b.interventions.length;
}
