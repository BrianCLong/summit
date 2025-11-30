import { CausalGraph } from '../models/CausalGraph.js';
import { Intervention, Target } from '../models/Intervention.js';
import {
  CounterfactualResult,
  Outcome,
  Comparison,
  calculateComparison,
  performSensitivityAnalysis,
  estimateConfidenceInterval,
  CounterfactualScenario,
} from '../models/CounterfactualScenario.js';
import { analyzeCausalPaths, CausalPath } from './PathAnalysis.js';

/**
 * Simulate counterfactual outcome under interventions
 * Implements Pearl's three-step process:
 * 1. Abduction: Update beliefs given evidence
 * 2. Action: Perform graph surgery (do-operator)
 * 3. Prediction: Compute outcome in mutilated graph
 */
export function simulateCounterfactual(
  graph: CausalGraph,
  interventions: Intervention[],
  target: Target,
  evidence?: Record<string, any>
): CounterfactualResult {
  // Extract intervention variables
  const interventionVars = interventions.map((i) => i.variable);

  // Step 1: Abduction (simplified - in real implementation would use observed data)
  const prior = initializePrior(graph, evidence);

  // Step 2: Action - perform graph surgery
  const mutilatedGraph = graph.doIntervention(interventionVars);

  // Step 3: Prediction - simulate outcome
  const outcome = predictOutcome(mutilatedGraph, interventions, target, prior);

  // Analyze causal paths in mutilated graph
  const causalPaths = getActiveCausalPaths(
    mutilatedGraph,
    interventionVars,
    target.variable
  );

  // Compute factual outcome (without intervention)
  const factualOutcome = predictOutcome(graph, [], target, prior);

  // Compare factual vs counterfactual
  const comparison = calculateComparison(
    factualOutcome.probability,
    outcome.probability
  );

  // Sensitivity analysis
  const sensitivity = performSensitivityAnalysis(
    comparison.causalEffect,
    0.1 // Standard error placeholder
  );

  // Create scenario object
  const scenario: CounterfactualScenario = {
    id: 'simulation',
    name: 'Simulation',
    graphId: graph.id,
    interventions,
    target,
    evidence,
    createdAt: new Date(),
  };

  return {
    scenario,
    outcome,
    causalPaths,
    comparisonToFactual: comparison,
    sensitivity,
  };
}

/**
 * Initialize prior beliefs (simplified)
 */
function initializePrior(
  graph: CausalGraph,
  evidence?: Record<string, any>
): Map<string, any> {
  const prior = new Map<string, any>();

  // Set evidence values
  if (evidence) {
    for (const [variable, value] of Object.entries(evidence)) {
      prior.set(variable, value);
    }
  }

  // Initialize other variables with defaults
  for (const node of graph.nodes.values()) {
    if (!prior.has(node.id)) {
      prior.set(node.id, getDefaultValue(node.domain));
    }
  }

  return prior;
}

/**
 * Get default value for a domain type
 */
function getDefaultValue(domain: string): any {
  switch (domain) {
    case 'BINARY':
      return false;
    case 'DISCRETE':
      return 0;
    case 'CONTINUOUS':
      return 0.0;
    case 'CATEGORICAL':
      return 'unknown';
    default:
      return null;
  }
}

/**
 * Predict outcome using forward simulation through the graph
 */
function predictOutcome(
  graph: CausalGraph,
  interventions: Intervention[],
  target: Target,
  prior: Map<string, any>
): Outcome {
  const values = new Map(prior);

  // Set intervention values
  for (const intervention of interventions) {
    values.set(intervention.variable, intervention.value);
  }

  // Topological sort to process nodes in causal order
  let sortedNodes: string[];
  try {
    sortedNodes = graph.topologicalSort();
  } catch (error) {
    // If graph has cycles, use nodes in arbitrary order
    sortedNodes = Array.from(graph.nodes.keys());
  }

  // Forward simulation
  for (const nodeId of sortedNodes) {
    // Skip if intervention (already set)
    if (interventions.some((i) => i.variable === nodeId)) {
      continue;
    }

    // Compute value based on parents
    const parents = graph.getParents(nodeId);
    let nodeValue = computeNodeValue(graph, nodeId, parents, values);

    values.set(nodeId, nodeValue);
  }

  // Get target value
  const targetValue = values.get(target.variable);

  // Compute probability
  const probability = computeProbability(
    targetValue,
    target.desiredValue,
    graph.getNode(target.variable)?.domain || 'BINARY'
  );

  // Estimate confidence interval
  const standardError = 0.1; // Placeholder
  const confidenceInterval = estimateConfidenceInterval(
    probability,
    standardError
  );

  return {
    variable: target.variable,
    value: targetValue,
    probability,
    confidenceInterval,
    distribution: null, // Could include full distribution
  };
}

