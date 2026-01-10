import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  MultiRegionGovernance,
  SERVICE_PLACEMENT,
  TARGET_REGIONS,
  TIER_OBJECTIVES,
  type DataFieldResidency,
} from '../multi-region-governance.js';

describe('MultiRegionGovernance', () => {
  let governance: MultiRegionGovernance;
  const tenantId = 'tenant-123';

  beforeEach(() => {
    governance = new MultiRegionGovernance();
  });

  it('assigns and returns tenant home regions', () => {
    const region = governance.assignHomeRegion(tenantId, 'euw1');
    expect(region).toBe('euw1');
    expect(governance.getHomeRegion(tenantId)).toBe('euw1');
  });

  it('denies unsupported regions for assignment', () => {
    expect(() => governance.assignHomeRegion(tenantId, 'unknown' as any)).toThrow('Unsupported region');
  });

  it('routes reads with degraded fallback when allowed', () => {
    governance.assignHomeRegion(tenantId, 'use1');
    governance.updateRegionHealth('use1', { status: 'down', allowsWrites: false });
    governance.updateRegionHealth('euw1', { status: 'degraded', allowsWrites: false });

    const decision = governance.decideRoute(tenantId, {
      requestedRegion: 'use1',
      operation: 'read',
      allowDegradedRead: true,
    });

    expect(decision.targetRegion).toBe('euw1');
    expect(decision.mode).toBe('read-only');
    expect(decision.failover).toBe(true);
  });

  it('enforces write locality to healthy region only', () => {
    governance.assignHomeRegion(tenantId, 'use1');
    governance.updateRegionHealth('use1', { status: 'healthy', allowsWrites: true });
    governance.updateRegionHealth('euw1', { status: 'healthy', allowsWrites: true });

    const decision = governance.decideRoute(tenantId, {
      requestedRegion: 'euw1',
      operation: 'write',
    });

    expect(decision.targetRegion).toBe('euw1');
    expect(decision.mode).toBe('read-write');
    expect(decision.failover).toBe(false);
  });

  it('enforces data locality for in-region data', () => {
    governance.assignHomeRegion(tenantId, 'use1');
    const fields: DataFieldResidency[] = [
      { field: 'email', residency: 'in-region', sensitivity: 'pii' },
    ];

    const decision = governance.enforceLocality(tenantId, 'euw1', fields);

    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('home region use1');
  });

  it('blocks geo-bound data from crossing jurisdictions', () => {
    governance.assignHomeRegion(tenantId, 'euw1');
    const fields: DataFieldResidency[] = [
      { field: 'health_record', residency: 'geo-bound', sensitivity: 'phi' },
    ];

    const decision = governance.enforceLocality(tenantId, 'use1', fields);

    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('geo-bound');
  });

  it('requires controls for sensitive fields when allowed', () => {
    governance.assignHomeRegion(tenantId, 'use1');
    const fields: DataFieldResidency[] = [
      { field: 'display_name', residency: 'global-ok', sensitivity: 'pii' },
    ];

    const decision = governance.enforceLocality(tenantId, 'use1', fields);

    expect(decision.allow).toBe(true);
    expect(decision.requiredControls).toEqual(
      expect.arrayContaining(['encrypted-in-transit', 'encrypted-at-rest', 'audit-log']),
    );
  });

  it('default-denies egress without allowlist', () => {
    const decision = governance.evaluateEgress(tenantId, {
      destinationRegion: 'euw1',
      purpose: 'analytics',
      dataResidencyTag: 'geo-bound',
    });

    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('default-deny');
  });

  it('allows egress when allowlisted and not expired', () => {
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

    expect(decision.allow).toBe(true);
    expect(decision.requiredControls).toEqual(
      expect.arrayContaining(['egress-logging', 'tokenized-export']),
    );
  });

  it('returns tier objectives as mandated', () => {
    expect(governance.resolveTierObjective('tier0')).toEqual(TIER_OBJECTIVES.tier0);
    expect(governance.resolveTierObjective('tier1')).toEqual(TIER_OBJECTIVES.tier1);
    expect(governance.resolveTierObjective('tier2')).toEqual(TIER_OBJECTIVES.tier2);
  });

  it('exposes manifest with placement and config', () => {
    const manifest = governance.getManifest();

    expect(manifest.regions.use1.name).toBe(TARGET_REGIONS.use1.name);
    expect(manifest.servicePlacement.global).toEqual(expect.arrayContaining(SERVICE_PLACEMENT.global));
    expect(manifest.tierObjectives.tier0.rpoMinutes).toBe(5);
    expect(manifest.crossBorder.gateway.nodeId).toBeDefined();
  });
});
