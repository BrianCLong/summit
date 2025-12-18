import { createHash } from 'node:crypto';

export type TopologyMode = 'active-active' | 'active-passive';

export interface RegionProfile {
  id: string;
  jurisdiction: string;
  supportsActiveActive: boolean;
  costPerHour: number;
  replicationLagMinutes: number;
  failoverTimeMinutes: number;
}

export interface ResidencyPolicy {
  dataClass: string;
  allowedJurisdictions: string[];
  crossBorderRequiresConsent?: boolean;
}

export interface WorkloadProfile {
  id: string;
  dataClass: string;
  criticality: 'tier0' | 'tier1' | 'tier2';
  preferredTopology?: TopologyMode;
  preferredRegions?: string[];
  rpoMinutes?: number;
  rtoMinutes?: number;
}

export interface PlannerTargets {
  rpoMinutes: number;
  rtoMinutes: number;
}

export interface PlannerInput {
  regions: RegionProfile[];
  policies: ResidencyPolicy[];
  workloads: WorkloadProfile[];
  targets: PlannerTargets;
  hourlyBudget?: number;
}

export interface PolicyEvidence {
  dataClass: string;
  allowedJurisdictions: string[];
  crossBorderRequiresConsent: boolean;
  consentReferences: string[];
}

export interface WorkloadPlan {
  workloadId: string;
  topology: TopologyMode;
  primaryRegion: string;
  secondaryRegion: string;
  jurisdictions: string[];
  computedRpoMinutes: number;
  computedRtoMinutes: number;
  meetsRpo: boolean;
  meetsRto: boolean;
  estimatedHourlyCost: number;
  controls: string[];
}

export interface RadrpPlan {
  planId: string;
  generatedAt: string;
  signer: string;
  signature: string;
  summary: {
    totalHourlyCost: number;
    topologyCounts: Record<TopologyMode, number>;
    workloadsProtected: number;
  };
  regionCatalog: Array<RegionProfile & { role: 'primary' | 'secondary' | 'either' }>;
  workloadPlans: WorkloadPlan[];
  policyEvidence: PolicyEvidence[];
}

export interface RunbookStep {
  step: number;
  action: string;
  expectedOutcome: string;
}

export interface FailoverRunbook {
  workloadId: string;
  topology: TopologyMode;
  assertions: {
    rpoMinutes: number;
    rtoMinutes: number;
  };
  steps: RunbookStep[];
}

export interface SyntheticDrillScriptStep {
  step: number;
  action: string;
  verification: string;
}

export interface SyntheticDrill {
  drillId: string;
  workloadId: string;
  seed: string;
  cadence: string;
  script: SyntheticDrillScriptStep[];
  auditTrail: Array<{ field: string; value: string }>;
}

export interface ReplicationPath {
  from: string;
  to: string;
  dataClass: string;
  consentReference?: string;
}

export interface VerificationViolation {
  path: ReplicationPath;
  reason: string;
}

export interface VerificationReport {
  ok: boolean;
  checkedAt: string;
  violations: VerificationViolation[];
}

export interface ResidencyVerifier {
  verify(paths: ReplicationPath[]): VerificationReport;
}

export interface PlannerOptions {
  signer?: string;
  now?: Date | string;
  drillCadenceDays?: number;
}

export interface PlannerResult {
  plan: RadrpPlan;
  runbooks: FailoverRunbook[];
  drills: SyntheticDrill[];
  verifier: ResidencyVerifier;
}

interface CandidateRegion extends RegionProfile {
  jurisdictionPeers: number;
}

interface SelectionContext {
  primary: RegionProfile;
  secondary: RegionProfile;
  topology: TopologyMode;
  computedRpo: number;
  computedRto: number;
  hourlyCost: number;
  controls: string[];
  usedConsentReference?: string;
}