/**
 * Compute node value based on parent values
 * This implements the structural equation for each node
 */
function computeNodeValue(
  graph: CausalGraph,
  nodeId: string,
  parents: string[],
  values: Map<string, any>
): any {
  if (parents.length === 0) {
    // Root node - use prior
    return values.get(nodeId);
  }

  // Compute as weighted sum of parent values (simplified)
  let sum = 0;
  let totalWeight = 0;

  for (const parent of parents) {
    const edgeId = `${parent}->${nodeId}`;
    const edge = graph.getEdge(edgeId);
    const parentValue = values.get(parent);

    if (edge && parentValue !== undefined) {
      const numericValue = toNumeric(parentValue);
      sum += edge.strength * numericValue;
      totalWeight += Math.abs(edge.strength);
    }
  }

  const node = graph.getNode(nodeId);
  if (!node) return 0;

  // Convert back to appropriate domain
  switch (node.domain) {
    case 'BINARY':
      return sum > 0.5;
    case 'DISCRETE':
      return Math.round(sum);
    case 'CONTINUOUS':
      return sum;
    case 'CATEGORICAL':
      return sum > 0.5 ? 'positive' : 'negative';
    default:
      return sum;
  }
}

/**
 * Convert value to numeric for computation
 */
function toNumeric(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    // Simple heuristics
    if (value === 'true' || value === 'positive' || value === 'high')
      return 1;
    if (value === 'false' || value === 'negative' || value === 'low')
      return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Compute probability that target matches desired value
 */
function computeProbability(
  actualValue: any,
  desiredValue: any,
  domain: string
): number {
  if (desiredValue === undefined) {
    // No specific desired value, return confidence in actual value
    return 0.8;
  }

  switch (domain) {
    case 'BINARY':
      return actualValue === desiredValue ? 0.9 : 0.1;
    case 'DISCRETE':
      return actualValue === desiredValue ? 0.9 : 0.1;
    case 'CONTINUOUS': {
      const diff = Math.abs(toNumeric(actualValue) - toNumeric(desiredValue));
      return Math.exp(-diff); // Exponential decay
    }
    case 'CATEGORICAL':
      return actualValue === desiredValue ? 0.9 : 0.1;
    default:
      return actualValue === desiredValue ? 0.9 : 0.1;
  }
}

/**
 * Get active causal paths from intervention variables to target
 */
function getActiveCausalPaths(
  mutilatedGraph: CausalGraph,
  interventionVars: string[],
  targetVar: string
): CausalPath[] {
  const allPaths: CausalPath[] = [];

  for (const interventionVar of interventionVars) {
    const analysis = analyzeCausalPaths(
      mutilatedGraph,
      interventionVar,
      targetVar
    );

    allPaths.push(...analysis.directPaths, ...analysis.indirectPaths);
  }

  // Filter to active paths only
  return allPaths.filter((path) => path.isActive);
}

/**
 * Monte Carlo simulation for uncertainty quantification
 */
export function monteCarloSimulation(
  graph: CausalGraph,
  interventions: Intervention[],
  target: Target,
  numSimulations: number = 1000,
  evidence?: Record<string, any>
): {
  mean: number;
  variance: number;
  confidenceInterval: [number, number];
  distribution: number[];
} {
  const results: number[] = [];

  for (let i = 0; i < numSimulations; i++) {
    // Add noise to simulate uncertainty
    const noisyGraph = addNoise(graph);
    const result = simulateCounterfactual(
      noisyGraph,
      interventions,
      target,
      evidence
    );
    results.push(result.outcome.probability);
  }

  // Calculate statistics
  const mean = results.reduce((sum, v) => sum + v, 0) / results.length;
  const variance =
    results.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / results.length;

  // Confidence interval (95%)
  results.sort((a, b) => a - b);
  const lowerIdx = Math.floor(0.025 * results.length);
  const upperIdx = Math.floor(0.975 * results.length);

  return {
    mean,
    variance,
    confidenceInterval: [results[lowerIdx], results[upperIdx]],
    distribution: results,
  };
}

/**
 * Add noise to graph edge strengths for uncertainty simulation
 */
function addNoise(graph: CausalGraph, noiseLevel: number = 0.1): CausalGraph {
  const noisyGraph = graph.clone();

  for (const edge of noisyGraph.edges.values()) {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel;
    edge.strength = Math.max(-1, Math.min(1, edge.strength + noise));
  }

  return noisyGraph;
}
