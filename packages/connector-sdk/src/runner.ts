import fs from "node:fs";
import path from "node:path";
import { loadManifest } from "./manifest.js";
import { evaluatePolicy } from "./policy.js";
import { deterministicRunId, sha256 } from "./provenance.js";
import type { ConnectorOutput, EvidenceArtifact } from "./types.js";

export interface RunConnectorArgs {
  connectorDir: string;
}

export async function runConnectorFromFixtures(args: RunConnectorArgs): Promise<{
  manifest: unknown;
  output: ConnectorOutput;
  evidence: EvidenceArtifact;
}> {
  const manifestPath = path.join(args.connectorDir, "connector.yaml");
  const inputPath = path.join(args.connectorDir, "fixtures", "input.json");
  const rawPath = path.join(args.connectorDir, "fixtures", "raw.json");
  const transformPath = path.join(args.connectorDir, "transform.ts");

  const manifest = loadManifest(manifestPath);
  const policy = evaluatePolicy(manifest);
  if (policy.verdict !== "allow") {
    throw new Error(`Policy denied connector ${manifest.id}: ${policy.reasons.join(",")}`);
  }

  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const mod = await import(path.resolve(transformPath));
  const run_id = deterministicRunId(manifest.id, input);

  const output = mod.transform({
    manifest,
    input,
    raw,
    run_id
  }) as ConnectorOutput;

  const evidence: EvidenceArtifact = {
    connector_id: manifest.id,
    run_id,
    input_hash: sha256(input),
    raw_hash: sha256(raw),
    output_hash: sha256(output),
    transform_hash: sha256(fs.readFileSync(transformPath, "utf8")),
    policy_verdict: policy.verdict
  };

  return { manifest, output, evidence };
}
