const flags = new Map<string, Set<string>>(); // flag -> tenants
export function enabled(flag: string, tenant: string) {
  return flags.get(flag)?.has(tenant) || false;
}
export function allow(flag: string, tenant: string) {
  (flags.get(flag) ?? flags.set(flag, new Set()).get(flag))!.add(tenant);
}
