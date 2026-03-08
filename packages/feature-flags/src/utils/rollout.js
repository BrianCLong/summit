"use strict";
/**
 * Rollout Utilities
 *
 * Utilities for percentage-based rollouts and A/B testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRollout = evaluateRollout;
exports.validateRollout = validateRollout;
exports.createGradualRollout = createGradualRollout;
exports.createABTest = createABTest;
exports.createMultivariateTest = createMultivariateTest;
const murmurhash_1 = __importDefault(require("murmurhash"));
/**
 * Evaluate percentage rollout to determine variation
 */
function evaluateRollout(rollout, context) {
    // Get the bucket key (attribute to use for bucketing)
    const bucketBy = rollout.bucketBy || 'userId';
    const bucketValue = getBucketValue(context, bucketBy);
    if (!bucketValue) {
        // If no bucket value, return null (use default)
        return null;
    }
    // Calculate bucket percentage (0-100)
    const percentage = calculateBucketPercentage(bucketValue, rollout.seed || 0);
    // Find matching variation based on percentage
    return findVariationByPercentage(rollout.variations, percentage);
}
/**
 * Get bucket value from context
 */
function getBucketValue(context, bucketBy) {
    switch (bucketBy) {
        case 'userId':
            return context.userId || null;
        case 'sessionId':
            return context.sessionId || null;
        case 'tenantId':
            return context.tenantId || null;
        case 'ipAddress':
            return context.ipAddress || null;
        default:
            // Check custom attributes
            return context.attributes?.[bucketBy] || null;
    }
}
/**
 * Calculate bucket percentage using consistent hashing
 */
function calculateBucketPercentage(value, seed) {
    // Use MurmurHash for consistent hashing
    const hash = murmurhash_1.default.v3(value, seed);
    // Convert hash to percentage (0-100)
    // Using modulo 10000 to get 0.01% precision, then divide by 100
    const percentage = (hash % 10000) / 100;
    return percentage;
}
/**
 * Find variation based on percentage
 */
function findVariationByPercentage(variations, percentage) {
    // Sort variations to ensure consistent ordering
    const sortedVariations = [...variations].sort((a, b) => {
        const aWeight = a.weight ?? a.percentage ?? 0;
        const bWeight = b.weight ?? b.percentage ?? 0;
        return bWeight - aWeight;
    });
    // Calculate cumulative percentages
    let cumulative = 0;
    for (const variation of sortedVariations) {
        const variationPercentage = variation.percentage ?? 0;
        cumulative += variationPercentage;
        if (percentage < cumulative) {
            return variation.variation;
        }
    }
    // If no match found, return null
    return null;
}
/**
 * Validate rollout configuration
 */
function validateRollout(rollout) {
    const errors = [];
    // Check if variations array exists and has items
    if (!rollout.variations || rollout.variations.length === 0) {
        errors.push('Rollout must have at least one variation');
        return { valid: false, errors };
    }
    // Calculate total percentage
    const totalPercentage = rollout.variations.reduce((sum, variation) => {
        return sum + (variation.percentage ?? 0);
    }, 0);
    // Check if total percentage is valid
    if (totalPercentage < 0 || totalPercentage > 100) {
        errors.push(`Total percentage must be between 0 and 100, got ${totalPercentage}`);
    }
    // Check each variation
    for (const variation of rollout.variations) {
        if (!variation.variation) {
            errors.push('Each variation must have a variation ID');
        }
        const percentage = variation.percentage ?? 0;
        if (percentage < 0 || percentage > 100) {
            errors.push(`Variation ${variation.variation} has invalid percentage: ${percentage}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Create a gradual rollout configuration
 */
function createGradualRollout(enabledVariation, disabledVariation, percentage, bucketBy = 'userId') {
    return {
        type: 'percentage',
        bucketBy,
        variations: [
            {
                variation: enabledVariation,
                percentage,
            },
            {
                variation: disabledVariation,
                percentage: 100 - percentage,
            },
        ],
    };
}
/**
 * Create an A/B test configuration
 */
function createABTest(variationA, variationB, percentageA = 50, bucketBy = 'userId') {
    return {
        type: 'ab_test',
        bucketBy,
        variations: [
            {
                variation: variationA,
                percentage: percentageA,
            },
            {
                variation: variationB,
                percentage: 100 - percentageA,
            },
        ],
    };
}
/**
 * Create a multivariate test configuration
 */
function createMultivariateTest(variations, bucketBy = 'userId') {
    return {
        type: 'ab_test',
        bucketBy,
        variations: variations.map((v) => ({
            variation: v.id,
            percentage: v.percentage,
        })),
    };
}
