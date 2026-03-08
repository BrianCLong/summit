"use strict";
/**
 * STEWARDSHIP & REFUSAL CONFIGURATION
 *
 * This file defines the codified "Refusal Matrix" and "Constraint Ladder"
 * that govern the Summit platform's ethical boundaries.
 *
 * Modifications to this file should be reviewed by the Council of Stewards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEWARDSHIP_CONFIG = exports.CONSTRAINT_LADDER = exports.REFUSAL_MATRIX = exports.ConstraintLevel = exports.RefusalCategory = void 0;
var RefusalCategory;
(function (RefusalCategory) {
    RefusalCategory["COERCIVE_POPULATION_CONTROL"] = "coercive_population_control";
    RefusalCategory["AUTONOMOUS_LETHAL_DECISION"] = "autonomous_lethal_decision";
    RefusalCategory["COVERT_MASS_PERSUASION"] = "covert_mass_persuasion";
    RefusalCategory["UNVERIFIABLE_INTEL_LAUNDERING"] = "unverifiable_intel_laundering";
})(RefusalCategory || (exports.RefusalCategory = RefusalCategory = {}));
var ConstraintLevel;
(function (ConstraintLevel) {
    ConstraintLevel[ConstraintLevel["LEVEL_0_UNCONSTRAINED"] = 0] = "LEVEL_0_UNCONSTRAINED";
    ConstraintLevel[ConstraintLevel["LEVEL_1_MONITORED"] = 1] = "LEVEL_1_MONITORED";
    ConstraintLevel[ConstraintLevel["LEVEL_2_THROTTLED"] = 2] = "LEVEL_2_THROTTLED";
    ConstraintLevel[ConstraintLevel["LEVEL_3_MAINTENANCE_ONLY"] = 3] = "LEVEL_3_MAINTENANCE_ONLY";
    ConstraintLevel[ConstraintLevel["LEVEL_4_EMERGENCY_SHUTDOWN"] = 4] = "LEVEL_4_EMERGENCY_SHUTDOWN";
})(ConstraintLevel || (exports.ConstraintLevel = ConstraintLevel = {}));
exports.REFUSAL_MATRIX = [
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
exports.CONSTRAINT_LADDER = {
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
exports.STEWARDSHIP_CONFIG = {
    refusalMatrix: exports.REFUSAL_MATRIX,
    constraintLadder: exports.CONSTRAINT_LADDER,
    currentConstraintLevel: ConstraintLevel.LEVEL_0_UNCONSTRAINED, // Default
};
