"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireInvariant = requireInvariant;
function requireInvariant(check) {
    return (_, __, desc) => {
        const f = desc.value;
        desc.value = async function (...args) {
            const ctx = args[0] || {};
            const r = check(ctx);
            if (!r.ok)
                throw new Error(`InvariantViolation: ${r.msg || 'unspecified'}`);
            return f.apply(this, args);
        };
        return desc;
    };
}
