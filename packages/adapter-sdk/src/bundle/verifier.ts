// @ts-nocheck
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import semver from "semver";
import type {
  AdapterCompatibilityMatrix,
  AdapterManifest,
  BundleVerificationOptions,
  BundleVerificationResult,
} from "./types.js";
import { BundleValidationError } from "./types.js";
import { validateCompatibility, validateConfigSchema, validateManifest } from "./validation.js";
import { hashDirectory, hashFile, readJsonFile } from "./fs.js";

async function ensureFileExists(filePath: string, label: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new BundleValidationError(`${label} is missing at ${filePath}`);
  }
}

function assertCompatibleRuntime(
  compatibility: AdapterCompatibilityMatrix,
  expectedSdkVersion: string,
  allowPrerelease = false
): string {
  const sdkVersion = semver.coerce(expectedSdkVersion);
  if (!sdkVersion) {
    throw new BundleValidationError(`Invalid SDK version: ${expectedSdkVersion}`);
  }

  const minVersion = semver.coerce(compatibility.sdk.min);
  if (!minVersion) {
    throw new BundleValidationError(
      `Invalid compatibility sdk.min value: ${compatibility.sdk.min}`
    );
  }

  const maxVersion = compatibility.sdk.max ? semver.coerce(compatibility.sdk.max) : undefined;
  if (compatibility.sdk.max && !maxVersion) {
    throw new BundleValidationError(
      `Invalid compatibility sdk.max value: ${compatibility.sdk.max}`
    );
  }

  const minOk = semver.gte(sdkVersion, minVersion, {
    includePrerelease: allowPrerelease,
  } as any);
  const maxOk = !maxVersion
    ? true
    : semver.lte(sdkVersion, maxVersion, {
        includePrerelease: allowPrerelease,
      } as any);

  if (!minOk || !maxOk) {
    throw new BundleValidationError(
      `Adapter is incompatible with SDK ${sdkVersion.version} (required ${compatibility.sdk.min}${
        compatibility.sdk.max ? ` - ${compatibility.sdk.max}` : "+"
      })`
    );
  }

  const runtimeMatch = compatibility.runtimes.find(
    (runtime) =>
      (runtime.os === "any" || runtime.os === process.platform) &&
      (runtime.arch === "any" || runtime.arch === process.arch) &&
      semver.satisfies(process.versions.node, runtime.node, {
        includePrerelease: allowPrerelease,
      } as any)
  );

  if (!runtimeMatch) {
    throw new BundleValidationError(
      `Adapter does not support current runtime ${process.platform}/${process.arch} (node ${process.versions.node})`
    );
  }

  return `Runtime satisfied for ${runtimeMatch.os}/${runtimeMatch.arch} with node ${runtimeMatch.node}`;
}

async function verifyChecksums(manifest: AdapterManifest, root: string): Promise<void> {
  const payloadDigest = await hashDirectory(path.join(root, manifest.artifacts.payload));
  if (payloadDigest !== manifest.checksums.payload) {
    throw new BundleValidationError(
      `Payload checksum mismatch (expected ${manifest.checksums.payload}, got ${payloadDigest})`
    );
  }

  const sbomDigest = await hashFile(path.join(root, manifest.artifacts.sbom));
  if (sbomDigest !== manifest.checksums.sbom) {
    throw new BundleValidationError("SBOM checksum mismatch");
  }

  const slsaDigest = await hashFile(path.join(root, manifest.artifacts.slsa));
  if (slsaDigest !== manifest.checksums.slsa) {
    throw new BundleValidationError("SLSA attestation checksum mismatch");
  }

  const configDigest = await hashFile(path.join(root, manifest.artifacts.configSchema));
  if (configDigest !== manifest.checksums.configSchema) {
    throw new BundleValidationError("Config schema checksum mismatch");
  }
}

export async function verifyAdapterBundle(
  options: BundleVerificationOptions
): Promise<BundleVerificationResult> {
  const {
    bundlePath,
    signaturePath,
    publicKeyPath,
    expectedSdkVersion,
    cosignBinary = "cosign",
    allowPrerelease = false,
  } = options;

  await ensureFileExists(bundlePath, "Bundle");
  await ensureFileExists(signaturePath, "Signature");
  await ensureFileExists(publicKeyPath, "Public key");

  const verifyResult = spawnSync(
    cosignBinary,
    ["verify-blob", "--key", publicKeyPath, "--signature", signaturePath, bundlePath],
    { encoding: "utf8" }
  );

  if (verifyResult.status !== 0) {
    throw new BundleValidationError(
      `Cosign verification failed: ${verifyResult.stderr || verifyResult.stdout || verifyResult.error?.message || "unknown error"}`
    );
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "adapter-verify-"));
  try {
    await tar.x({ file: bundlePath, cwd: tempDir });

    const manifestPath = path.join(tempDir, "manifest.json");
    const manifest = await readJsonFile<AdapterManifest>(manifestPath);
    validateManifest(manifest);

    const compatibilityPath = path.join(tempDir, manifest.artifacts.compatibility);
    const configSchemaPath = path.join(tempDir, manifest.artifacts.configSchema);

    const compatibility = await readJsonFile<AdapterCompatibilityMatrix>(compatibilityPath);
    validateCompatibility(compatibility);

    const configSchema = await readJsonFile(configSchemaPath);
    validateConfigSchema(configSchema);

    if (JSON.stringify(manifest.compatibility) !== JSON.stringify(compatibility)) {
      throw new BundleValidationError("Manifest compatibility does not match compatibility.json");
    }

    await verifyChecksums(manifest, tempDir);
    const runtimeMessage = assertCompatibleRuntime(
      compatibility,
      expectedSdkVersion,
      allowPrerelease
    );

    const bundleDigest = await hashFile(bundlePath);

    return {
      verified: true,
      manifest,
      compatibility,
      bundleDigest,
      diagnostics: [
        runtimeMessage,
        `Signature validated via ${cosignBinary}`,
        `Bundle hash ${bundleDigest}`,
      ],
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
