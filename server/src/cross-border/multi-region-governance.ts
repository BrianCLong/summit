import { Counter, Gauge } from 'prom-client';
import { getCrossBorderConfig } from './config.js';

export type RegionCode = 'use1' | 'euw1' | 'apse1';

export type ResidencyTag = 'in-region' | 'geo-bound' | 'global-ok';

export type SensitivityLevel = 'low' | 'pii' | 'phi';

export interface DataFieldResidency {
  field: string;
  residency: ResidencyTag;
  sensitivity: SensitivityLevel;
}

export type ServiceTier = 'tier0' | 'tier1' | 'tier2';

export interface TierObjective {
  rpoMinutes: number;
  rtoMinutes: number;
  replicationMode: 'sync' | 'semi-sync' | 'async';
  description: string;
}

export interface RegionDetails {
  name: string;
  jurisdiction: 'us' | 'eu' | 'apac';
  code: RegionCode;
  placement: 'global' | 'regional';
  supportsWriteDuringDegrade: boolean;
}

export interface RegionHealth {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheckedAt: number;
  allowsWrites: boolean;
}

export interface RouteDecision {
  targetRegion: RegionCode;
  mode: 'read-write' | 'read-only';
  failover: boolean;
  reason: string;
}

export interface LocalityDecision {
  allow: boolean;
  reason: string;
  requiredControls?: string[];
}

export interface EgressAllowance {
  targetRegion: RegionCode;
  purpose: string;
  expiresAt: number;
  allowedResidencyTags: ResidencyTag[];
}

export const TARGET_REGIONS: Record<RegionCode, RegionDetails> = {
  use1: {
    name: 'us-east-1',
    jurisdiction: 'us',
    code: 'use1',
    placement: 'regional',
    supportsWriteDuringDegrade: true,
  },
  euw1: {
    name: 'eu-west-1',
    jurisdiction: 'eu',
    code: 'euw1',
    placement: 'regional',
    supportsWriteDuringDegrade: true,
  },
  apse1: {
    name: 'ap-southeast-1',
    jurisdiction: 'apac',
    code: 'apse1',
    placement: 'regional',
    supportsWriteDuringDegrade: false,
  },
};

export const SERVICE_PLACEMENT = {
  global: [
    'identity',
    'entitlements',
    'config-catalog',
    'feature-flags',
    'control-plane-api',
  ],
  regional: [
    'graph-db',
    'relational-db',
    'redis-cache',
    'kafka-streams',
    'observability-collector',
    'job-runner',
    'regional-ingress',
  ],
};

export const TIER_OBJECTIVES: Record<ServiceTier, TierObjective> = {
  tier0: {
    rpoMinutes: 5,
    rtoMinutes: 15,
    replicationMode: 'sync',
    description: 'Auth, billing, control plane',
  },
  tier1: {
    rpoMinutes: 15,
    rtoMinutes: 30,
    replicationMode: 'semi-sync',
    description: 'Core graph reads/writes, search',
  },
  tier2: {
    rpoMinutes: 360,
    rtoMinutes: 1440,
    replicationMode: 'async',
    description: 'Analytics, exports, ML batch',
  },
};

const routingDecisions = new Counter({
  name: 'multi_region_routing_decisions_total',
  help: 'Total routing decisions made by the multi-region governance layer',
  labelNames: ['region', 'mode', 'failover'],
});

const localityViolations = new Counter({
  name: 'data_locality_violations_total',
  help: 'Locality enforcement failures',
  labelNames: ['region', 'residency_tag', 'sensitivity'],
});

const egressDecisionGauge = new Gauge({
  name: 'egress_allowances_active',
  help: 'Active egress allowances per tenant',
  labelNames: ['tenant_id'],
});

export class MultiRegionGovernance {
  private readonly defaultRegion: RegionCode;
  private readonly regionHealth: Map<RegionCode, RegionHealth> = new Map();
  private readonly tenantHomeRegions: Map<string, RegionCode> = new Map();
  private readonly egressAllowances: Map<string, EgressAllowance[]> = new Map();

  constructor(defaultRegion: RegionCode = 'use1') {
    this.defaultRegion = defaultRegion;
    Object.keys(TARGET_REGIONS).forEach((region) => {
      this.regionHealth.set(region as RegionCode, {
        status: 'healthy',
        latencyMs: 25,
        lastCheckedAt: Date.now(),
        allowsWrites: true,
      });
    });
  }

  assignHomeRegion(tenantId: string, region: RegionCode): RegionCode {
    if (!TARGET_REGIONS[region]) {
      throw new Error(`Unsupported region ${region}`);
    }

    this.tenantHomeRegions.set(tenantId, region);
    return region;
  }

  getHomeRegion(tenantId: string): RegionCode {
    return this.tenantHomeRegions.get(tenantId) || this.defaultRegion;
  }

  updateRegionHealth(region: RegionCode, health: Partial<RegionHealth>): void {
    const existing = this.regionHealth.get(region);
    if (!existing) {
      throw new Error(`Unknown region ${region}`);
    }

    this.regionHealth.set(region, {
      ...existing,
      ...health,
      lastCheckedAt: health.lastCheckedAt ?? Date.now(),
    });
  }

