import type {
  AssetDescriptor,
  AssetPerformanceSnapshot,
  JobSpec,
  PolicyHook,
  RoutingDecision,
  RoutingPlan
} from './types';

export interface JobRouterOptions {
  latencyWeight?: number;
  costWeight?: number;
  reliabilityWeight?: number;
  complianceWeight?: number;
}

const DEFAULT_OPTIONS: Required<JobRouterOptions> = {
  latencyWeight: 0.35,
  costWeight: 0.2,
  reliabilityWeight: 0.3,
  complianceWeight: 0.15
};

function hasCapabilities(asset: AssetDescriptor, required: string[]): boolean {
  if (!required.length) {
    return true;
  }
  const capabilities = new Set(
    (asset.capabilities ?? []).map(capability => capability.name.toLowerCase())
  );
  for (const capability of required) {
    if (!capabilities.has(capability.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function matchesRequirement(values: string[] | undefined, candidate?: string): boolean {
  if (!values || values.length === 0) {
    return true;
  }
  if (!candidate) {
    return false;
  }
  return values.includes(candidate);
}

export class JobRouter {
  private readonly options: Required<JobRouterOptions>;

  constructor(options?: JobRouterOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async route(
    job: JobSpec,
    assets: AssetDescriptor[],
    performance: AssetPerformanceSnapshot[],
    policyHooks: PolicyHook[]
  ): Promise<RoutingPlan> {
    const performanceMap = new Map(performance.map(snapshot => [snapshot.assetId, snapshot]));
    const scored: RoutingDecision[] = [];

    for (const asset of assets) {
      if (!hasCapabilities(asset, job.requiredCapabilities)) {
        continue;
      }
      if (!matchesRequirement(job.requirements?.regions, asset.region)) {
        continue;
      }
      if (!matchesRequirement(job.requirements?.clouds, asset.cloud)) {
        continue;
      }

      const compliance = (asset.labels?.compliance ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      if (job.requirements?.complianceTags) {
        const missing = job.requirements.complianceTags.filter(
          tag => !compliance.includes(tag)
        );
        if (missing.length > 0) {
          continue;
        }
      }

      let allowed = true;
      const reasoning: string[] = [];
      for (const hook of policyHooks) {
        const result = await hook.evaluate({ asset, job, intent: 'job-routing' });
        if (!result.allowed) {
          allowed = false;
          reasoning.push(`denied by policy:${hook.id}`);
          break;
        }
        if (result.reason) {
          reasoning.push(result.reason);
        }
      }
      if (!allowed) {
        continue;
      }

      const snapshot = performanceMap.get(asset.id);
      const latency = snapshot?.latencyMs ?? asset.capabilities?.[0]?.qualityOfService?.latencyMs ?? 500;
      const cost = snapshot?.costPerHour ?? 10;
      const throughput = snapshot?.throughput ?? 100;
      const reliability =
        (asset.capabilities ?? []).reduce((best, capability) => {
          const reliabilityScore = capability.qualityOfService?.reliability ?? 0;
          return Math.max(best, reliabilityScore);
        }, 0) || 0.97;

      const latencyScore = 1 / Math.max(latency, 1);
      const costScore = 1 / Math.max(cost, 0.1);
      const throughputScore = Math.log10(Math.max(throughput, 1));
      const reliabilityScore = reliability;

      let score = 0;
      score += latencyScore * this.options.latencyWeight;
      score += costScore * this.options.costWeight;
      score += reliabilityScore * this.options.reliabilityWeight;
      score += throughputScore * 0.1;

      if (job.requirements?.maxLatencyMs && latency > job.requirements.maxLatencyMs) {
        score *= 0.5;
        reasoning.push('penalty: exceeds latency requirement');
      }
      if (job.requirements?.budgetPerHour && cost > job.requirements.budgetPerHour) {
        score *= 0.6;
        reasoning.push('penalty: exceeds budget');
      }
      if (job.requirements?.minReliability && reliability < job.requirements.minReliability) {
        score *= 0.4;
        reasoning.push('penalty: below reliability expectation');
      }

      if (job.requirements?.dataSovereignty) {
        const dataRegion = asset.labels?.['data-region'];
        if (dataRegion && job.requirements.dataSovereignty.includes(dataRegion)) {
          score += this.options.complianceWeight;
          reasoning.push(`data sovereignty satisfied by ${dataRegion}`);
        }
      }

      scored.push({
        assetId: asset.id,
        assetName: asset.name,
        score,
        estimatedLatencyMs: latency,
        estimatedCostPerHour: cost,
        compliance,
        reasoning
      });
    }

    if (scored.length === 0) {
      throw new Error('no eligible assets found for job');
    }

    scored.sort((a, b) => b.score - a.score);
    return {
      job,
      primary: scored[0],
      fallbacks: scored.slice(1, 4)
    };
  }
}
