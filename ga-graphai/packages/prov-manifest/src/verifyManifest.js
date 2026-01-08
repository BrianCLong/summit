import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { validateManifest } from "./schema.js";
import { verifyManifestSignature } from "./signature.js";

const normalizePath = (bundlePath, relativePath) => {
  const resolved = path.resolve(bundlePath, relativePath);
  const base = path.resolve(bundlePath);
  const safePrefix = `${base}${path.sep}`;
  if (resolved !== base && !resolved.startsWith(safePrefix)) {
    throw new Error("path-traversal");
  }
  return resolved;
};

const computeHash = async (filePath) => {
  const data = await fs.readFile(filePath);
  const hash = createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
};

const checkFile = async (bundlePath, relativePath, expectedHash, issues) => {
  try {
    const resolved = normalizePath(bundlePath, relativePath);
    if (!existsSync(resolved)) {
      issues.push({
        code: "missing-file",
        target: relativePath,
        message: `Referenced file is missing: ${relativePath}`,
      });
      return false;
    }
    const digest = await computeHash(resolved);
    if (digest !== expectedHash) {
      issues.push({
        code: "hash-mismatch",
        target: relativePath,
        message: `Hash mismatch for ${relativePath}. expected ${expectedHash} got ${digest}`,
      });
      return false;
    }
    return true;
  } catch (error) {
    if (error.message === "path-traversal") {
      issues.push({
        code: "path-traversal",
        target: relativePath,
        message: `Illegal path detected: ${relativePath}`,
      });
      return false;
    }
    throw error;
  }
};

const verifyTransforms = async (bundlePath, asset, issues) => {
  if (!asset.transforms || asset.transforms.length === 0) {
    return 0;
  }

  let chainPointer = asset.path;
  let checked = 0;

  for (const transform of asset.transforms) {
    if (transform.input !== chainPointer) {
      issues.push({
        code: "transform-link-broken",
        target: transform.input,
        message: `Transform input ${transform.input} does not match previous output ${chainPointer}`,
      });
      chainPointer = transform.output;
      continue;
    }

    const ok = await checkFile(bundlePath, transform.output, transform.sha256, issues);
    if (!ok) {
      issues.push({
        code: "transform-link-broken",
        target: transform.output,
        message: `Transform output ${transform.output} failed verification`,
      });
    }
    chainPointer = transform.output;
    checked += 1;
  }

  return checked;
};

export const verifyManifest = async (bundlePath) => {
  const manifestPath = path.join(bundlePath, "manifest.json");
  const signaturePath = path.join(bundlePath, "signature.json");
  const issues = [];
  let manifest;

  if (!existsSync(manifestPath)) {
    return {
      manifestVersion: "unknown",
      valid: false,
      issues: [
        {
          code: "missing-file",
          target: "manifest.json",
          message: "manifest.json not found in bundle",
        },
      ],
      checkedFiles: 0,
    };
  }

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(raw);
  } catch {
    issues.push({
      code: "schema-invalid",
      target: "manifest.json",
      message: "manifest.json is not valid JSON",
    });
    return {
      manifestVersion: "unknown",
      valid: false,
      issues,
      checkedFiles: 0,
    };
  }

  const validationErrors = validateManifest(manifest);
  if (validationErrors.length > 0) {
    issues.push({
      code: "schema-invalid",
      target: "manifest.json",
      message: validationErrors.join("; "),
    });
  }

  let checkedFiles = 0;

  if (manifest.assets) {
    for (const asset of manifest.assets) {
      const assetOk = await checkFile(bundlePath, asset.path, asset.sha256, issues);
      if (assetOk) {
        checkedFiles += 1;
      }
      checkedFiles += await verifyTransforms(bundlePath, asset, issues);

      if (asset.evidence && manifest.evidence) {
        for (const evidenceId of asset.evidence) {
          const evidence = manifest.evidence.find((item) => item.id === evidenceId);
          if (!evidence) {
            issues.push({
              code: "evidence-missing",
              target: evidenceId,
              message: `Evidence ${evidenceId} referenced by ${asset.id} not found`,
            });
            continue;
          }
          const ok = await checkFile(bundlePath, evidence.path, evidence.sha256, issues);
          if (ok) {
            checkedFiles += 1;
          }
        }
      }
    }
  }

  let signature;
  if (existsSync(signaturePath)) {
    try {
      const rawSignature = await fs.readFile(signaturePath, "utf8");
      const signatureFile = JSON.parse(rawSignature);
      const { valid: signatureValid, reason } = verifyManifestSignature(manifest, signatureFile);
      if (!signatureValid) {
        issues.push({
          code: "signature-invalid",
          target: "signature.json",
          message: reason ?? "Signature invalid",
        });
      }
      signature = {
        valid: signatureValid,
        keyId: signatureFile.signature?.keyId,
        algorithm: signatureFile.signature?.algorithm,
        signedAt: signatureFile.signature?.signedAt,
        manifestHash: signatureFile.manifestHash,
        reason,
      };
    } catch (error) {
      issues.push({
        code: "signature-invalid",
        target: "signature.json",
        message: `Signature file invalid JSON: ${error.message}`,
      });
      signature = { valid: false, reason: "Signature file invalid JSON" };
    }
  }

  const valid = issues.length === 0;
  return {
    manifestVersion: manifest.manifestVersion,
    valid,
    issues,
    checkedFiles,
    signature,
  };
};

export const readManifest = async (bundlePath) => {
  const manifestPath = path.join(bundlePath, "manifest.json");
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  const raw = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(raw);
};

export const toReportJson = (report) => JSON.stringify(report, null, 2);