  decideRoute(
    tenantId: string,
    options: {
      requestedRegion?: RegionCode;
      operation: 'read' | 'write' | 'export';
      allowDegradedRead?: boolean;
    },
  ): RouteDecision {
    const home = this.getHomeRegion(tenantId);
    const candidateOrder: RegionCode[] = [];

    if (options.requestedRegion && TARGET_REGIONS[options.requestedRegion]) {
      candidateOrder.push(options.requestedRegion);
    }

    if (!candidateOrder.includes(home)) {
      candidateOrder.push(home);
    }

    Object.keys(TARGET_REGIONS).forEach((region) => {
      const code = region as RegionCode;
      if (!candidateOrder.includes(code)) {
        candidateOrder.push(code);
      }
    });

    for (const region of candidateOrder) {
      const health = this.regionHealth.get(region);
      if (!health) {continue;}

      const canWrite = health.status === 'healthy' && health.allowsWrites;
      const canRead = health.status !== 'down';

      if (options.operation === 'write' && canWrite) {
        routingDecisions.inc({ region, mode: 'read-write', failover: region !== options.requestedRegion });
        return {
          targetRegion: region,
          mode: 'read-write',
          failover: region !== (options.requestedRegion || home),
          reason: canWrite ? 'Healthy for writes' : 'Fallback to healthy region',
        };
      }

      if (options.operation !== 'write' && canRead) {
        const readOnly =
          !health.allowsWrites || health.status !== 'healthy' || !TARGET_REGIONS[region].supportsWriteDuringDegrade;

        if (readOnly && !options.allowDegradedRead) {
          continue;
        }

        routingDecisions.inc({ region, mode: readOnly ? 'read-only' : 'read-write', failover: region !== options.requestedRegion });
        return {
          targetRegion: region,
          mode: readOnly ? 'read-only' : 'read-write',
          failover: region !== (options.requestedRegion || home),
          reason: readOnly ? 'Degraded read-only routing' : 'Healthy read path',
        };
      }
    }

    throw new Error('No viable region found for request');
  }

  enforceLocality(
    tenantId: string,
    targetRegion: RegionCode,
    dataFields: DataFieldResidency[],
  ): LocalityDecision {
    const homeRegion = this.getHomeRegion(tenantId);
    const requiredControls = new Set<string>();

    for (const field of dataFields) {
      if (field.residency === 'in-region' && targetRegion !== homeRegion) {
        localityViolations.inc({
          region: targetRegion,
          residency_tag: field.residency,
          sensitivity: field.sensitivity,
        });
        return {
          allow: false,
          reason: `${field.field} must stay in home region ${homeRegion}`,
        };
      }

      if (field.residency === 'geo-bound') {
        const sourceJurisdiction = TARGET_REGIONS[homeRegion].jurisdiction;
        const targetJurisdiction = TARGET_REGIONS[targetRegion].jurisdiction;
        if (sourceJurisdiction !== targetJurisdiction) {
          localityViolations.inc({
            region: targetRegion,
            residency_tag: field.residency,
            sensitivity: field.sensitivity,
          });
          return {
            allow: false,
            reason: `${field.field} is geo-bound to ${sourceJurisdiction}`,
          };
        }
      }

      if (field.sensitivity !== 'low') {
        requiredControls.add('encrypted-in-transit');
        requiredControls.add('encrypted-at-rest');
        requiredControls.add('audit-log');
      }
    }

    return {
      allow: true,
      reason: 'Locality requirements satisfied',
      requiredControls: Array.from(requiredControls),
    };
  }

  registerEgressAllowance(tenantId: string, allowance: EgressAllowance): void {
    const allowances = this.egressAllowances.get(tenantId) || [];
    const filtered = allowances.filter((existing) => existing.targetRegion !== allowance.targetRegion || existing.purpose !== allowance.purpose);
    filtered.push(allowance);
    this.egressAllowances.set(tenantId, filtered);
    egressDecisionGauge.set({ tenant_id: tenantId }, filtered.length);
  }

  evaluateEgress(
    tenantId: string,
    request: {
      destinationRegion: RegionCode;
      purpose: string;
      dataResidencyTag: ResidencyTag;
    },
  ): LocalityDecision {
    const allowances = this.egressAllowances.get(tenantId) || [];
    const now = Date.now();

    const matching = allowances.find(
      (allowance) =>
        allowance.targetRegion === request.destinationRegion &&
        allowance.purpose === request.purpose &&
        allowance.expiresAt > now &&
        allowance.allowedResidencyTags.includes(request.dataResidencyTag),
    );

    if (!matching) {
      localityViolations.inc({
        region: request.destinationRegion,
        residency_tag: request.dataResidencyTag,
        sensitivity: 'low',
      });
      return {
        allow: false,
        reason: 'Egress denied by default-deny policy',
      };
    }

    return {
      allow: true,
      reason: 'Egress allowed by policy',
      requiredControls: ['egress-logging', 'tokenized-export'],
    };
  }

  resolveTierObjective(tier: ServiceTier): TierObjective {
    const objective = TIER_OBJECTIVES[tier];
    if (!objective) {
      throw new Error(`Unknown service tier: ${tier}`);
    }
    return objective;
  }

  getManifest() {
    return {
      defaultRegion: this.defaultRegion,
      regions: TARGET_REGIONS,
      servicePlacement: SERVICE_PLACEMENT,
      tierObjectives: TIER_OBJECTIVES,
      crossBorder: getCrossBorderConfig(),
    };
  }
}

export function getMultiRegionGovernance(): MultiRegionGovernance {
  return new MultiRegionGovernance();
}

