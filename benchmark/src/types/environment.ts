export interface EnvironmentMount {
  source: string;
  target: string;
  readOnly?: boolean;
}

export interface BenchmarkEnvironment {
  envId: string;
  benchmarkVersion: string;
  repoRef?: string;
  repoCommitSha?: string;
  graphSnapshotRef?: string;
  toolBundle: string;
  policyBundle: string;
  sandboxImage: string;
  networkMode: "disabled" | "mocked" | "restricted";
  clockMode: "deterministic" | "system";
  randomSeed: number;
  mounts?: EnvironmentMount[];
  variables?: Record<string, string>;
}
