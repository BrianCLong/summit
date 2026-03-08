"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSandboxMode = isSandboxMode;
exports.requiresConfirmation = requiresConfirmation;
exports.preventMassMutation = preventMassMutation;
function isSandboxMode(env = process.env) {
    return (env.SANDBOX_MODE ?? '').toLowerCase() === 'true';
}
function requiresConfirmation(operation, options = {}) {
    const env = options.env ?? process.env;
    const normalizedKey = operation
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    const confirmed = options.confirmed ||
        env?.CONFIRM_ALL_WRITES === 'true' ||
        env?.[`CONFIRM_${normalizedKey}`] === 'true';
    if (confirmed) {
        return;
    }
    const hint = options.hint ? ` ${options.hint}` : '';
    const message = `Operation "${operation}" blocked: confirmation required.${hint}`;
    options.logger?.warn?.(message);
    throw new Error(message);
}
function preventMassMutation(affected, threshold = 500, options = {}) {
    const env = options.env ?? process.env;
    const overrideKey = options.overrideEnvVar ?? 'ALLOW_MASS_MUTATION';
    if (affected <= threshold) {
        return;
    }
    if (env?.[overrideKey] === 'true') {
        options.logger?.warn?.(`Mass mutation override enabled via ${overrideKey}; proceeding with ${affected} records (threshold ${threshold}).`);
        return;
    }
    const reason = options.reason ? ` Reason: ${options.reason}` : '';
    const message = `Refusing to mutate ${affected} records (threshold ${threshold}). Set ${overrideKey}=true to override.${reason}`;
    options.logger?.warn?.(message);
    throw new Error(message);
}
