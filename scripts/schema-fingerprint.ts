import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { glob } from "glob";

import { DEFAULT_IGNORES, loadSchemaRegistries, SchemaRegistry } from "./schema-registry.js";

export interface FingerprintedFile {
  path: string;
  hash: string;
  bytes: number;
}

export interface SchemaLayerFingerprint {
  name: string;
  files: FingerprintedFile[];
  layerHash: string;
}

export interface SchemaFingerprint {
  version: number;
  generatedAt: string;
  layers: SchemaLayerFingerprint[];
  compositeHash: string;
}

function stableHash(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

async function hashFile(rootDir: string, filePath: string): Promise<FingerprintedFile> {
  const absolutePath = path.resolve(rootDir, filePath);
  const buffer = await fs.readFile(absolutePath);

  return {
    path: filePath,
    hash: stableHash(buffer.toString("utf8")),
    bytes: buffer.byteLength,
  };
}

async function collectFiles(rootDir: string, patterns: string[]): Promise<string[]> {
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      ignore: DEFAULT_IGNORES,
      posix: true,
    });
    matches.forEach((match) => seen.add(match));
  }

  return Array.from(seen).sort();
}

async function fingerprintLayer(
  rootDir: string,
  registry: SchemaRegistry
): Promise<SchemaLayerFingerprint> {
  const files = await collectFiles(rootDir, registry.schemaGlobs);
  const hashed = await Promise.all(files.map((filePath) => hashFile(rootDir, filePath)));
  const layerHash = stableHash(
    hashed.map((file) => `${file.path}:${file.hash}:${file.bytes}`).join("|")
  );

  return { name: registry.name, files: hashed, layerHash };
}

export async function computeSchemaFingerprint(
  rootDir = process.cwd()
): Promise<SchemaFingerprint> {
  const registries = await loadSchemaRegistries();
  const layers: SchemaLayerFingerprint[] = [];

  for (const registry of registries) {
    const layer = await fingerprintLayer(rootDir, registry);
    layers.push(layer);
  }

  const compositeHash = stableHash(
    layers.map((layer) => `${layer.name}:${layer.layerHash}`).join("|")
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    layers,
    compositeHash,
  };
}

function resolveOutputPath(tag?: string): string {
  const fileName = `${tag ?? "latest"}.json`;
  return path.resolve(process.cwd(), "schema-fingerprints", fileName);
}

function parseArgs(argv: string[]): { write?: string; pretty?: boolean } {
  const options: { write?: string; pretty?: boolean } = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];

    if (current === "--write" || current === "-w") {
      options.write = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[i + 1] : "latest";
    }

    if (current === "--pretty") {
      options.pretty = true;
    }
  }

  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fingerprint = await computeSchemaFingerprint(process.cwd());

  if (args.write) {
    const outputPath = resolveOutputPath(args.write);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(fingerprint, null, args.pretty ? 2 : 0));
    console.log(`Schema fingerprint written to ${path.relative(process.cwd(), outputPath)}`);
  } else {
    console.log(JSON.stringify(fingerprint, null, args.pretty ? 2 : 0));
  }
}

main().catch((error) => {
  console.error("Failed to compute schema fingerprint:", error);
  process.exitCode = 1;
});
