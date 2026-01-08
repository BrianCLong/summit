import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../manifest.schema.json"
);
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

/**
 * Minimal manifest validation aligned with the bundled schema. Returns a list of human-readable
 * validation errors instead of throwing.
 * @param {import('./types.js').ManifestDocument} manifest
 * @returns {string[]}
 */
export const validateManifest = (manifest) => {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return ["Manifest must be an object"];
  }
  if (typeof manifest.manifestVersion !== "string") {
    errors.push("manifestVersion is required and must be a string");
  }
  if (typeof manifest.bundleId !== "string") {
    errors.push("bundleId is required and must be a string");
  }
  if (typeof manifest.generatedAt !== "string") {
    errors.push("generatedAt is required and must be a string");
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push("assets array is required with at least one entry");
  } else {
    manifest.assets.forEach((asset, index) => {
      if (typeof asset.id !== "string") {
        errors.push(`assets[${index}].id must be a string`);
      }
      if (typeof asset.path !== "string") {
        errors.push(`assets[${index}].path must be a string`);
      }
      if (typeof asset.sha256 !== "string" || !/^([a-fA-F0-9]{64})$/.test(asset.sha256)) {
        errors.push(`assets[${index}].sha256 must be a 64 character hex string`);
      }
      if (asset.transforms) {
        asset.transforms.forEach((transform, tIndex) => {
          if (typeof transform.input !== "string" || typeof transform.output !== "string") {
            errors.push(`assets[${index}].transforms[${tIndex}] input and output must be strings`);
          }
          if (
            typeof transform.sha256 !== "string" ||
            !/^([a-fA-F0-9]{64})$/.test(transform.sha256)
          ) {
            errors.push(
              `assets[${index}].transforms[${tIndex}].sha256 must be a 64 character hex string`
            );
          }
        });
      }
    });
  }

  if (manifest.evidence) {
    manifest.evidence.forEach((evidence, index) => {
      if (typeof evidence.id !== "string" || typeof evidence.path !== "string") {
        errors.push(`evidence[${index}] must include id and path strings`);
      }
      if (typeof evidence.sha256 !== "string" || !/^([a-fA-F0-9]{64})$/.test(evidence.sha256)) {
        errors.push(`evidence[${index}].sha256 must be a 64 character hex string`);
      }
    });
  }

  if (manifest.disclosure) {
    const { disclosure } = manifest;
    if (!disclosure.audience || typeof disclosure.audience.policyId !== "string") {
      errors.push("disclosure.audience.policyId must be a string");
    }
    if (!disclosure.audience || typeof disclosure.audience.label !== "string") {
      errors.push("disclosure.audience.label must be a string");
    }
    if (!Array.isArray(disclosure.redactions)) {
      errors.push("disclosure.redactions must be an array");
    }
    if (!disclosure.license || typeof disclosure.license.id !== "string") {
      errors.push("disclosure.license.id must be a string");
    }
    if (!disclosure.license || typeof disclosure.license.name !== "string") {
      errors.push("disclosure.license.name must be a string");
    }
  }

  if (manifest.signature) {
    const { signature } = manifest;
    if (!signature.keyId || typeof signature.keyId !== "string") {
      errors.push("signature.keyId must be a string");
    }
    if (!signature.signature || typeof signature.signature !== "string") {
      errors.push("signature.signature must be a string");
    }
  }

  return errors;
};

export { schema };
