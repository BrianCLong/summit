/**
 * Vendor-level immutable redlines.
 * These intents are strictly prohibited across all profiles and tenants.
 * This file serves as the definitive source of truth for hard boundaries.
 */
export const VENDOR_REDLINES: readonly string[] = [
  'autonomous_targeting',
  'kinetic_action',
  'unauthorized_surveillance',
  'critical_infrastructure_sabotage',
  'mass_disinformation',
];

export function isRedlined(intent: string): boolean {
  return VENDOR_REDLINES.includes(intent);
}
