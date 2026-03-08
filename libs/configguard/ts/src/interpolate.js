"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolateConfig = interpolateConfig;
exports.escapeJsonPointerSegment = escapeJsonPointerSegment;
const VAR_PATTERN = /\$\{([A-Z0-9_]+)(?::-(.*?))?\}/g;
function interpolateConfig(value, pointer, ctx, diags) {
    if (value === null || typeof value !== 'object') {
        return interpolateScalar(value, pointer, ctx, diags);
    }
    if (Array.isArray(value)) {
        return value.map((item, index) => interpolateConfig(item, `${pointer}/${index}`, ctx, diags));
    }
    const result = {};
    for (const [key, child] of Object.entries(value)) {
        const escapedKey = escapeJsonPointerSegment(key);
        result[key] = interpolateConfig(child, pointer ? `${pointer}/${escapedKey}` : `/${escapedKey}`, ctx, diags);
    }
    return result;
}
function interpolateScalar(value, pointer, ctx, diags) {
    if (typeof value !== 'string') {
        return value;
    }
    let updated = value;
    let match;
    const seen = new Set();
    VAR_PATTERN.lastIndex = 0;
    while ((match = VAR_PATTERN.exec(value))) {
        const [, name, fallback] = match;
        seen.add(name);
        if (ctx.policy.denyList?.includes(name)) {
            diags.push(createDiagnostic('error', pointer, ctx.pointerMap, `Environment variable "${name}" is blocked by policy.`));
            continue;
        }
        if (ctx.policy.requireAllowList && !ctx.policy.allowList?.includes(name)) {
            diags.push(createDiagnostic('error', pointer, ctx.pointerMap, `Environment variable "${name}" is not allowed. Add it to the allow list.`));
            continue;
        }
        const provided = process.env[name];
        let replacement = provided;
        if (replacement === undefined) {
            if (ctx.policy.defaults && name in ctx.policy.defaults) {
                replacement = ctx.policy.defaults[name];
            }
            else if (fallback !== undefined) {
                replacement = fallback;
            }
        }
        if (replacement === undefined) {
            const severity = ctx.policy.onMissing ?? 'warn';
            diags.push(createDiagnostic(severity, pointer, ctx.pointerMap, `Missing environment variable "${name}" for interpolation.`, severity === 'warn'
                ? 'define the variable or supply a default'
                : undefined));
            continue;
        }
        updated = updated.replace(match[0], replacement);
    }
    if (ctx.policy.allowList && ctx.policy.allowList.length) {
        for (const allowed of ctx.policy.allowList) {
            if (seen.has(allowed)) {
                continue;
            }
        }
    }
    return updated;
}
function createDiagnostic(severity, pointer, pointerMap, message, hint) {
    const pos = pointerMap[pointer] ?? pointerMap[''] ?? { line: 0, column: 0 };
    return {
        severity,
        message,
        pointer,
        line: pos.line,
        column: pos.column,
        hint,
    };
}
function escapeJsonPointerSegment(segment) {
    return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}
