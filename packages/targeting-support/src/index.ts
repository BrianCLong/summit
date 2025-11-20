/**
 * Targeting Support
 *
 * Comprehensive targeting and execution support with target development,
 * nomination, validation, strike coordination, and battle damage assessment.
 */

import { z } from 'zod';

// ============================================================================
// Target Types
// ============================================================================

export const TargetCategorySchema = z.enum([
  'STRATEGIC',
  'OPERATIONAL',
  'TACTICAL',
  'TIME_SENSITIVE',
  'HIGH_VALUE',
  'HIGH_PAYOFF'
]);

export const TargetTypeSchema = z.enum([
  'FACILITY',
  'INFRASTRUCTURE',
  'COMMAND_CONTROL',
  'COMMUNICATIONS',
  'RADAR_SAM',
  'ARTILLERY',
  'ARMOR',
  'SUPPLY_DEPOT',
  'PERSONNEL',
  'LEADERSHIP',
  'CYBER_NODE',
  'NETWORK_NODE'
]);

export const TargetStatusSchema = z.enum([
  'NOMINATED',
  'VALIDATED',
  'APPROVED',
  'DENIED',
  'IN_PROSECUTION',
  'STRUCK',
  'ASSESSED',
  'RE_ATTACK_REQUIRED',
  'DESTROYED',
  'INACTIVE'
]);

// ============================================================================
// Target Development
// ============================================================================

export const TargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: TargetCategorySchema,
  type: TargetTypeSchema,
  status: TargetStatusSchema,

  // Location
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    altitude: z.number().optional(),
    accuracy: z.number(), // meters
    coordinateSystem: z.string(),
    mgrs: z.string().optional() // Military Grid Reference System
  }),

  // Target description
  description: z.string(),
  function: z.string(),
  significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),

  // Intelligence
  intelligence: z.object({
    lastObserved: z.string(),
    observationSource: z.string(),
    confidence: z.number(), // 0-100
    activityLevel: z.enum(['HIGH', 'MODERATE', 'LOW', 'NONE']),
    occupancy: z.object({
      estimated: z.number(),
      minimum: z.number(),
      maximum: z.number()
    }).optional()
  }),

  // Physical characteristics
  characteristics: z.object({
    dimensions: z.object({
      length: z.number(), // meters
      width: z.number(),
      height: z.number().optional()
    }).optional(),
    construction: z.string().optional(),
    hardening: z.enum(['NONE', 'LIGHT', 'MODERATE', 'HEAVY', 'UNDERGROUND']).optional(),
    vulnerabilities: z.array(z.string())
  }),

  // Collateral concerns
  collateral: z.object({
    civilianProximity: z.number(), // meters to nearest civilian structure
    civilianEstimate: z.number(), // estimated civilians in vicinity
    culturalSites: z.array(z.string()),
    environmentalConcerns: z.array(z.string()),
    restrictionLevel: z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH', 'PROHIBITED'])
  }),

  // Pattern of life
  patternOfLife: z.object({
    observations: z.array(z.object({
      timestamp: z.string(),
      activity: z.string(),
      personnel: z.number().optional(),
      vehicles: z.number().optional()
    })),
    peakActivity: z.string().optional(),
    minActivity: z.string().optional(),
    patterns: z.array(z.string())
  }),

  // Weather effects
  weatherConstraints: z.object({
    cloudCeiling: z.number().optional(), // minimum in meters
    visibility: z.number().optional(), // minimum in km
    windSpeed: z.number().optional(), // maximum in km/h
    precipitation: z.enum(['ANY', 'NONE', 'LIGHT_ONLY']).optional()
  }),

  priority: z.number(), // 1-999
  validFrom: z.string(),
  validUntil: z.string().optional(),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Target Package
// ============================================================================

export const TargetPackageSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  name: z.string(),

  // Target information
  targetData: TargetSchema,

  // Imagery
  imagery: z.array(z.object({
    id: z.string(),
    type: z.enum(['VISIBLE', 'INFRARED', 'SAR', 'MULTISPECTRAL']),
    url: z.string(),
    timestamp: z.string(),
    resolution: z.number(), // meters
    cloudCover: z.number().optional() // percentage
  })),

  // Supporting intelligence
  intelligence: z.array(z.object({
    reportId: z.string(),
    discipline: z.string(),
    summary: z.string(),
    date: z.string()
  })),

  // Weaponeering
  weaponeering: z.object({
    recommendedWeapons: z.array(z.object({
      weapon: z.string(),
      quantity: z.number(),
      probability: z.number(), // probability of damage 0-100
      collateralRadius: z.number(), // meters
      notes: z.string()
    })),
    alternateWeapons: z.array(z.string()),
    deliveryMethod: z.enum(['AIR', 'GROUND', 'SEA', 'CYBER', 'MULTI_DOMAIN']),
    fuzeRecommendation: z.string().optional()
  }),

  // Timing
  timing: z.object({
    timeOnTarget: z.string().optional(),
    notBefore: z.string().optional(),
    notAfter: z.string().optional(),
    preferredWindow: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    weatherWindow: z.object({
      start: z.string(),
      end: z.string()
    }).optional()
  }),

  // Coordination
  coordination: z.object({
    airspace: z.object({
      controlAuthority: z.string(),
      clearanceRequired: z.boolean(),
      restrictions: z.array(z.string())
    }),
    deconfliction: z.array(z.object({
      asset: z.string(),
      timeWindow: z.string(),
      resolution: z.string()
    })),
    supportRequirements: z.array(z.string())
  }),

  // Legal review
  legalReview: z.object({
    required: z.boolean(),
    completed: z.boolean(),
    reviewer: z.string().optional(),
    date: z.string().optional(),
    determination: z.enum(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'DENIED']).optional(),
    conditions: z.array(z.string())
  }),

  // Approval chain
  approvals: z.array(z.object({
    level: z.string(),
    authority: z.string(),
    approver: z.string(),
    date: z.string(),
    status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CONDITIONAL']),
    conditions: z.array(z.string())
  })),

  classification: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Strike Coordination
