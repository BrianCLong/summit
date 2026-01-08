import path from "node:path";
import { writeFile } from "node:fs/promises";
import { writeSbom } from "../supply-chain/sbom.js";

export interface ComplianceInputs {
  manifestDir: string;
  outputDir: string;
  policyBundleVersion: string;
  deploymentAttestation: Record<string, unknown>;
}

export async function buildDisclosurePack(inputs: ComplianceInputs): Promise<string> {
  const sbomPath = await writeSbom(inputs.manifestDir, path.join(inputs.outputDir, "artifacts"));
  const packMeta = {
    generatedAt: new Date().toISOString(),
    policyBundleVersion: inputs.policyBundleVersion,
    deploymentAttestation: inputs.deploymentAttestation,
    sbomPath: path.relative(inputs.outputDir, sbomPath),
  };
  const packPath = path.join(inputs.outputDir, "disclosure-pack.json");
  await writeFile(packPath, JSON.stringify(packMeta, null, 2), "utf-8");
  return packPath;
}
