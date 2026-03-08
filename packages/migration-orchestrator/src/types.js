"use strict";
/**
 * @typedef {'inventory' | 'mapping' | 'dry-run' | 'canary' | 'ramp' | 'full' | 'stabilization' | 'decommissioned'} TenantPhase
 * @typedef {{ guid: string; userId: string; orgId: string; domains: string[]; scimIds: string[]; provenance: string[] }} Identity
 * @typedef {{ oldTenantId: string; newTenantId: string; createdAt: Date; checkpoints: string[]; auditTrail: string[]; reversible: boolean }} AccountLink
 * @typedef {{ scope: string; owner: string; expiresAt: Date; compensatingControls: string[] }} ExceptionSeed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_PHASES = void 0;
exports.TENANT_PHASES = [
    'inventory',
    'mapping',
    'dry-run',
    'canary',
    'ramp',
    'full',
    'stabilization',
    'decommissioned',
];
