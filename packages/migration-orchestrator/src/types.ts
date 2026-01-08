/**
 * @typedef {'inventory' | 'mapping' | 'dry-run' | 'canary' | 'ramp' | 'full' | 'stabilization' | 'decommissioned'} TenantPhase
 * @typedef {{ guid: string; userId: string; orgId: string; domains: string[]; scimIds: string[]; provenance: string[] }} Identity
 * @typedef {{ oldTenantId: string; newTenantId: string; createdAt: Date; checkpoints: string[]; auditTrail: string[]; reversible: boolean }} AccountLink
 * @typedef {{ scope: string; owner: string; expiresAt: Date; compensatingControls: string[] }} ExceptionSeed
 */

export const TENANT_PHASES = [
  "inventory",
  "mapping",
  "dry-run",
  "canary",
  "ramp",
  "full",
  "stabilization",
  "decommissioned",
];
