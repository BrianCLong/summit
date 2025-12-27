/**
 * Deprecation utility for Portfolio Pruning (Sprint N+55)
 */

const DEPRECATION_LOGGED = new Set<string>();

/**
 * Options for deprecation warning
 */
interface DeprecationOptions {
  /** The name of the feature or function being deprecated */
  name: string;
  /** The replacement feature or migration path */
  replacement?: string;
  /** The target date or version for removal */
  removalTarget?: string;
  /** Whether to throw an error instead of logging a warning (default: false) */
  hardBlock?: boolean;
}

/**
 * Logs a standardized deprecation warning.
 * Uses a Set to ensure the warning is only logged once per runtime session per feature.
 *
 * @param options Deprecation details
 */
export function warnDeprecation(options: DeprecationOptions) {
  if (DEPRECATION_LOGGED.has(options.name)) {
    return;
  }

  const message = `
⚠️  DEPRECATION WARNING: "${options.name}" is deprecated.
    ${options.replacement ? `👉 Use "${options.replacement}" instead.` : ''}
    ${options.removalTarget ? `📅 Scheduled for removal in: ${options.removalTarget}` : ''}
    See PORTFOLIO_DECISIONS.md for details.
  `.trim();

  if (options.hardBlock) {
    throw new Error(`[BLOCKED] ${message}`);
  } else {
    console.warn(message);
    DEPRECATION_LOGGED.add(options.name);
  }
}

/**
 * Method decorator for deprecation
 */
export function Deprecated(options: Omit<DeprecationOptions, 'name'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      warnDeprecation({ ...options, name });
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
