"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const multi_region_governance_js_1 = require("../multi-region-governance.js");
(0, globals_1.describe)('MultiRegionGovernance', () => {
    let governance;
    const tenantId = 'tenant-123';
    (0, globals_1.beforeEach)(() => {
        governance = new multi_region_governance_js_1.MultiRegionGovernance();
    });
    (0, globals_1.it)('assigns and returns tenant home regions', () => {
        const region = governance.assignHomeRegion(tenantId, 'euw1');
        (0, globals_1.expect)(region).toBe('euw1');
        (0, globals_1.expect)(governance.getHomeRegion(tenantId)).toBe('euw1');
    });
    (0, globals_1.it)('denies unsupported regions for assignment', () => {
        (0, globals_1.expect)(() => governance.assignHomeRegion(tenantId, 'unknown')).toThrow('Unsupported region');
    });
    (0, globals_1.it)('routes reads with degraded fallback when allowed', () => {
        governance.assignHomeRegion(tenantId, 'use1');
        governance.updateRegionHealth('use1', { status: 'down', allowsWrites: false });
        governance.updateRegionHealth('euw1', { status: 'degraded', allowsWrites: false });
        const decision = governance.decideRoute(tenantId, {
            requestedRegion: 'use1',
            operation: 'read',
            allowDegradedRead: true,
        });
        (0, globals_1.expect)(decision.targetRegion).toBe('euw1');
        (0, globals_1.expect)(decision.mode).toBe('read-only');
        (0, globals_1.expect)(decision.failover).toBe(true);
    });
    (0, globals_1.it)('enforces write locality to healthy region only', () => {
        governance.assignHomeRegion(tenantId, 'use1');
        governance.updateRegionHealth('use1', { status: 'healthy', allowsWrites: true });
        governance.updateRegionHealth('euw1', { status: 'healthy', allowsWrites: true });
        const decision = governance.decideRoute(tenantId, {
            requestedRegion: 'euw1',
            operation: 'write',
        });
        (0, globals_1.expect)(decision.targetRegion).toBe('euw1');
        (0, globals_1.expect)(decision.mode).toBe('read-write');
        (0, globals_1.expect)(decision.failover).toBe(false);
    });
    (0, globals_1.it)('enforces data locality for in-region data', () => {
        governance.assignHomeRegion(tenantId, 'use1');
        const fields = [
            { field: 'email', residency: 'in-region', sensitivity: 'pii' },
        ];
        const decision = governance.enforceLocality(tenantId, 'euw1', fields);
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('home region use1');
    });
    (0, globals_1.it)('blocks geo-bound data from crossing jurisdictions', () => {
        governance.assignHomeRegion(tenantId, 'euw1');
        const fields = [
            { field: 'health_record', residency: 'geo-bound', sensitivity: 'phi' },
        ];
        const decision = governance.enforceLocality(tenantId, 'use1', fields);
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('geo-bound');
    });
    (0, globals_1.it)('requires controls for sensitive fields when allowed', () => {
        governance.assignHomeRegion(tenantId, 'use1');
        const fields = [
            { field: 'display_name', residency: 'global-ok', sensitivity: 'pii' },
        ];
        const decision = governance.enforceLocality(tenantId, 'use1', fields);
        (0, globals_1.expect)(decision.allow).toBe(true);
        (0, globals_1.expect)(decision.requiredControls).toEqual(globals_1.expect.arrayContaining(['encrypted-in-transit', 'encrypted-at-rest', 'audit-log']));
    });
    (0, globals_1.it)('default-denies egress without allowlist', () => {
        const decision = governance.evaluateEgress(tenantId, {
            destinationRegion: 'euw1',
            purpose: 'analytics',
            dataResidencyTag: 'geo-bound',
        });
        (0, globals_1.expect)(decision.allow).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('default-deny');
    });
    (0, globals_1.it)('allows egress when allowlisted and not expired', () => {
        const expiresAt = Date.now() + 60_000;
        governance.registerEgressAllowance(tenantId, {
            targetRegion: 'euw1',
            purpose: 'analytics',
            expiresAt,
            allowedResidencyTags: ['geo-bound', 'global-ok'],
        });
        const decision = governance.evaluateEgress(tenantId, {
            destinationRegion: 'euw1',
            purpose: 'analytics',
            dataResidencyTag: 'geo-bound',
        });
        (0, globals_1.expect)(decision.allow).toBe(true);
        (0, globals_1.expect)(decision.requiredControls).toEqual(globals_1.expect.arrayContaining(['egress-logging', 'tokenized-export']));
    });
    (0, globals_1.it)('returns tier objectives as mandated', () => {
        (0, globals_1.expect)(governance.resolveTierObjective('tier0')).toEqual(multi_region_governance_js_1.TIER_OBJECTIVES.tier0);
        (0, globals_1.expect)(governance.resolveTierObjective('tier1')).toEqual(multi_region_governance_js_1.TIER_OBJECTIVES.tier1);
        (0, globals_1.expect)(governance.resolveTierObjective('tier2')).toEqual(multi_region_governance_js_1.TIER_OBJECTIVES.tier2);
    });
    (0, globals_1.it)('exposes manifest with placement and config', () => {
        const manifest = governance.getManifest();
        (0, globals_1.expect)(manifest.regions.use1.name).toBe(multi_region_governance_js_1.TARGET_REGIONS.use1.name);
        (0, globals_1.expect)(manifest.servicePlacement.global).toEqual(globals_1.expect.arrayContaining(multi_region_governance_js_1.SERVICE_PLACEMENT.global));
        (0, globals_1.expect)(manifest.tierObjectives.tier0.rpoMinutes).toBe(5);
        (0, globals_1.expect)(manifest.crossBorder.gateway.nodeId).toBeDefined();
    });
});
