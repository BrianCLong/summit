export type LayerName = 'toolchain' | 'source' | 'deps' | 'env' | 'steps' | 'artifacts';

export interface Layer {
  name: LayerName;
  digest: string;
  meta?: unknown;
}

export interface BuildProof {
  schema: "summit.buildproof/1";
  pkg: string;
  layers: Layer[];
  root: string;
  artifactDigests: Record<string, { digest: string, size: number }>;
  startedAt: string;
  finishedAt: string;
  tool: {
    codex: string;
  };
  sig?: {
    alg: string;
    value: string;
    cert?: string;
  };
}

export interface ArtifactDigest {
  path: string;
  digest: string;
  size: number;
}
