// @ts-nocheck
import fs from "fs-extra";
import path from "node:path";
import { loadAdapterModule, resolveEntry } from "./adapter-loader.js";
import { PackageOptions, PackageResult } from "./types.js";

interface AdapterManifest {
  name: string;
  version: string;
  description?: string;
  entry: string;
  contract: string;
  builtAt: string;
}

export async function createAdapterPackage(options: PackageOptions): Promise<PackageResult> {
  const entryPath = await resolveEntry(options.entry);
  const adapter = await loadAdapterModule(entryPath);
  const outputDir = path.isAbsolute(options.outputDir ?? "")
    ? (options.outputDir ?? "artifacts")
    : path.resolve(process.cwd(), options.outputDir ?? "artifacts");
  const bundleName = adapter.metadata.name.replace(/\s+/g, "-").toLowerCase();
  const bundlePath = path.join(outputDir, `${bundleName}-bundle`);

  await fs.ensureDir(bundlePath);
  await fs.copy(entryPath, path.join(bundlePath, path.basename(entryPath)));

  const manifest: AdapterManifest = {
    name: adapter.metadata.name,
    version: adapter.metadata.version,
    description: adapter.metadata.description,
    entry: path.basename(entryPath),
    contract: "basic-webhook",
    builtAt: new Date().toISOString(),
  };

  const manifestName = options.manifestName ?? "adapter-manifest.json";
  const manifestPath = path.join(bundlePath, manifestName);
  await fs.writeJSON(manifestPath, manifest, { spaces: 2 });

  return { manifestPath, bundlePath };
}