export function buildResidencyAwarePlan(
  input: PlannerInput,
  options: PlannerOptions = {}
): PlannerResult {
  const signer = options.signer || 'RADRP-Autogen';
  const generatedAt = getGenerationTimestamp(options.now);
  const regionMap = new Map<string, RegionProfile>();
  input.regions.forEach((region) => {
    regionMap.set(region.id, region);
  });

  const policies = createPolicyMap(input.policies);

  const workloadPlans: WorkloadPlan[] = [];
  const policyEvidence: PolicyEvidence[] = [];
  const runbooks: FailoverRunbook[] = [];
  const drills: SyntheticDrill[] = [];
  let totalHourlyCost = 0;

  const regionRoleTracker = new Map<string, 'primary' | 'secondary' | 'either'>();

  const sortedWorkloads = [...input.workloads].sort((a, b) => a.id.localeCompare(b.id));

  for (const workload of sortedWorkloads) {
    const policy = policies.get(workload.dataClass);
    const context = selectRegionsForWorkload(workload, policy, input, regionMap);

    const jurisdictions = Array.from(
      new Set([context.primary.jurisdiction, context.secondary.jurisdiction])
    );

    const meetsRpo = context.computedRpo <= (workload.rpoMinutes || input.targets.rpoMinutes);
    const meetsRto = context.computedRto <= (workload.rtoMinutes || input.targets.rtoMinutes);

    if (!meetsRpo || !meetsRto) {
      throw new Error(
        `Unable to meet RPO/RTO for workload ${workload.id}; computed RPO ${context.computedRpo} and RTO ${context.computedRto}`
      );
    }

    totalHourlyCost += context.hourlyCost;

    markRegionRole(regionRoleTracker, context.primary.id, 'primary');
    markRegionRole(regionRoleTracker, context.secondary.id, context.topology === 'active-active' ? 'either' : 'secondary');

    workloadPlans.push({
      workloadId: workload.id,
      topology: context.topology,
      primaryRegion: context.primary.id,
      secondaryRegion: context.secondary.id,
      jurisdictions,
      computedRpoMinutes: context.computedRpo,
      computedRtoMinutes: context.computedRto,
      meetsRpo,
      meetsRto,
      estimatedHourlyCost: context.hourlyCost,
      controls: context.controls
    });

    const policyRecord: PolicyEvidence = {
      dataClass: workload.dataClass,
      allowedJurisdictions: policy ? [...policy.allowedJurisdictions] : jurisdictions,
      crossBorderRequiresConsent: policy?.crossBorderRequiresConsent || false,
      consentReferences: context.usedConsentReference ? [context.usedConsentReference] : []
    };
    policyEvidence.push(policyRecord);

    runbooks.push(createRunbookForWorkload(workload, context));
    drills.push(createSyntheticDrill(workload, context, generatedAt, options.drillCadenceDays));
  }

  const regionCatalog = createRegionCatalog(regionMap, regionRoleTracker);

  const planId = computePlanId(input, sortedWorkloads, policies);
  const planWithoutSignature: Omit<RadrpPlan, 'signature'> = {
    planId,
    generatedAt,
    signer,
    summary: {
      totalHourlyCost,
      topologyCounts: computeTopologyCounts(workloadPlans),
      workloadsProtected: workloadPlans.length
    },
    regionCatalog,
    workloadPlans,
    policyEvidence
  };

  const signature = signPlan(planWithoutSignature, signer);
  const plan: RadrpPlan = { ...planWithoutSignature, signature };

  const verifier = createVerifier(plan);

  return {
    plan,
    runbooks,
    drills,
    verifier
  };
}

function getGenerationTimestamp(now?: Date | string): string {
  if (typeof now === 'string') {
    return new Date(now).toISOString();
  }
  if (now instanceof Date) {
    return now.toISOString();
  }
  return new Date().toISOString();
}

function createPolicyMap(policies: ResidencyPolicy[]): Map<string, ResidencyPolicy> {
  const policyMap = new Map<string, ResidencyPolicy>();
  for (const policy of policies) {
    policyMap.set(policy.dataClass, {
      ...policy,
      allowedJurisdictions: [...policy.allowedJurisdictions].sort()
    });
  }
  return policyMap;
}

function selectRegionsForWorkload(
  workload: WorkloadProfile,
  policy: ResidencyPolicy | undefined,
  input: PlannerInput,
  regionMap: Map<string, RegionProfile>
): SelectionContext {
  const targetRpo = workload.rpoMinutes || input.targets.rpoMinutes;
  const targetRto = workload.rtoMinutes || input.targets.rtoMinutes;
  const preferredTopology = workload.preferredTopology || (workload.criticality === 'tier0' ? 'active-active' : 'active-passive');

  const eligibleRegions = filterEligibleRegions(workload, policy, input.regions, targetRpo, targetRto);

  if (eligibleRegions.length === 0) {
    throw new Error(`No eligible regions available for workload ${workload.id}`);
  }

  const sameJurisdictionPairs = buildSameJurisdictionPairs(eligibleRegions);

  if (preferredTopology === 'active-active') {
    const activeActiveSelection = chooseActiveActivePair(eligibleRegions, sameJurisdictionPairs, targetRpo, targetRto);
    if (activeActiveSelection) {
      return activeActiveSelection;
    }
  }

  return chooseActivePassivePair(workload, eligibleRegions, sameJurisdictionPairs, targetRpo, targetRto, policy);
}

