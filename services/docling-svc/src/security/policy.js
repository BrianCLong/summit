"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateLicensePolicy = exports.evaluatePurposePolicy = void 0;
const PURPOSE_MATRIX = {
    investigation: ['short', 'standard'],
    't&s': ['short'],
    benchmarking: ['short', 'standard'],
    release_notes: ['standard'],
    compliance: ['standard'],
};
const LICENSE_ALLOW_LIST = new Set([
    'MIT',
    'Apache-2.0',
    'BSD-3-Clause',
    'BSD-2-Clause',
    'ISC',
    'CC-BY-4.0',
    'Unlicense',
]);
const evaluatePurposePolicy = (input) => {
    const allowedRetentions = PURPOSE_MATRIX[input.purpose];
    if (!allowedRetentions) {
        return { allow: false, reason: 'unknown_purpose', tags: [] };
    }
    if (!allowedRetentions.includes(input.retention)) {
        return {
            allow: false,
            reason: 'retention_not_allowed',
            tags: [`purpose:${input.purpose}`, `retention:${input.retention}`],
        };
    }
    return {
        allow: true,
        tags: [`purpose:${input.purpose}`, `retention:${input.retention}`],
    };
};
exports.evaluatePurposePolicy = evaluatePurposePolicy;
const evaluateLicensePolicy = (signal) => {
    if (!signal.value) {
        return { allow: true, tags: ['license:unknown'] };
    }
    const normalized = signal.value.toUpperCase();
    if (LICENSE_ALLOW_LIST.has(normalized)) {
        return { allow: true, tags: [`license:${normalized}`] };
    }
    return {
        allow: false,
        reason: 'license_not_permitted',
        tags: [`license:${normalized}`],
    };
};
exports.evaluateLicensePolicy = evaluateLicensePolicy;
