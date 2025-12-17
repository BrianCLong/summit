/**
 * Technology Convergence Tracking Platform
 * Monitor and analyze technology convergence
 */

export type ConvergenceType =
  | 'ai-biotechnology'
  | 'quantum-cryptography'
  | 'nano-bio'
  | 'cyber-physical'
  | 'human-augmentation'
  | 'iot-ecosystem'
  | '5g-6g-network'
  | 'edge-computing'
  | 'blockchain-applications'
  | 'digital-twin';

export interface TechnologyConvergence {
  id: string;
  name: string;
  type: ConvergenceType;
  technologies: ConvergingTechnology[];
  maturityLevel: number; // 1-9 (TRL scale)
  convergenceStage: ConvergenceStage;
  synergies: Synergy[];
  applications: ConvergenceApplication[];
  barriers: ConvergenceBarrier[];
  keyPlayers: ConvergencePlayer[];
  timeline: ConvergenceTimeline;
  impact: ConvergenceImpact;
}

export type ConvergenceStage =
  | 'conceptual'
  | 'early-research'
  | 'proof-of-concept'
  | 'development'
  | 'mature'
  | 'widespread';

export interface ConvergingTechnology {
  id: string;
  name: string;
  domain: string;
  maturityLevel: number;
  contributionLevel: 'primary' | 'secondary' | 'enabling';
  readinessForConvergence: number; // 0-100
}

export interface Synergy {
  id: string;
  description: string;
  technologies: string[]; // technology IDs
  synergyType: 'multiplicative' | 'additive' | 'enabling' | 'transformative';
  magnitude: number; // 1-10
  evidence: string[];
}

export interface ConvergenceApplication {
  id: string;
  name: string;
  description: string;
  sector: string;
  useCase: string;
  readinessLevel: number; // 1-9
  marketPotential: 'low' | 'medium' | 'high' | 'very-high';
  timeToMarket: number; // years
  challenges: string[];
}

export interface ConvergenceBarrier {
  id: string;
  barrier: string;
  type: 'technical' | 'regulatory' | 'economic' | 'ethical' | 'social';
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategies: string[];
  resolutionTimeline?: number; // years
}

export interface ConvergencePlayer {
  id: string;
  name: string;
  type: 'academic' | 'industry' | 'government' | 'startup' | 'consortium';
  role: 'leader' | 'contributor' | 'adopter';
  capabilities: string[];
  investments: number;
  collaborations: string[];
}

export interface ConvergenceTimeline {
  firstIdentified: Date;
  proofOfConcept?: Date;
  commercialization?: Date;
  mainstreaming?: Date;
  estimatedMilestones: Milestone[];
}

export interface Milestone {
  name: string;
  description: string;
  estimatedDate: Date;
  dependencies: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConvergenceImpact {
  technologicalDisruption: number; // 1-10
  economicImpact: number;
  societalImpact: number;
  securityImplications: SecurityImplication[];
  opportunityAreas: string[];
  threatAreas: string[];
}

export interface SecurityImplication {
  domain: string;
  implication: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationRequired: boolean;
}

export interface ConvergencePattern {
  id: string;
  pattern: string;
  frequency: number;
  examples: string[];
  predictiveValue: number; // 0-100
}

export interface CrossDomainIntegration {
  id: string;
  domains: string[];
  integrationType: 'functional' | 'structural' | 'conceptual';
  integrationLevel: 'surface' | 'moderate' | 'deep' | 'complete';
  challenges: string[];
  enablers: string[];
}
