export interface ToolDescriptor {
  name: string;
  version: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface ToolTrace {
  toolName: string;
  input: unknown;
  output: unknown;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface ArtifactMetadata {
  model: string;
  parameters: Record<string, unknown>;
  tools: ToolDescriptor[];
}

export interface ArtifactInput {
  templateId: string;
  promptTemplate: string;
  inputs: Record<string, unknown>;
  toolTraces: ToolTrace[];
  output: string;
  policyTags: string[];
  metadata: ArtifactMetadata;
}

export interface SparArtifact extends ArtifactInput {
  id: string;
  version: number;
  hash: string;
  signerId: string;
  signature: string;
  createdAt: string;
}

export interface SparManifest {
  schemaVersion: string;
  artifactId: string;
  templateId: string;
  version: number;
  hash: string;
  signerId: string;
  signature: string;
  createdAt: string;
  promptTemplate: string;
  inputs: Record<string, unknown>;
  toolTraces: ToolTrace[];
  output: string;
  policyTags: string[];
  metadata: ArtifactMetadata;
}

export interface Signer {
  id: string;
  sign(payload: string): string;
  verify(payload: string, signature: string): boolean;
}

export interface DiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

export interface ReplayResult {
  canonical: string;
  hash: string;
  manifest: SparManifest;
}
