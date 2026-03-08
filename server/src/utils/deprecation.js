"use strict";
/**
 * Deprecation utility for Portfolio Pruning (Sprint N+55)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnDeprecation = warnDeprecation;
exports.Deprecated = Deprecated;
const DEPRECATION_LOGGED = new Set();
/**
 * Logs a standardized deprecation warning.
 * Uses a Set to ensure the warning is only logged once per runtime session per feature.
 *
 * @param options Deprecation details
 */
function warnDeprecation(options) {
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
    }
    else {
        console.warn(message);
        DEPRECATION_LOGGED.add(options.name);
    }
}
/**
 * Method decorator for deprecation
 */
function Deprecated(options) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const name = `${target.constructor.name}.${propertyKey}`;
        descriptor.value = function (...args) {
            warnDeprecation({ ...options, name });
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
