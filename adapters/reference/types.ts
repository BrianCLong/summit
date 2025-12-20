export interface AdapterManifest {
  name: string;
  title: string;
  version: string;
  description: string;
  maintainer: string;
  tags?: string[];
}

export interface AdapterCapability {
  id: string;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  configUses?: string[];
  guarantees?: {
    slaMsP99?: number;
    durability?: string;
    auth?: string;
  };
}

export interface AdapterFixtures {
  config: Record<string, unknown>;
  samples?: Record<string, unknown>;
}

export interface ReferenceAdapterDefinition {
  manifest: AdapterManifest;
  configSchema: Record<string, unknown>;
  capabilities: AdapterCapability[];
  fixtures: AdapterFixtures;
}