function filterEligibleRegions(
  workload: WorkloadProfile,
  policy: ResidencyPolicy | undefined,
  regions: RegionProfile[],
  targetRpo: number,
  targetRto: number
): CandidateRegion[] {
  const preferredRegionSet = new Set(workload.preferredRegions || []);
  const allowedJurisdictions = policy ? new Set(policy.allowedJurisdictions) : undefined;

  const jurisdictionCounts = new Map<string, number>();
  for (const region of regions) {
    if (allowedJurisdictions && !allowedJurisdictions.has(region.jurisdiction)) {
      continue;
    }
    if (region.replicationLagMinutes > targetRpo || region.failoverTimeMinutes > targetRto) {
      continue;
    }
    if (preferredRegionSet.size > 0 && !preferredRegionSet.has(region.id)) {
      continue;
    }
    jurisdictionCounts.set(region.jurisdiction, (jurisdictionCounts.get(region.jurisdiction) || 0) + 1);
  }

  const eligible: CandidateRegion[] = [];
  for (const region of regions) {
    if (allowedJurisdictions && !allowedJurisdictions.has(region.jurisdiction)) {
      continue;
    }
    if (region.replicationLagMinutes > targetRpo || region.failoverTimeMinutes > targetRto) {
      continue;
    }
    if (preferredRegionSet.size > 0 && !preferredRegionSet.has(region.id)) {
      continue;
    }
    eligible.push({ ...region, jurisdictionPeers: jurisdictionCounts.get(region.jurisdiction) || 0 });
  }

  eligible.sort((a, b) => {
    if (a.costPerHour !== b.costPerHour) {
      return a.costPerHour - b.costPerHour;
    }
    if (a.jurisdiction === b.jurisdiction) {
      return a.id.localeCompare(b.id);
    }
    return a.jurisdiction.localeCompare(b.jurisdiction);
  });

  return eligible;
}

function buildSameJurisdictionPairs(eligible: CandidateRegion[]): Map<string, CandidateRegion[]> {
  const buckets = new Map<string, CandidateRegion[]>();
  for (const region of eligible) {
    const bucket = buckets.get(region.jurisdiction);
    if (bucket) {
      bucket.push(region);
    } else {
      buckets.set(region.jurisdiction, [region]);
    }
  }
  for (const [, bucket] of buckets) {
    bucket.sort((a, b) => {
      if (a.costPerHour !== b.costPerHour) {
        return a.costPerHour - b.costPerHour;
      }
      return a.id.localeCompare(b.id);
    });
  }
  return buckets;
}

function chooseActiveActivePair(
  eligibleRegions: CandidateRegion[],
  sameJurisdictionPairs: Map<string, CandidateRegion[]>,
  targetRpo: number,
  targetRto: number
): SelectionContext | undefined {
  for (const [, bucket] of sameJurisdictionPairs) {
    const activeActiveCapable = bucket.filter((region) => region.supportsActiveActive);
    if (activeActiveCapable.length >= 2) {
      const [primary, secondary] = activeActiveCapable.slice(0, 2);
      return buildSelection(primary, secondary, 'active-active', targetRpo, targetRto);
    }
  }

  const activeActiveEligible = eligibleRegions.filter((region) => region.supportsActiveActive);
  if (activeActiveEligible.length >= 2) {
    const [primary, secondary] = activeActiveEligible.slice(0, 2);
    return buildSelection(primary, secondary, 'active-active', targetRpo, targetRto);
  }
  return undefined;
}