// ============================================================================

export const StrikeRequestSchema = z.object({
  id: z.string(),
  targetPackageId: z.string(),
  requestType: z.enum(['PREPLANNED', 'IMMEDIATE', 'TIME_SENSITIVE']),

  // Execution
  execution: z.object({
    platform: z.string(),
    callSign: z.string(),
    weapon: z.string(),
    quantity: z.number(),
    deliveryMethod: z.string(),
    attackHeading: z.number().optional(), // degrees
    releaseAltitude: z.number().optional() // meters
  }),

  // Timing
  timing: z.object({
    requestTime: z.string(),
    timeOnTarget: z.string(),
    window: z.object({
      start: z.string(),
      end: z.string()
    }).optional()
  }),

  // Status
  status: z.enum([
    'REQUESTED',
    'APPROVED',
    'DENIED',
    'IN_EXECUTION',
    'COMPLETE',
    'ABORTED',
    'FAILED'
  ]),

  // Execution report
  executionReport: z.object({
    actualTOT: z.string().optional(),
    weaponsReleased: z.number().optional(),
    impactObserved: z.boolean().optional(),
    initialAssessment: z.string().optional(),
    issues: z.array(z.string())
  }).optional(),

  requestedBy: z.string(),
  approvedBy: z.string().optional(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Battle Damage Assessment (BDA)
// ============================================================================

export const BattleDamageAssessmentSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  strikeRequestId: z.string(),

  // Assessment
  assessment: z.object({
    physicalDamage: z.enum(['NONE', 'LIGHT', 'MODERATE', 'SEVERE', 'DESTROYED']),
    functionalDamage: z.enum(['NONE', 'DEGRADED', 'SEVERELY_DEGRADED', 'DESTROYED']),
    percentageDestroyed: z.number(), // 0-100
    confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),

    observations: z.array(z.object({
      source: z.string(),
      timestamp: z.string(),
      observation: z.string(),
      imagery: z.string().optional()
    })),

    indicators: z.object({
      structuralDamage: z.boolean(),
      fire: z.boolean(),
      smoke: z.boolean(),
      debris: z.boolean(),
      craters: z.number(),
      secondaryExplosions: z.boolean()
    })
  }),

  // Re-attack recommendation
  reattack: z.object({
    required: z.boolean(),
    priority: z.enum(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    rationale: z.string().optional(),
    recommendedWeapons: z.array(z.string())
  }),

  // Collateral damage
  collateralDamage: z.object({
    occurred: z.boolean(),
    civilian: z.object({
      casualties: z.number(),
      propertyDamage: z.string()
    }).optional(),
    cultural: z.boolean(),
    environmental: z.boolean(),
    description: z.string().optional()
  }),

  assessedBy: z.string(),
  assessmentDate: z.string(),
  validated: z.boolean(),
  validatedBy: z.string().optional(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// High Value Target (HVT) Tracking
// ============================================================================

export const HighValueTargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  codeName: z.string(),

  // Target information
  type: z.enum(['INDIVIDUAL', 'ORGANIZATION', 'CAPABILITY', 'FACILITY']),
  category: z.enum(['LEADERSHIP', 'COMMAND', 'SPECIALIST', 'FACILITATOR', 'FINANCIER']),

  value: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
  priority: z.number(), // 1-100

  // Identity
  identity: z.object({
    realName: z.string().optional(),
    aliases: z.array(z.string()),
    description: z.string(),
    photo: z.string().optional(),
    biometrics: z.array(z.object({
      type: z.enum(['FINGERPRINT', 'IRIS', 'FACIAL', 'DNA']),
      data: z.string()
    }))
  }),

  // Location tracking
  locations: z.array(z.object({
    timestamp: z.string(),
    lat: z.number(),
    lon: z.number(),
    confidence: z.number(),
    source: z.string(),
    activity: z.string()
  })),

  // Pattern of life
  patternOfLife: z.object({
    knownAssociates: z.array(z.string()),
    frequentLocations: z.array(z.string()),
    travelPatterns: z.array(z.string()),
    communicationPatterns: z.array(z.string()),
    schedule: z.array(z.object({
      day: z.string(),
      time: z.string(),
      activity: z.string(),
      location: z.string(),
      confidence: z.number()
    }))
  }),

  // Status
  status: z.enum([
    'ACTIVE',
    'LOCATED',
    'TARGETED',
    'NEUTRALIZED',
    'CAPTURED',
    'DECEASED',
    'UNKNOWN'
  ]),

  // Targeting
  targeting: z.object({
    authorized: z.boolean(),
    authority: z.string().optional(),
    conditions: z.array(z.string()),
    collateralLimit: z.number().optional() // max acceptable civilian casualties
  }),

  intelligence: z.array(z.object({
    reportId: z.string(),
    date: z.string(),
    summary: z.string()
  })),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type TargetCategory = z.infer<typeof TargetCategorySchema>;
export type TargetType = z.infer<typeof TargetTypeSchema>;
export type TargetStatus = z.infer<typeof TargetStatusSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type TargetPackage = z.infer<typeof TargetPackageSchema>;
export type StrikeRequest = z.infer<typeof StrikeRequestSchema>;
export type BattleDamageAssessment = z.infer<typeof BattleDamageAssessmentSchema>;
export type HighValueTarget = z.infer<typeof HighValueTargetSchema>;

// ============================================================================
// Targeting Support Service
// ============================================================================

export class TargetingSupport {
  private targets: Map<string, Target> = new Map();
  private packages: Map<string, TargetPackage> = new Map();
  private strikes: Map<string, StrikeRequest> = new Map();
  private bdas: Map<string, BattleDamageAssessment> = new Map();
  private hvts: Map<string, HighValueTarget> = new Map();

  /**
   * Create target
   */
  createTarget(target: Target): Target {
    const validated = TargetSchema.parse(target);
    this.targets.set(validated.id, validated);
    return validated;
  }

  /**
   * Create target package
   */
  createTargetPackage(pkg: TargetPackage): TargetPackage {
    const validated = TargetPackageSchema.parse(pkg);
    this.packages.set(validated.id, validated);
    return validated;
  }

  /**
   * Submit strike request
   */
  submitStrikeRequest(request: StrikeRequest): StrikeRequest {
    const validated = StrikeRequestSchema.parse(request);
    this.strikes.set(validated.id, validated);

    // Update target status
    const pkg = this.packages.get(validated.targetPackageId);
    if (pkg) {
      const target = this.targets.get(pkg.targetId);
      if (target) {
        target.status = 'IN_PROSECUTION';
      }
    }

    return validated;
  }

  /**
   * Record BDA
   */
  recordBDA(bda: BattleDamageAssessment): BattleDamageAssessment {
    const validated = BattleDamageAssessmentSchema.parse(bda);
    this.bdas.set(validated.id, validated);

    // Update target status based on BDA
    const target = this.targets.get(validated.targetId);
    if (target) {
      if (validated.assessment.physicalDamage === 'DESTROYED') {
        target.status = 'DESTROYED';
      } else if (validated.reattack.required) {
        target.status = 'RE_ATTACK_REQUIRED';
      } else {
        target.status = 'ASSESSED';
      }
    }

    return validated;
  }

  /**
   * Track HVT
   */
  trackHVT(hvt: HighValueTarget): HighValueTarget {
    const validated = HighValueTargetSchema.parse(hvt);
    this.hvts.set(validated.id, validated);
    return validated;
  }

  /**
   * Get targets by priority
   */
  getTargetsByPriority(minPriority: number = 1): Target[] {
    return Array.from(this.targets.values())
      .filter(t => t.priority <= minPriority)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get time-sensitive targets
   */
  getTimeSensitiveTargets(): Target[] {
    return Array.from(this.targets.values())
      .filter(t => t.category === 'TIME_SENSITIVE' && t.status === 'VALIDATED')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Calculate collateral damage estimate
   */
  calculateCollateralEstimate(targetId: string, weapon: string): {
    radius: number;
    civilianRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimated: number;
  } {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    // Simplified calculation
    const baseRadius = 50; // meters
    const civilianProximity = target.collateral.civilianProximity;

    let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let estimated = 0;

    if (civilianProximity < baseRadius) {
      risk = 'CRITICAL';
      estimated = target.collateral.civilianEstimate;
    } else if (civilianProximity < baseRadius * 2) {
      risk = 'HIGH';
      estimated = Math.floor(target.collateral.civilianEstimate * 0.5);
    } else if (civilianProximity < baseRadius * 5) {
      risk = 'MEDIUM';
      estimated = Math.floor(target.collateral.civilianEstimate * 0.1);
    }

    return {
      radius: baseRadius,
      civilianRisk: risk,
      estimated
    };
  }
}
