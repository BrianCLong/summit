/**
 * Deprecated Configuration Keys
 *
 * This file manages deprecated environment variable names and provides
 * automatic migration warnings and fallback logic.
 *
 * @module config/deprecated
 */

export interface DeprecatedKey {
  oldKey: string;
  newKey: string;
  deprecatedSince: string;
  removeIn: string;
  migration: string;
}

/**
 * Registry of deprecated configuration keys
 */
export const DEPRECATED_KEYS: DeprecatedKey[] = [
  {
    oldKey: 'NEO4J_USERNAME',
    newKey: 'NEO4J_USER',
    deprecatedSince: 'Q4 2024',
    removeIn: 'Q2 2025',
    migration: 'Rename NEO4J_USERNAME to NEO4J_USER in your .env file',
  },
  {
    oldKey: 'POSTGRES_URL',
    newKey: 'DATABASE_URL',
    deprecatedSince: 'Q4 2024',
    removeIn: 'Q2 2025',
    migration: 'Rename POSTGRES_URL to DATABASE_URL in your .env file',
  },
  // Add more deprecated keys here as needed
];

/**
 * Configuration loading state
 */
interface DeprecationWarning {
  oldKey: string;
  newKey: string;
  oldValue: string;
  newValue?: string;
  action: 'using_old' | 'conflict' | 'migrated';
}

const warnings: DeprecationWarning[] = [];
let warningsEmitted = false;

/**
 * Check for deprecated key usage and apply migration logic
 *
 * Priority:
 * 1. If both old and new keys exist with different values → ERROR
 * 2. If only new key exists → Use new key
 * 3. If only old key exists → Use old key with WARNING
 * 4. If neither exists → undefined
 *
 * @param oldKey - Deprecated key name
 * @param newKey - New key name
 * @returns The value to use (from new key if available, otherwise old key)
 */
export function migrateDeprecatedKey(
  oldKey: string,
  newKey: string
): string | undefined {
  const oldValue = process.env[oldKey];
  const newValue = process.env[newKey];

  // Case 1: Both set with different values - ERROR
  if (oldValue && newValue && oldValue !== newValue) {
    warnings.push({
      oldKey,
      newKey,
      oldValue,
      newValue,
      action: 'conflict',
    });

    console.error(
      `[CONFIG ERROR] Both ${oldKey} and ${newKey} are set with different values!`
    );
    console.error(`  ${oldKey}=${oldValue}`);
    console.error(`  ${newKey}=${newValue}`);
    console.error(`  Please remove ${oldKey} and use only ${newKey}`);

    // In production, fail fast on conflicts
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Configuration conflict: Both ${oldKey} and ${newKey} are set with different values`
      );
    }

    // In development, use new key but warn
    return newValue;
  }

  // Case 2: Only new key set - OK
  if (!oldValue && newValue) {
    return newValue;
  }

  // Case 3: Only old key set - WARN
  if (oldValue && !newValue) {
    warnings.push({
      oldKey,
      newKey,
      oldValue,
      action: 'using_old',
    });

    return oldValue;
  }

  // Case 4: Both set with same value or neither set
  return newValue || oldValue;
}

/**
 * Emit all accumulated deprecation warnings
 * Should be called once after config is loaded
 */
export function emitDeprecationWarnings(): void {
  if (warningsEmitted || warnings.length === 0) {
    return;
  }

  console.warn('\n' + '='.repeat(80));
  console.warn('⚠️  DEPRECATED CONFIGURATION DETECTED');
  console.warn('='.repeat(80));

  const deprecationMap = new Map(
    DEPRECATED_KEYS.map((d) => [d.oldKey, d])
  );

  for (const warning of warnings) {
    const deprecation = deprecationMap.get(warning.oldKey);

    if (warning.action === 'conflict') {
      console.warn(`\n❌ CONFLICT: ${warning.oldKey} vs ${warning.newKey}`);
      console.warn(`   Both keys are set with different values!`);
      console.warn(`   This will cause an error in production.`);
    } else if (warning.action === 'using_old') {
      console.warn(`\n⚠️  DEPRECATED: ${warning.oldKey}`);
      console.warn(`   Using deprecated key ${warning.oldKey}`);
      console.warn(`   Please migrate to: ${warning.newKey}`);

      if (deprecation) {
        console.warn(`   Deprecated since: ${deprecation.deprecatedSince}`);
        console.warn(`   Will be removed in: ${deprecation.removeIn}`);
        console.warn(`   Migration: ${deprecation.migration}`);
      }
    }
  }

  console.warn('\n' + '='.repeat(80));
  console.warn(
    `Total deprecated keys in use: ${warnings.filter((w) => w.action === 'using_old').length}`
  );
  console.warn(
    `Configuration conflicts: ${warnings.filter((w) => w.action === 'conflict').length}`
  );
  console.warn('='.repeat(80) + '\n');

  warningsEmitted = true;
}

/**
 * Get deprecation status for a specific key
 */
export function getDeprecationStatus(key: string): DeprecatedKey | undefined {
  return DEPRECATED_KEYS.find((d) => d.oldKey === key || d.newKey === key);
}

/**
 * Check if a key is deprecated
 */
export function isDeprecated(key: string): boolean {
  return DEPRECATED_KEYS.some((d) => d.oldKey === key);
}

/**
 * Get all deprecation warnings that have been collected
 */
export function getWarnings(): readonly DeprecationWarning[] {
  return warnings;
}

/**
 * Clear all warnings (useful for testing)
 */
export function clearWarnings(): void {
  warnings.length = 0;
  warningsEmitted = false;
}