function chooseActivePassivePair(
  workload: WorkloadProfile,
  eligibleRegions: CandidateRegion[],
  sameJurisdictionPairs: Map<string, CandidateRegion[]>,
  targetRpo: number,
  targetRto: number,
  policy: ResidencyPolicy | undefined
): SelectionContext {
  for (const [, bucket] of sameJurisdictionPairs) {
    if (bucket.length >= 2) {
      const [primary, secondary] = bucket.slice(0, 2);
      return buildSelection(primary, secondary, 'active-passive', targetRpo, targetRto);
    }
  }

  if (eligibleRegions.length === 1) {
    const [primary] = eligibleRegions;
    return buildSelection(primary, primary, 'active-passive', targetRpo, targetRto);
  }

  const [primary, secondary] = eligibleRegions.slice(0, 2);
  const selection = buildSelection(primary, secondary, 'active-passive', targetRpo, targetRto);

  if (
    policy?.crossBorderRequiresConsent &&
    primary.jurisdiction !== secondary.jurisdiction
  ) {
    selection.usedConsentReference = `consent-${workload.id}-${primary.jurisdiction}-${secondary.jurisdiction}`;
    selection.controls.push(
      `Cross-border replication permitted with consent reference ${selection.usedConsentReference}`
    );
  }

  return selection;
}

function buildSelection(
  primary: RegionProfile,
  secondary: RegionProfile,
  topology: TopologyMode,
  targetRpo: number,
  targetRto: number
): SelectionContext {
  const computedRpo = Math.max(primary.replicationLagMinutes, secondary.replicationLagMinutes, 1);
  const computedRto = Math.max(primary.failoverTimeMinutes, secondary.failoverTimeMinutes, 1);
  const hourlyCost =
    topology === 'active-active'
      ? roundCost(primary.costPerHour + secondary.costPerHour)
      : roundCost(primary.costPerHour + secondary.costPerHour * 0.5);

  const controls: string[] = [
    `Continuous replication with target RPO ≤ ${targetRpo} minutes`,
    `Failover orchestration with target RTO ≤ ${targetRto} minutes`
  ];

  if (topology === 'active-active') {
    controls.push('Bidirectional replication integrity checks every 5 minutes');
  } else {
    controls.push('Standby warm sync verification every 15 minutes');
  }

  return {
    primary,
    secondary,
    topology,
    computedRpo,
    computedRto,
    hourlyCost,
    controls
  };
}

function roundCost(value: number): number {
  return Math.round(value * 100) / 100;
}

function markRegionRole(
  tracker: Map<string, 'primary' | 'secondary' | 'either'>,
  regionId: string,
  role: 'primary' | 'secondary' | 'either'
): void {
  const existing = tracker.get(regionId);
  if (!existing) {
    tracker.set(regionId, role);
    return;
  }
  if (existing === role) {
    return;
  }
  tracker.set(regionId, 'either');
}

function createRegionCatalog(
  regions: Map<string, RegionProfile>,
  roleTracker: Map<string, 'primary' | 'secondary' | 'either'>
): Array<RegionProfile & { role: 'primary' | 'secondary' | 'either' }> {
  const catalog: Array<RegionProfile & { role: 'primary' | 'secondary' | 'either' }> = [];
  for (const [id, region] of regions) {
    const role = roleTracker.get(id) || 'either';
    catalog.push({ ...region, role });
  }
  catalog.sort((a, b) => a.id.localeCompare(b.id));
  return catalog;
}

function computeTopologyCounts(workloads: WorkloadPlan[]): Record<TopologyMode, number> {
  return workloads.reduce(
    (acc, workload) => {
      acc[workload.topology] += 1;
      return acc;
    },
    { 'active-active': 0, 'active-passive': 0 } as Record<TopologyMode, number>
  );
}

function computePlanId(
  input: PlannerInput,
  workloads: WorkloadProfile[],
  policies: Map<string, ResidencyPolicy>
): string {
  const serialized = stableSerialize({
    regions: input.regions,
    policies: Array.from(policies.values()),
    workloads,
    targets: input.targets
  });
  const digest = createHash('sha1').update(serialized).digest('hex').slice(0, 12);
  return `radrp-${digest}`;
}

function signPlan(plan: Omit<RadrpPlan, 'signature'>, signer: string): string {
  const serialized = stableSerialize({ ...plan, signer });
  return createHash('sha256').update(serialized).digest('hex');
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const sorted: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      sorted[key] = sortValue(val);
    }
    return sorted;
  }
  return value;
}

