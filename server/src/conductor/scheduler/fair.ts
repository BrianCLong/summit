type Tokens = { current: number; max: number; refillPerSec: number };
const tenants = new Map<string, Tokens>();

export function acquireTenantSlot(tenant: string) {
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

export function refillAll(dtSec = 1) {
  for (const t of tenants.values()) {
    t.current = Math.min(t.max, t.current + t.refillPerSec * dtSec);
  }
}
