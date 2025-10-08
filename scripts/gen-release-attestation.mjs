#!/usr/bin/env node
/**
 * Generate a JSON-LD attestation for the GA release.
 * - Pulls the manifest YAML file, inlines critical hashes + SHAs
 * - Optional signing via cosign/keyless can be layered in CI
 *
 * Usage:
 *   node scripts/gen-release-attestation.mjs --tag=v2025.10.07
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function arg(name) {
  const ix = process.argv.findIndex(a => a.startsWith(`--${name}=`));
  return ix >= 0 ? process.argv[ix].split("=")[1] : null;
}

const TAG = arg("tag") || process.env.TAG || "v" + new Date().toISOString().slice(0,10).replace(/-/g,".");
const distDir = path.join(process.cwd(), "dist");
const manifestPath = path.join(distDir, `release-manifest-${TAG}.yaml`);

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ Manifest not found: ${manifestPath}. Run release:manifest first.`);
  process.exit(1);
}

function yamlToJson(yaml) {
  // extremely small YAML reader for our own format (no sequences-of-sequences tricks)
  // for robustness in CI you can replace with a real YAML lib.
  const lines = yaml.split(/\r?\n/).filter(Boolean);
  const obj = {};
  const stack = [{ indent: -1, obj }];
  for (const line of lines) {
    const indent = line.match(/^ */)[0].length;
    const content = line.trim();
    if (!content || content.startsWith("#")) continue;

    // Pop until we find the parent indentation level
    while (stack.length && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;

    const kv = content.split(":");
    const key = kv.shift().trim();
    const rest = kv.join(":").trim();
    if (rest === "") {
      // nested object
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      let val = rest;
      if (val === "null") val = null;
      else if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (!isNaN(Number(val))) val = Number(val);
      else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1).replace(/\\"/g,'"');
      parent[key] = val;
    }
  }
  return obj;
}

const manifestYaml = fs.readFileSync(manifestPath, "utf8");
const manifest = yamlToJson(manifestYaml);

const attestation = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    {
      "BuildManifest": "https://purl.org/summit/BuildManifest",
      "Artifact": "https://purl.org/summit/Artifact",
      "sha256": "https://schema.org/sha256",
      "commitSha": "https://schema.org/sha256",
      "repository": "https://schema.org/url",
      "releaseVersion": "https://schema.org/version",
      "buildEnv": "https://schema.org/softwareRequirements",
      "evidence": "https://schema.org/MediaObject"
    }
  ],
  "type": ["VerifiableCredential", "BuildManifest"],
  "issuer": {
    "id": "did:web:summit.io",
    "name": "Summit Release Service"
  },
  "issuanceDate": new Date().toISOString(),
  "credentialSubject": {
    "releaseVersion": manifest?.metadata?.release_version,
    "repository": manifest?.artifacts?.tag?.repository,
    "commitSha": manifest?.artifacts?.tag?.commit_sha,
    "buildEnv": manifest?.metadata?.build_env,
    "artifacts": Object.entries(manifest.artifacts || {})
      .filter(([k]) => k !== "tag")
      .map(([k, v]) => ({
        "type": "Artifact",
        "name": k,
        "path": v.path || null,
        "sha256": v.sha256 || null
      })),
    "environment": manifest.environment || {},
    "integrity": manifest.integrity || {}
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": new Date().toISOString(),
    "verificationMethod": "did:web:summit.io#keys-1",
    "proofPurpose": "assertionMethod",
    "jws": ""  // to be filled by a signer (cosign, keyless, or your KMS)
  }
};

const out = path.join(distDir, `release-attestation-${TAG}.jsonld`);
fs.writeFileSync(out, JSON.stringify(attestation, null, 2) + "\n", "utf8");
console.log(`✅ wrote ${path.relative(process.cwd(), out)}`);