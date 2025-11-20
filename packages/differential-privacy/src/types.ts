/**
 * Differential Privacy Types and Interfaces
 */

export interface PrivacyBudget {
  epsilon: number;
  delta: number;
  used: number;
  remaining: number;
  composition: 'basic' | 'advanced' | 'moments' | 'renyi';
}

export interface NoiseParameters {
  mechanism: 'gaussian' | 'laplacian' | 'exponential';
  sensitivity: number;
  epsilon?: number;
  delta?: number;
  scale?: number;
}

export interface PrivacyLoss {
  epsilon: number;
  delta: number;
  operation: string;
  timestamp: Date;
}

export interface MomentAccountantState {
  logMoments: number[];
  orders: number[];
  samplingProbability: number;
  noiseMultiplier: number;
  steps: number;
}

export interface RenyiDPParameters {
  alpha: number; // Renyi order
  epsilon: number;
}

export interface PrivacyAnalysis {
  totalEpsilon: number;
  totalDelta: number;
  composition: string;
  operations: PrivacyLoss[];
  recommendation: string;
}

export interface DPOptimizationConfig {
  learningRate: number;
  batchSize: number;
  numEpochs: number;
  clippingNorm: number;
  noiseMultiplier: number;
  targetEpsilon: number;
  targetDelta: number;
}

export interface PrivacyAudit {
  auditId: string;
  timestamp: Date;
  privacyBudget: PrivacyBudget;
  operations: PrivacyLoss[];
  violations: PrivacyViolation[];
  status: 'pass' | 'warning' | 'fail';
}

export interface PrivacyViolation {
  operation: string;
  expected: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface LocalDPConfig {
  mechanism: 'randomized_response' | 'unary_encoding' | 'local_hashing';
  epsilon: number;
  domain?: string[];
}

export interface GlobalDPConfig {
  mechanism: 'gaussian' | 'laplacian';
  epsilon: number;
  delta: number;
  sensitivity: number;
}
