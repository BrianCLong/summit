import { applyCvesToProfile, collectRelevantCves } from './ingestor.js';
import { computeRiskScore } from './scoring.js';
import {
  AllowlistManifest,
  AllowlistOptions,
  NvdFeed,
  RiskComputationOptions,
  ToolProfileInput,
  ToolRiskProfile,
} from './types.js';
import { AllowlistSigner } from './signer.js';

function profileKey(tool: string, version: string) {
  return `${tool}@${version}`.toLowerCase();
}

export interface ToolRiskRegistryOptions {
  riskComputation?: RiskComputationOptions;
}

export class ToolRiskRegistry {
  private profiles = new Map<string, ToolRiskProfile>();
  private readonly riskOptions: RiskComputationOptions;

  constructor(options: ToolRiskRegistryOptions = {}) {
    this.riskOptions = options.riskComputation ?? {};
  }

  registerTool(input: ToolProfileInput): ToolRiskProfile {
    const key = profileKey(input.tool, input.version);
    const now = new Date().toISOString();
    const profile: ToolRiskProfile = {
      tool: input.tool,
      version: input.version,
      sbomDigest: input.sbomDigest,
      dataAccessScope: input.dataAccessScope,
      networkEgressClasses: [...input.networkEgressClasses],
      cves: [],
      riskScore: 0,
      lastUpdated: now,
    };
    this.profiles.set(key, profile);
    return this.recalculate(profile);
  }

  getProfile(tool: string, version: string): ToolRiskProfile | undefined {
    const key = profileKey(tool, version);
    const profile = this.profiles.get(key);
    return profile
      ? {
          ...profile,
          networkEgressClasses: [...profile.networkEgressClasses],
          cves: [...profile.cves],
        }
      : undefined;
  }

  allProfiles(): ToolRiskProfile[] {
    return Array.from(this.profiles.values()).map((profile) => ({
      ...profile,
      networkEgressClasses: [...profile.networkEgressClasses],
      cves: [...profile.cves],
    }));
  }

  ingestNvdFeed(feed: NvdFeed) {
    for (const profile of this.profiles.values()) {
      const cves = collectRelevantCves(feed, profile.tool);
      const updated = applyCvesToProfile(profile, cves);
      this.recalculate(updated);
    }
  }

  updateProfile(profile: ToolRiskProfile) {
    const key = profileKey(profile.tool, profile.version);
    this.profiles.set(key, this.recalculate(profile));
  }

  private recalculate(profile: ToolRiskProfile): ToolRiskProfile {
    const updated: ToolRiskProfile = {
      ...profile,
      riskScore: computeRiskScore(profile, this.riskOptions),
      lastUpdated: new Date().toISOString(),
    };
    this.profiles.set(profileKey(profile.tool, profile.version), updated);
    return updated;
  }

  generateAllowlistManifest(
    signer: AllowlistSigner,
    options: AllowlistOptions,
  ): AllowlistManifest {
    const include = options.includeTools?.map((tool) => tool.toLowerCase());
    const exclude = new Set(
      options.excludeTools?.map((tool) => tool.toLowerCase()) ?? [],
    );
    const entries = this.allProfiles()
      .filter((profile) => profile.riskScore <= options.riskThreshold)
      .filter((profile) => {
        const toolId = profile.tool.toLowerCase();
        if (exclude.has(toolId)) {
          return false;
        }
        if (!include) {
          return true;
        }
        return include.includes(toolId);
      })
      .map((profile) => ({
        tool: profile.tool,
        version: profile.version,
        riskScore: profile.riskScore,
        sbomDigest: profile.sbomDigest,
        dataAccessScope: profile.dataAccessScope,
        networkEgressClasses: [...profile.networkEgressClasses],
      }))
      .sort((a, b) => {
        const toolCompare = a.tool.localeCompare(b.tool);
        if (toolCompare !== 0) {
          return toolCompare;
        }
        return a.version.localeCompare(b.version);
      });

    const manifestPayload = {
      environment: options.environment,
      entries,
    };
    return signer.sign(manifestPayload);
  }
}
