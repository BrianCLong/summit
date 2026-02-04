/**
 * Rollout Utilities
 *
 * Utilities for percentage-based rollouts and A/B testing
 */

import murmurhash from 'murmurhash';
import type {
  PercentageRollout,
  RolloutVariation,
  FlagContext,
} from '../types.js';

/**
 * Evaluate percentage rollout to determine variation
 */
export function evaluateRollout(
  rollout: PercentageRollout,
  context: FlagContext,
): string | null {
  // Get the bucket key (attribute to use for bucketing)
  const bucketBy = rollout.bucketBy || 'userId';
  const bucketValue = getBucketValue(context, bucketBy);

  if (!bucketValue) {
    // If no bucket value, return null (use default)
    return null;
  }

  // Calculate bucket percentage (0-100)
  const percentage = calculateBucketPercentage(
    bucketValue,
    rollout.seed || 0,
  );

  // Find matching variation based on percentage
  return findVariationByPercentage(rollout.variations, percentage);
}

/**
 * Get bucket value from context
 */
function getBucketValue(context: FlagContext, bucketBy: string): string | null {
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
function calculateBucketPercentage(value: string, seed: number): number {
  // Use MurmurHash for consistent hashing
  const hash = murmurhash.v3(value, seed);

  // Convert hash to percentage (0-100)
  // Using modulo 10000 to get 0.01% precision, then divide by 100
  const percentage = (hash % 10000) / 100;

  return percentage;
}

/**
 * Find variation based on percentage
 */
function findVariationByPercentage(
  variations: RolloutVariation[],
  percentage: number,
): string | null {
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
export function validateRollout(rollout: PercentageRollout): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

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
      errors.push(
        `Variation ${variation.variation} has invalid percentage: ${percentage}`,
      );
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
export function createGradualRollout(
  enabledVariation: string,
  disabledVariation: string,
  percentage: number,
  bucketBy: string = 'userId',
): PercentageRollout {
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
export function createABTest(
  variationA: string,
  variationB: string,
  percentageA: number = 50,
  bucketBy: string = 'userId',
): PercentageRollout {
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
export function createMultivariateTest(
  variations: Array<{ id: string; percentage: number }>,
  bucketBy: string = 'userId',
): PercentageRollout {
  return {
    type: 'ab_test',
    bucketBy,
    variations: variations.map((v) => ({
      variation: v.id,
      percentage: v.percentage,
    })),
  };
}
