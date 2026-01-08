import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface SbomComponent {
  name: string;
  version: string;
  type: "library" | "application";
}

export interface SbomDocument {
  tool: string;
  createdAt: string;
  components: SbomComponent[];
  digest: string;
}

export function generateSbom(manifestPath: string): SbomDocument {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
  };
  const components: SbomComponent[] = [
    { name: manifest.name, version: manifest.version, type: "application" },
  ];
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    components.push({ name, version, type: "library" });
  }
  const digest = createHash("sha256").update(JSON.stringify(components)).digest("hex");
  return {
    tool: "golden-path-sbom",
    createdAt: new Date().toISOString(),
    components,
    digest,
  };
}

export async function writeSbom(manifestDir: string, outputDir: string): Promise<string> {
  const sbom = generateSbom(path.join(manifestDir, "package.json"));
  const outputPath = path.join(outputDir, "sbom.json");
  const fs = await import("node:fs/promises");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(sbom, null, 2), "utf-8");
  return outputPath;
}
