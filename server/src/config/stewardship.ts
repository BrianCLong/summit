/**
 * STEWARDSHIP & REFUSAL CONFIGURATION
 *
 * This file defines the codified "Refusal Matrix" and "Constraint Ladder"
 * that govern the Summit platform's ethical boundaries.
 *
 * Modifications to this file should be reviewed by the Council of Stewards.
 */

export enum RefusalCategory {
  COERCIVE_POPULATION_CONTROL = 'coercive_population_control',
  AUTONOMOUS_LETHAL_DECISION = 'autonomous_lethal_decision',
  COVERT_MASS_PERSUASION = 'covert_mass_persuasion',
  UNVERIFIABLE_INTEL_LAUNDERING = 'unverifiable_intel_laundering',
}

export enum ConstraintLevel {
  LEVEL_0_UNCONSTRAINED = 0,
  LEVEL_1_MONITORED = 1,
  LEVEL_2_THROTTLED = 2,
  LEVEL_3_MAINTENANCE_ONLY = 3,
  LEVEL_4_EMERGENCY_SHUTDOWN = 4,
}

export interface RefusalEntry {
  category: RefusalCategory;
  description: string;
  enforcementPolicy: string; // OPA policy name
  isHardRefusal: boolean; // If true, cannot be overridden without code change
}

export interface ConstraintDefinition {
  level: ConstraintLevel;
  description: string;
  restrictions: {
    maxComputeOps?: number;
    requireHumanReview?: boolean;
    dataRetentionDays?: number;
    allowedFeatures?: string[];
  };
}

export const REFUSAL_MATRIX: RefusalEntry[] = [
  {
    category: RefusalCategory.COERCIVE_POPULATION_CONTROL,
    description: 'Systems designed to suppress dissent or enforce arbitrary compliance.',
    enforcementPolicy: 'deny_population_control',
    isHardRefusal: true,
  },
  {
    category: RefusalCategory.AUTONOMOUS_LETHAL_DECISION,
    description: 'Systems that authorize lethal force without human intervention.',
    enforcementPolicy: 'deny_lethal_autonomy',
    isHardRefusal: true,
  },
  {
    category: RefusalCategory.COVERT_MASS_PERSUASION,
    description: 'Undeclared large-scale psychological operations.',
    enforcementPolicy: 'deny_covert_influence',
    isHardRefusal: true,
  },
  {
    category: RefusalCategory.UNVERIFIABLE_INTEL_LAUNDERING,
    description: 'Injecting false data into intelligence streams.',
    enforcementPolicy: 'deny_intel_laundering',
    isHardRefusal: true,
  },
];

export const CONSTRAINT_LADDER: Record<ConstraintLevel, ConstraintDefinition> = {
  [ConstraintLevel.LEVEL_0_UNCONSTRAINED]: {
    level: ConstraintLevel.LEVEL_0_UNCONSTRAINED,
    description: 'Normal operation.',
    restrictions: {},
  },
  [ConstraintLevel.LEVEL_1_MONITORED]: {
    level: ConstraintLevel.LEVEL_1_MONITORED,
    description: 'Enhanced audit logging and anomaly detection.',
    restrictions: {
      requireHumanReview: false, // But flagged for review
    },
  },
  [ConstraintLevel.LEVEL_2_THROTTLED]: {
    level: ConstraintLevel.LEVEL_2_THROTTLED,
    description: 'Reduced capacity and feature set.',
    restrictions: {
      maxComputeOps: 1000, // Example limit
      allowedFeatures: ['read_only', 'export'],
    },
  },
  [ConstraintLevel.LEVEL_3_MAINTENANCE_ONLY]: {
    level: ConstraintLevel.LEVEL_3_MAINTENANCE_ONLY,
    description: 'No new tasks, only data retrieval.',
    restrictions: {
      maxComputeOps: 0,
      allowedFeatures: ['export', 'audit'],
    },
  },
  [ConstraintLevel.LEVEL_4_EMERGENCY_SHUTDOWN]: {
    level: ConstraintLevel.LEVEL_4_EMERGENCY_SHUTDOWN,
    description: 'System halt.',
    restrictions: {
      maxComputeOps: 0,
      allowedFeatures: [],
    },
  },
};

export const STEWARDSHIP_CONFIG = {
  refusalMatrix: REFUSAL_MATRIX,
  constraintLadder: CONSTRAINT_LADDER,
  currentConstraintLevel: ConstraintLevel.LEVEL_0_UNCONSTRAINED, // Default
};
