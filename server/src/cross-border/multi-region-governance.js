"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiRegionGovernance = exports.TIER_OBJECTIVES = exports.SERVICE_PLACEMENT = exports.TARGET_REGIONS = void 0;
exports.getMultiRegionGovernance = getMultiRegionGovernance;
const prom_client_1 = require("prom-client");
const config_js_1 = require("./config.js");
exports.TARGET_REGIONS = {
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
exports.SERVICE_PLACEMENT = {
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
exports.TIER_OBJECTIVES = {
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
const routingDecisions = new prom_client_1.Counter({
    name: 'multi_region_routing_decisions_total',
    help: 'Total routing decisions made by the multi-region governance layer',
    labelNames: ['region', 'mode', 'failover'],
});
const localityViolations = new prom_client_1.Counter({
    name: 'data_locality_violations_total',
    help: 'Locality enforcement failures',
    labelNames: ['region', 'residency_tag', 'sensitivity'],
});
const egressDecisionGauge = new prom_client_1.Gauge({
    name: 'egress_allowances_active',
    help: 'Active egress allowances per tenant',
    labelNames: ['tenant_id'],
});
class MultiRegionGovernance {
    defaultRegion;
    regionHealth = new Map();
    tenantHomeRegions = new Map();
    egressAllowances = new Map();
    constructor(defaultRegion = 'use1') {
        this.defaultRegion = defaultRegion;
        Object.keys(exports.TARGET_REGIONS).forEach((region) => {
            this.regionHealth.set(region, {
                status: 'healthy',
                latencyMs: 25,
                lastCheckedAt: Date.now(),
                allowsWrites: true,
            });
        });
    }
    assignHomeRegion(tenantId, region) {
        if (!exports.TARGET_REGIONS[region]) {
            throw new Error(`Unsupported region ${region}`);
        }
        this.tenantHomeRegions.set(tenantId, region);
        return region;
    }
    getHomeRegion(tenantId) {
        return this.tenantHomeRegions.get(tenantId) || this.defaultRegion;
    }
    updateRegionHealth(region, health) {
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
    decideRoute(tenantId, options) {
        const home = this.getHomeRegion(tenantId);
        const candidateOrder = [];
        if (options.requestedRegion && exports.TARGET_REGIONS[options.requestedRegion]) {
            candidateOrder.push(options.requestedRegion);
        }
        if (!candidateOrder.includes(home)) {
            candidateOrder.push(home);
        }
        Object.keys(exports.TARGET_REGIONS).forEach((region) => {
            const code = region;
            if (!candidateOrder.includes(code)) {
                candidateOrder.push(code);
            }
        });
        for (const region of candidateOrder) {
            const health = this.regionHealth.get(region);
            if (!health)
                continue;
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
                const readOnly = !health.allowsWrites || health.status !== 'healthy' || !exports.TARGET_REGIONS[region].supportsWriteDuringDegrade;
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
    enforceLocality(tenantId, targetRegion, dataFields) {
        const homeRegion = this.getHomeRegion(tenantId);
        const requiredControls = new Set();
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
                const sourceJurisdiction = exports.TARGET_REGIONS[homeRegion].jurisdiction;
                const targetJurisdiction = exports.TARGET_REGIONS[targetRegion].jurisdiction;
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
    registerEgressAllowance(tenantId, allowance) {
        const allowances = this.egressAllowances.get(tenantId) || [];
        const filtered = allowances.filter((existing) => existing.targetRegion !== allowance.targetRegion || existing.purpose !== allowance.purpose);
        filtered.push(allowance);
        this.egressAllowances.set(tenantId, filtered);
        egressDecisionGauge.set({ tenant_id: tenantId }, filtered.length);
    }
    evaluateEgress(tenantId, request) {
        const allowances = this.egressAllowances.get(tenantId) || [];
        const now = Date.now();
        const matching = allowances.find((allowance) => allowance.targetRegion === request.destinationRegion &&
            allowance.purpose === request.purpose &&
            allowance.expiresAt > now &&
            allowance.allowedResidencyTags.includes(request.dataResidencyTag));
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
    resolveTierObjective(tier) {
        const objective = exports.TIER_OBJECTIVES[tier];
        if (!objective) {
            throw new Error(`Unknown service tier: ${tier}`);
        }
        return objective;
    }
    getManifest() {
        return {
            defaultRegion: this.defaultRegion,
            regions: exports.TARGET_REGIONS,
            servicePlacement: exports.SERVICE_PLACEMENT,
            tierObjectives: exports.TIER_OBJECTIVES,
            crossBorder: (0, config_js_1.getCrossBorderConfig)(),
        };
    }
}
exports.MultiRegionGovernance = MultiRegionGovernance;
function getMultiRegionGovernance() {
    return new MultiRegionGovernance();
}
