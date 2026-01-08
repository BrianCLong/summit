import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { manifestSchema, Manifest } from "./schema.js";

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

async function getFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return createHash("sha256").update(fileBuffer).digest("hex");
}

export async function generateManifest(
  exportDir: string,
  data: { metadata?: Record<string, unknown>; lineage?: Manifest["lineage"] }
): Promise<Manifest> {
  const filePaths = await getFiles(exportDir);
  const files: Manifest["files"] = {};

  for (const filePath of filePaths) {
    const relativePath = path.relative(exportDir, filePath);
    // Skip the manifest file itself
    if (relativePath === "manifest.json") {
      continue;
    }
    const [hash, stats] = await Promise.all([getFileHash(filePath), fs.stat(filePath)]);
    files[relativePath] = { hash, size: stats.size };
  }

  const manifest: Manifest = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    metadata: data.metadata || {},
    files,
    lineage: data.lineage || [],
  };

  manifestSchema.parse(manifest);

  const manifestPath = path.join(exportDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}