function createRunbookForWorkload(
  workload: WorkloadProfile,
  context: SelectionContext
): FailoverRunbook {
  const assertions = {
    rpoMinutes: context.computedRpo,
    rtoMinutes: context.computedRto
  };

  const steps: RunbookStep[] = [
    {
      step: 1,
      action: `Confirm health signals for ${context.primary.id} and ${context.secondary.id}`,
      expectedOutcome: 'Healthy primaries verified and replication lag within policy bounds'
    },
    {
      step: 2,
      action: `Trigger failover workflow for workload ${workload.id}`,
      expectedOutcome: `${context.secondary.id} promoted within committed RTO`
    },
    {
      step: 3,
      action: 'Validate data parity and customer routing after failover',
      expectedOutcome: 'No data loss beyond committed RPO; traffic fully restored'
    },
    {
      step: 4,
      action: 'Record audit evidence and reset topology to steady state',
      expectedOutcome: 'Signed post-mortem with metrics and evidence stored'
    }
  ];

  return {
    workloadId: workload.id,
    topology: context.topology,
    assertions,
    steps
  };
}

function createSyntheticDrill(
  workload: WorkloadProfile,
  context: SelectionContext,
  generatedAt: string,
  cadenceDays = 30
): SyntheticDrill {
  const cadence = `P${cadenceDays}D`;
  const seedSource = `${workload.id}|${context.primary.id}|${context.secondary.id}|${cadence}`;
  const seed = createHash('sha1').update(seedSource).digest('hex').slice(0, 12);

  const script: SyntheticDrillScriptStep[] = [
    {
      step: 1,
      action: `Inject synthetic failure in ${context.primary.id}`,
      verification: 'Monitoring detects outage and escalates to RADRP runbook'
    },
    {
      step: 2,
      action: `Validate promotion of ${context.secondary.id}`,
      verification: `Failover completed ≤ ${context.computedRto} minutes`
    },
    {
      step: 3,
      action: 'Replay recovery checkpoints to assess RPO adherence',
      verification: `No checkpoint gap beyond ${context.computedRpo} minutes`
    },
    {
      step: 4,
      action: 'Capture deterministic evidence bundle',
      verification: 'Hash of drill artifacts stored for audit'
    }
  ];

  const auditTrail = [
    { field: 'seed', value: seed },
    { field: 'generatedAt', value: generatedAt },
    { field: 'expectedRPO', value: `${context.computedRpo}` },
    { field: 'expectedRTO', value: `${context.computedRto}` }
  ];

  return {
    drillId: `drill-${workload.id}-${seed.slice(0, 6)}`,
    workloadId: workload.id,
    seed,
    cadence,
    script,
    auditTrail
  };
}

function createVerifier(plan: RadrpPlan): ResidencyVerifier {
  const regionIndex = new Map<string, RegionProfile & { role: 'primary' | 'secondary' | 'either' }>();
  for (const region of plan.regionCatalog) {
    regionIndex.set(region.id, region);
  }

  const policyIndex = new Map<string, PolicyEvidence>();
  for (const policy of plan.policyEvidence) {
    policyIndex.set(policy.dataClass, policy);
  }

  return {
    verify(paths: ReplicationPath[]): VerificationReport {
      const violations: VerificationViolation[] = [];
      const sortedPaths = [...paths].sort((a, b) => {
        if (a.dataClass === b.dataClass) {
          if (a.from === b.from) {
            return a.to.localeCompare(b.to);
          }
          return a.from.localeCompare(b.from);
        }
        return a.dataClass.localeCompare(b.dataClass);
      });

      for (const path of sortedPaths) {
        const fromRegion = regionIndex.get(path.from);
        const toRegion = regionIndex.get(path.to);
        const policy = policyIndex.get(path.dataClass);

        if (!fromRegion || !toRegion) {
          violations.push({
            path,
            reason: 'Region not part of approved RADRP plan'
          });
          continue;
        }

        if (!policy) {
          continue;
        }

        const fromAllowed = policy.allowedJurisdictions.includes(fromRegion.jurisdiction);
        const toAllowed = policy.allowedJurisdictions.includes(toRegion.jurisdiction);
        if (!fromAllowed || !toAllowed) {
          violations.push({
            path,
            reason: `Jurisdiction ${!fromAllowed ? fromRegion.jurisdiction : toRegion.jurisdiction} not permitted for data class ${policy.dataClass}`
          });
          continue;
        }

        const crossBorder = fromRegion.jurisdiction !== toRegion.jurisdiction;
        if (crossBorder && policy.crossBorderRequiresConsent) {
          const consentReference = path.consentReference;
          if (!consentReference || !policy.consentReferences.includes(consentReference)) {
            violations.push({
              path,
              reason: 'Cross-border replication missing required consent reference'
            });
          }
        }
      }

      return {
        ok: violations.length === 0,
        checkedAt: new Date().toISOString(),
        violations
      };
    }
  };
}
