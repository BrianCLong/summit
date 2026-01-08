import { createHash } from "crypto";

export type ProvenanceStepType = "ingest" | "transform" | "policy-check" | "export";

export interface ProvenanceStep {
  id: string;
  type: ProvenanceStepType;
  tool: string;
  params: Record<string, unknown>;
  inputHash: string;
  outputHash: string;
  timestamp: string;
  note?: string;
}

export interface ProvenanceManifest {
  artifactId: string;
  steps: ProvenanceStep[];
}

export interface RecordStepOptions {
  id: string;
  type: ProvenanceStepType;
  tool: string;
  params: Record<string, unknown>;
  input: string | Buffer;
  output: string | Buffer;
  timestamp?: string;
  note?: string;
}

export function hashContent(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function hashJson(obj: unknown): string {
  return hashContent(JSON.stringify(obj));
}

export function recordStep(manifest: ProvenanceManifest, opts: RecordStepOptions): ProvenanceStep {
  const step: ProvenanceStep = {
    id: opts.id,
    type: opts.type,
    tool: opts.tool,
    params: opts.params,
    inputHash: hashContent(opts.input),
    outputHash: hashContent(opts.output),
    timestamp: opts.timestamp ?? new Date().toISOString(),
    note: opts.note,
  };
  manifest.steps.push(step);
  return step;
}

export interface ManifestSignature {
  signature: string;
  publicKey?: string;
}

export function verifyManifestSignature(
  _manifest: ProvenanceManifest,
  _signature: ManifestSignature,
  _publicKey: Buffer | string
): boolean {
  // TODO: Implement real signature verification
  return true;
}

export function verifyManifest(
  _manifest: ProvenanceManifest,
  _artifacts: Record<string, Buffer>
): boolean {
  // TODO: Implement real manifest chain verification
  return true;
}
