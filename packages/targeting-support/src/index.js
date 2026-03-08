"use strict";
/**
 * Targeting Support
 *
 * Comprehensive targeting and execution support with target development,
 * nomination, validation, strike coordination, and battle damage assessment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetingSupport = exports.HighValueTargetSchema = exports.BattleDamageAssessmentSchema = exports.StrikeRequestSchema = exports.TargetPackageSchema = exports.TargetSchema = exports.TargetStatusSchema = exports.TargetTypeSchema = exports.TargetCategorySchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Target Types
// ============================================================================
exports.TargetCategorySchema = zod_1.z.enum([
    'STRATEGIC',
    'OPERATIONAL',
    'TACTICAL',
    'TIME_SENSITIVE',
    'HIGH_VALUE',
    'HIGH_PAYOFF'
]);
exports.TargetTypeSchema = zod_1.z.enum([
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
exports.TargetStatusSchema = zod_1.z.enum([
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
exports.TargetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    category: exports.TargetCategorySchema,
    type: exports.TargetTypeSchema,
    status: exports.TargetStatusSchema,
    // Location
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        altitude: zod_1.z.number().optional(),
        accuracy: zod_1.z.number(), // meters
        coordinateSystem: zod_1.z.string(),
        mgrs: zod_1.z.string().optional() // Military Grid Reference System
    }),
    // Target description
    description: zod_1.z.string(),
    function: zod_1.z.string(),
    significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    // Intelligence
    intelligence: zod_1.z.object({
        lastObserved: zod_1.z.string(),
        observationSource: zod_1.z.string(),
        confidence: zod_1.z.number(), // 0-100
        activityLevel: zod_1.z.enum(['HIGH', 'MODERATE', 'LOW', 'NONE']),
        occupancy: zod_1.z.object({
            estimated: zod_1.z.number(),
            minimum: zod_1.z.number(),
            maximum: zod_1.z.number()
        }).optional()
    }),
    // Physical characteristics
    characteristics: zod_1.z.object({
        dimensions: zod_1.z.object({
            length: zod_1.z.number(), // meters
            width: zod_1.z.number(),
            height: zod_1.z.number().optional()
        }).optional(),
        construction: zod_1.z.string().optional(),
        hardening: zod_1.z.enum(['NONE', 'LIGHT', 'MODERATE', 'HEAVY', 'UNDERGROUND']).optional(),
        vulnerabilities: zod_1.z.array(zod_1.z.string())
    }),
    // Collateral concerns
    collateral: zod_1.z.object({
        civilianProximity: zod_1.z.number(), // meters to nearest civilian structure
        civilianEstimate: zod_1.z.number(), // estimated civilians in vicinity
        culturalSites: zod_1.z.array(zod_1.z.string()),
        environmentalConcerns: zod_1.z.array(zod_1.z.string()),
        restrictionLevel: zod_1.z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH', 'PROHIBITED'])
    }),
    // Pattern of life
    patternOfLife: zod_1.z.object({
        observations: zod_1.z.array(zod_1.z.object({
            timestamp: zod_1.z.string(),
            activity: zod_1.z.string(),
            personnel: zod_1.z.number().optional(),
            vehicles: zod_1.z.number().optional()
        })),
        peakActivity: zod_1.z.string().optional(),
        minActivity: zod_1.z.string().optional(),
        patterns: zod_1.z.array(zod_1.z.string())
    }),
    // Weather effects
    weatherConstraints: zod_1.z.object({
        cloudCeiling: zod_1.z.number().optional(), // minimum in meters
        visibility: zod_1.z.number().optional(), // minimum in km
        windSpeed: zod_1.z.number().optional(), // maximum in km/h
        precipitation: zod_1.z.enum(['ANY', 'NONE', 'LIGHT_ONLY']).optional()
    }),
    priority: zod_1.z.number(), // 1-999
    validFrom: zod_1.z.string(),
    validUntil: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Target Package
// ============================================================================
exports.TargetPackageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    targetId: zod_1.z.string(),
    name: zod_1.z.string(),
    // Target information
    targetData: exports.TargetSchema,
    // Imagery
    imagery: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['VISIBLE', 'INFRARED', 'SAR', 'MULTISPECTRAL']),
        url: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        resolution: zod_1.z.number(), // meters
        cloudCover: zod_1.z.number().optional() // percentage
    })),
    // Supporting intelligence
    intelligence: zod_1.z.array(zod_1.z.object({
        reportId: zod_1.z.string(),
        discipline: zod_1.z.string(),
        summary: zod_1.z.string(),
        date: zod_1.z.string()
    })),
    // Weaponeering
    weaponeering: zod_1.z.object({
        recommendedWeapons: zod_1.z.array(zod_1.z.object({
            weapon: zod_1.z.string(),
            quantity: zod_1.z.number(),
            probability: zod_1.z.number(), // probability of damage 0-100
            collateralRadius: zod_1.z.number(), // meters
            notes: zod_1.z.string()
        })),
        alternateWeapons: zod_1.z.array(zod_1.z.string()),
        deliveryMethod: zod_1.z.enum(['AIR', 'GROUND', 'SEA', 'CYBER', 'MULTI_DOMAIN']),
        fuzeRecommendation: zod_1.z.string().optional()
    }),
    // Timing
    timing: zod_1.z.object({
        timeOnTarget: zod_1.z.string().optional(),
        notBefore: zod_1.z.string().optional(),
        notAfter: zod_1.z.string().optional(),
        preferredWindow: zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string()
        }).optional(),
        weatherWindow: zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string()
        }).optional()
    }),
    // Coordination
    coordination: zod_1.z.object({
        airspace: zod_1.z.object({
            controlAuthority: zod_1.z.string(),
            clearanceRequired: zod_1.z.boolean(),
            restrictions: zod_1.z.array(zod_1.z.string())
        }),
        deconfliction: zod_1.z.array(zod_1.z.object({
            asset: zod_1.z.string(),
            timeWindow: zod_1.z.string(),
            resolution: zod_1.z.string()
        })),
        supportRequirements: zod_1.z.array(zod_1.z.string())
    }),
    // Legal review
    legalReview: zod_1.z.object({
        required: zod_1.z.boolean(),
        completed: zod_1.z.boolean(),
        reviewer: zod_1.z.string().optional(),
        date: zod_1.z.string().optional(),
        determination: zod_1.z.enum(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'DENIED']).optional(),
        conditions: zod_1.z.array(zod_1.z.string())
    }),
    // Approval chain
    approvals: zod_1.z.array(zod_1.z.object({
        level: zod_1.z.string(),
        authority: zod_1.z.string(),
        approver: zod_1.z.string(),
        date: zod_1.z.string(),
        status: zod_1.z.enum(['PENDING', 'APPROVED', 'DENIED', 'CONDITIONAL']),
        conditions: zod_1.z.array(zod_1.z.string())
    })),
    classification: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Strike Coordination
// ============================================================================
exports.StrikeRequestSchema = zod_1.z.object({
    id: zod_1.z.string(),
    targetPackageId: zod_1.z.string(),
    requestType: zod_1.z.enum(['PREPLANNED', 'IMMEDIATE', 'TIME_SENSITIVE']),
    // Execution
    execution: zod_1.z.object({
        platform: zod_1.z.string(),
        callSign: zod_1.z.string(),
        weapon: zod_1.z.string(),
        quantity: zod_1.z.number(),
        deliveryMethod: zod_1.z.string(),
        attackHeading: zod_1.z.number().optional(), // degrees
        releaseAltitude: zod_1.z.number().optional() // meters
    }),
    // Timing
    timing: zod_1.z.object({
        requestTime: zod_1.z.string(),
        timeOnTarget: zod_1.z.string(),
        window: zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string()
        }).optional()
    }),
    // Status
    status: zod_1.z.enum([
        'REQUESTED',
        'APPROVED',
        'DENIED',
        'IN_EXECUTION',
        'COMPLETE',
        'ABORTED',
        'FAILED'
    ]),
    // Execution report
    executionReport: zod_1.z.object({
        actualTOT: zod_1.z.string().optional(),
        weaponsReleased: zod_1.z.number().optional(),
        impactObserved: zod_1.z.boolean().optional(),
        initialAssessment: zod_1.z.string().optional(),
        issues: zod_1.z.array(zod_1.z.string())
    }).optional(),
    requestedBy: zod_1.z.string(),
    approvedBy: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Battle Damage Assessment (BDA)
// ============================================================================
exports.BattleDamageAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    targetId: zod_1.z.string(),
    strikeRequestId: zod_1.z.string(),
    // Assessment
    assessment: zod_1.z.object({
        physicalDamage: zod_1.z.enum(['NONE', 'LIGHT', 'MODERATE', 'SEVERE', 'DESTROYED']),
        functionalDamage: zod_1.z.enum(['NONE', 'DEGRADED', 'SEVERELY_DEGRADED', 'DESTROYED']),
        percentageDestroyed: zod_1.z.number(), // 0-100
        confidence: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
        observations: zod_1.z.array(zod_1.z.object({
            source: zod_1.z.string(),
            timestamp: zod_1.z.string(),
            observation: zod_1.z.string(),
            imagery: zod_1.z.string().optional()
        })),
        indicators: zod_1.z.object({
            structuralDamage: zod_1.z.boolean(),
            fire: zod_1.z.boolean(),
            smoke: zod_1.z.boolean(),
            debris: zod_1.z.boolean(),
            craters: zod_1.z.number(),
            secondaryExplosions: zod_1.z.boolean()
        })
    }),
    // Re-attack recommendation
    reattack: zod_1.z.object({
        required: zod_1.z.boolean(),
        priority: zod_1.z.enum(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']).optional(),
        rationale: zod_1.z.string().optional(),
        recommendedWeapons: zod_1.z.array(zod_1.z.string())
    }),
    // Collateral damage
    collateralDamage: zod_1.z.object({
        occurred: zod_1.z.boolean(),
        civilian: zod_1.z.object({
            casualties: zod_1.z.number(),
            propertyDamage: zod_1.z.string()
        }).optional(),
        cultural: zod_1.z.boolean(),
        environmental: zod_1.z.boolean(),
        description: zod_1.z.string().optional()
    }),
    assessedBy: zod_1.z.string(),
    assessmentDate: zod_1.z.string(),
    validated: zod_1.z.boolean(),
    validatedBy: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// High Value Target (HVT) Tracking
// ============================================================================
exports.HighValueTargetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    codeName: zod_1.z.string(),
    // Target information
    type: zod_1.z.enum(['INDIVIDUAL', 'ORGANIZATION', 'CAPABILITY', 'FACILITY']),
    category: zod_1.z.enum(['LEADERSHIP', 'COMMAND', 'SPECIALIST', 'FACILITATOR', 'FINANCIER']),
    value: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
    priority: zod_1.z.number(), // 1-100
    // Identity
    identity: zod_1.z.object({
        realName: zod_1.z.string().optional(),
        aliases: zod_1.z.array(zod_1.z.string()),
        description: zod_1.z.string(),
        photo: zod_1.z.string().optional(),
        biometrics: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(['FINGERPRINT', 'IRIS', 'FACIAL', 'DNA']),
            data: zod_1.z.string()
        }))
    }),
    // Location tracking
    locations: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        confidence: zod_1.z.number(),
        source: zod_1.z.string(),
        activity: zod_1.z.string()
    })),
    // Pattern of life
    patternOfLife: zod_1.z.object({
        knownAssociates: zod_1.z.array(zod_1.z.string()),
        frequentLocations: zod_1.z.array(zod_1.z.string()),
        travelPatterns: zod_1.z.array(zod_1.z.string()),
        communicationPatterns: zod_1.z.array(zod_1.z.string()),
        schedule: zod_1.z.array(zod_1.z.object({
            day: zod_1.z.string(),
            time: zod_1.z.string(),
            activity: zod_1.z.string(),
            location: zod_1.z.string(),
            confidence: zod_1.z.number()
        }))
    }),
    // Status
    status: zod_1.z.enum([
        'ACTIVE',
        'LOCATED',
        'TARGETED',
        'NEUTRALIZED',
        'CAPTURED',
        'DECEASED',
        'UNKNOWN'
    ]),
    // Targeting
    targeting: zod_1.z.object({
        authorized: zod_1.z.boolean(),
        authority: zod_1.z.string().optional(),
        conditions: zod_1.z.array(zod_1.z.string()),
        collateralLimit: zod_1.z.number().optional() // max acceptable civilian casualties
    }),
    intelligence: zod_1.z.array(zod_1.z.object({
        reportId: zod_1.z.string(),
        date: zod_1.z.string(),
        summary: zod_1.z.string()
    })),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Targeting Support Service
// ============================================================================
class TargetingSupport {
    targets = new Map();
    packages = new Map();
    strikes = new Map();
    bdas = new Map();
    hvts = new Map();
    /**
     * Create target
     */
    createTarget(target) {
        const validated = exports.TargetSchema.parse(target);
        this.targets.set(validated.id, validated);
        return validated;
    }
    /**
     * Create target package
     */
    createTargetPackage(pkg) {
        const validated = exports.TargetPackageSchema.parse(pkg);
        this.packages.set(validated.id, validated);
        return validated;
    }
    /**
     * Submit strike request
     */
    submitStrikeRequest(request) {
        const validated = exports.StrikeRequestSchema.parse(request);
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
    recordBDA(bda) {
        const validated = exports.BattleDamageAssessmentSchema.parse(bda);
        this.bdas.set(validated.id, validated);
        // Update target status based on BDA
        const target = this.targets.get(validated.targetId);
        if (target) {
            if (validated.assessment.physicalDamage === 'DESTROYED') {
                target.status = 'DESTROYED';
            }
            else if (validated.reattack.required) {
                target.status = 'RE_ATTACK_REQUIRED';
            }
            else {
                target.status = 'ASSESSED';
            }
        }
        return validated;
    }
    /**
     * Track HVT
     */
    trackHVT(hvt) {
        const validated = exports.HighValueTargetSchema.parse(hvt);
        this.hvts.set(validated.id, validated);
        return validated;
    }
    /**
     * Get targets by priority
     */
    getTargetsByPriority(minPriority = 1) {
        return Array.from(this.targets.values())
            .filter(t => t.priority <= minPriority)
            .sort((a, b) => a.priority - b.priority);
    }
    /**
     * Get time-sensitive targets
     */
    getTimeSensitiveTargets() {
        return Array.from(this.targets.values())
            .filter(t => t.category === 'TIME_SENSITIVE' && t.status === 'VALIDATED')
            .sort((a, b) => a.priority - b.priority);
    }
    /**
     * Calculate collateral damage estimate
     */
    calculateCollateralEstimate(targetId, weapon) {
        const target = this.targets.get(targetId);
        if (!target) {
            throw new Error(`Target ${targetId} not found`);
        }
        // Simplified calculation
        const baseRadius = 50; // meters
        const civilianProximity = target.collateral.civilianProximity;
        let risk = 'LOW';
        let estimated = 0;
        if (civilianProximity < baseRadius) {
            risk = 'CRITICAL';
            estimated = target.collateral.civilianEstimate;
        }
        else if (civilianProximity < baseRadius * 2) {
            risk = 'HIGH';
            estimated = Math.floor(target.collateral.civilianEstimate * 0.5);
        }
        else if (civilianProximity < baseRadius * 5) {
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
exports.TargetingSupport = TargetingSupport;
