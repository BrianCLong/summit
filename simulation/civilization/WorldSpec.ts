export interface PolicyBundleRef {
  id: string;
}

export interface RegionSpec {
  id: string;
}

export interface AgentSpec {
  id: string;
}

export interface WorldSpec {
  seed: string;
  ticks: number;
  regions: RegionSpec[];
  agents: AgentSpec[];
  policies: PolicyBundleRef[];
}

export interface WorldRunArtifacts {
  reportPath: string;
  metricsPath: string;
  stampPath: string;
}
