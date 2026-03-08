"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireTenantSlot = acquireTenantSlot;
exports.refillAll = refillAll;
const tenants = new Map();
function acquireTenantSlot(tenant) {
    const t = tenants.get(tenant) || {
        current: Number(process.env.ADAPTIVE_CONCURRENCY_DEFAULT || 5),
        max: Number(process.env.ADAPTIVE_CONCURRENCY_DEFAULT || 5),
        refillPerSec: Number(process.env.TENANT_TOKEN_REFILL_PER_SEC || 1),
    };
    if (t.current <= 0) {
        tenants.set(tenant, t);
        return false;
    }
    t.current -= 1;
    tenants.set(tenant, t);
    return true;
}
function refillAll(dtSec = 1) {
    for (const t of tenants.values()) {
        t.current = Math.min(t.max, t.current + t.refillPerSec * dtSec);
    }
}
