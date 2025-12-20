const flags = new Map<string, Set<string>>(); // flag -> tenants

/**
 * Checks if a feature flag is enabled for a specific tenant.
 *
 * @param flag - The feature flag key.
 * @param tenant - The tenant ID.
 * @returns `true` if the flag is enabled for the tenant, `false` otherwise.
 */
export function enabled(flag: string, tenant: string) {
  return flags.get(flag)?.has(tenant) || false;
}

/**
 * Enables a feature flag for a specific tenant.
 *
 * @param flag - The feature flag key.
 * @param tenant - The tenant ID.
 */
export function allow(flag: string, tenant: string) {
  (flags.get(flag) ?? flags.set(flag, new Set()).get(flag))!.add(tenant);
}
