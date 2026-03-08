"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enabled = enabled;
exports.allow = allow;
const flags = new Map(); // flag -> tenants
function enabled(flag, tenant) {
    return flags.get(flag)?.has(tenant) || false;
}
function allow(flag, tenant) {
    (flags.get(flag) ?? flags.set(flag, new Set()).get(flag)).add(tenant);
}
