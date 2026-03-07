// @ts-nocheck
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import type { AdapterManifest, BundleBuildOptions, BundleBuildResult } from "./types.js";
import { BundleValidationError } from "./types.js";
import { validateCompatibility, validateConfigSchema, validateManifest } from "./validation.js";
import { createDefaultSbom, createDefaultSlsa } from "./metadata.js";
import { hashDirectory, hashFile, readJsonFile, writeJson } from "./fs.js";

export async function buildAdapterBundle(options: BundleBuildOptions): Promise<BundleBuildResult> {
  const {
    manifest,
    compatibility,
    sourceDir,
    configSchemaPath,
    outputDir = "dist",
    sbomPath,
    slsaPath,
    cosignBinary = "cosign",
    signingKeyPath,
  } = options;

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), "adapter-bundle-"));
  const payloadDir = path.join(stagingDir, "payload");

  try {
    await fs.mkdir(payloadDir, { recursive: true });
    await fs.cp(sourceDir, payloadDir, { recursive: true });

    // Validate and write configuration schema
    const configSchema = await readJsonFile(configSchemaPath);
    validateConfigSchema(configSchema);
    const configSchemaFile = path.join(stagingDir, "config.schema.json");
    await writeJson(configSchemaFile, configSchema);

    // Validate and write compatibility
    validateCompatibility(compatibility);
    const compatibilityFile = path.join(stagingDir, "compatibility.json");
    await writeJson(compatibilityFile, compatibility);

    // SBOM
    const sbom = sbomPath
      ? await readJsonFile(sbomPath)
      : createDefaultSbom(manifest, compatibility);
    const sbomFile = path.join(stagingDir, "sbom.json");
    await writeJson(sbomFile, sbom);

    const payloadDigest = await hashDirectory(payloadDir);

    // SLSA
    const slsa = slsaPath
      ? await readJsonFile(slsaPath)
      : createDefaultSlsa(manifest, payloadDigest);
    const slsaFile = path.join(stagingDir, "slsa.json");
    await writeJson(slsaFile, slsa);

    const manifestWithArtifacts: AdapterManifest = {
      ...manifest,
      createdAt: manifest.createdAt ?? new Date().toISOString(),
      compatibility,
      artifacts: {
        payload: "payload",
        sbom: path.basename(sbomFile),
        slsa: path.basename(slsaFile),
        configSchema: path.basename(configSchemaFile),
        compatibility: path.basename(compatibilityFile),
      },
      checksums: {
        payload: payloadDigest,
        sbom: await hashFile(sbomFile),
        slsa: await hashFile(slsaFile),
        configSchema: await hashFile(configSchemaFile),
      },
      metadata: {
        buildHost: os.hostname(),
        ...(manifest.metadata ?? {}),
      },
    };

    validateManifest(manifestWithArtifacts);

    const manifestFile = path.join(stagingDir, "manifest.json");
    await writeJson(manifestFile, manifestWithArtifacts);

    await fs.mkdir(outputDir, { recursive: true });
    const bundleName = `${manifestWithArtifacts.id}-${manifestWithArtifacts.version}.tgz`;
    const bundlePath = path.join(outputDir, bundleName);

    await tar.c({ gzip: true, file: bundlePath, cwd: stagingDir }, ["."]);

    const bundleDigest = await hashFile(bundlePath);
    const signaturePath = `${bundlePath}.sig`;

    const signResult = spawnSync(
      cosignBinary,
      ["sign-blob", "--key", signingKeyPath, "--output-signature", signaturePath, bundlePath],
      { encoding: "utf8" }
    );

    if (signResult.status !== 0) {
      throw new BundleValidationError(
        `Cosign signing failed: ${signResult.stderr || signResult.stdout || signResult.error?.message || "unknown error"}`
      );
    }

    return {
      bundlePath,
      signaturePath,
      manifest: manifestWithArtifacts,
      bundleDigest,
    };
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}
