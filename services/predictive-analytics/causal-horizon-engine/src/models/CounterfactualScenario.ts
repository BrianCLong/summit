import { v4 as uuidv4 } from 'uuid';
import { Intervention, Target } from './Intervention.js';

export interface CounterfactualScenario {
  id: string;
  name: string;
  description?: string;
  graphId: string;
  interventions: Intervention[];
  target: Target;
  evidence?: Record<string, any>; // Observed values to condition on
  createdAt: Date;
}

export interface Outcome {
  variable: string;
  value: any;
  probability: number;
  confidenceInterval: [number, number];
  distribution?: any;
}

export interface Comparison {
  factualValue: any;
  counterfactualValue: any;
  absoluteDifference: number;
  percentChange: number;
  causalEffect: number;
}

export interface SensitivityAnalysis {
  robustnessValue: number; // How robust is the result to unmeasured confounding
  confoundingStrengthRequired: number; // How strong would confounding need to be to reverse conclusion
  isRobust: boolean;
  explanation: string;
}

export interface CounterfactualResult {
  scenario: CounterfactualScenario;
  outcome: Outcome;
  causalPaths: any[]; // Will be CausalPath[]
  comparisonToFactual: Comparison;
  sensitivity?: SensitivityAnalysis;
}

/**
 * Create a new counterfactual scenario
 */
export function createScenario(
  graphId: string,
  name: string,
  interventions: Intervention[],
  target: Target,
  description?: string,
  evidence?: Record<string, any>
): CounterfactualScenario {
  return {
    id: uuidv4(),
    name,
    description,
    graphId,
    interventions,
    target,
    evidence,
    createdAt: new Date(),
  };
}

/**
 * Calculate comparison between factual and counterfactual outcomes
 */
export function calculateComparison(
  factualValue: number,
  counterfactualValue: number
): Comparison {
  const absoluteDifference = counterfactualValue - factualValue;
  const percentChange =
    factualValue !== 0 ? (absoluteDifference / Math.abs(factualValue)) * 100 : 0;
  const causalEffect = absoluteDifference;

  return {
    factualValue,
    counterfactualValue,
    absoluteDifference,
    percentChange,
    causalEffect,
  };
}

/**
 * Perform sensitivity analysis for unmeasured confounding
 * Based on E-value approach (VanderWeele & Ding, 2017)
 */
export function performSensitivityAnalysis(
  causalEffect: number,
  standardError: number
): SensitivityAnalysis {
  // E-value: minimum strength of association (on risk ratio scale) that
  // an unmeasured confounder would need to have with both treatment and
  // outcome to explain away the observed effect

  const riskRatio = Math.exp(causalEffect / standardError);
  const eValue =
    riskRatio + Math.sqrt(riskRatio * (riskRatio - 1));

  const robustnessValue = 1 / eValue; // Inverse for interpretability
  const isRobust = eValue > 2; // Convention: E-value > 2 indicates robustness

  let explanation = '';
  if (isRobust) {
    explanation = `The causal effect is robust to unmeasured confounding. An unmeasured confounder would need to have a risk ratio of ${eValue.toFixed(
      2
    )} with both the intervention and outcome to explain away the observed effect.`;
  } else {
    explanation = `The causal effect may be sensitive to unmeasured confounding. A relatively weak confounder (risk ratio ${eValue.toFixed(
      2
    )}) could potentially explain away the observed effect.`;
  }

  return {
    robustnessValue,
    confoundingStrengthRequired: eValue,
    isRobust,
    explanation,
  };
}

/**
 * Estimate confidence interval using bootstrap or analytical methods
 */
export function estimateConfidenceInterval(
  pointEstimate: number,
  standardError: number,
  confidenceLevel: number = 0.95
): [number, number] {
  // Using normal approximation
  const z = 1.96; // For 95% confidence
  const margin = z * standardError;

  return [pointEstimate - margin, pointEstimate + margin];
}
