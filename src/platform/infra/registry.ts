export type InfraKind = "module" | "stack" | "consumption";

export interface InfraOwner {
  team: string;
  slack?: string;
  oncall?: string;
}

export interface InfraArtifact {
  kind: InfraKind;
  name: string;
  version: string; // semver for modules/stacks
  owner: InfraOwner;
  inputs_schema_ref?: string; // JSON schema path
  policy_profile?: string; // e.g. "baseline", "restricted"
}

export interface InfraRegistry {
  version: 1;
  artifacts: InfraArtifact[];
}
