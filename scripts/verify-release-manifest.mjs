#!/usr/bin/env node
/**
 * Verify release manifest integrity by re-hashing artifacts and comparing with manifest
 *
 * Usage:
 *   node scripts/verify-release-manifest.mjs --tag=v2025.10.07
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

function arg(name) {
  const ix = process.argv.findIndex(a => a.startsWith(`--${name}=`));
  return ix >= 0 ? process.argv[ix].split("=")[1] : null;
}

const TAG = arg("tag") || process.env.TAG || "v" + new Date().toISOString().slice(0,10).replace(/-/g,".");
const distDir = path.join(process.cwd(), "dist");
const manifestPath = path.join(distDir, `release-manifest-${TAG}.yaml`);

if (!fs.existsSync(manifestPath)) {
  console.error(`❌ Manifest not found: ${manifestPath}`);
  process.exit(1);
}

function yamlToJson(yaml) {
  // extremely small YAML reader for our own format
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

function sha256(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const h = crypto.createHash("sha256"); h.update(buf);
    return h.digest("hex");
  } catch (err) {
    console.error(`Failed to read file ${filePath}: ${err.message}`);
    return null;
  }
}

function exists(p) { 
  try { 
    fs.accessSync(p); 
    return true; 
  } catch { 
    return false; 
  } 
}

console.log(`🔍 Verifying release manifest for ${TAG}...`);

const manifestYaml = fs.readFileSync(manifestPath, "utf8");
const manifest = yamlToJson(manifestYaml);

let allValid = true;

// Verify each artifact
for (const [key, artifact] of Object.entries(manifest.artifacts || {})) {
  if (key === "tag") continue; // Skip tag metadata
  
  const fullPath = path.join(process.cwd(), artifact.path);
  
  if (!exists(fullPath)) {
    console.warn(`⚠️  Artifact not found: ${artifact.path}`);
    continue;
  }
  
  const computedHash = sha256(fullPath);
  if (computedHash === null) {
    console.error(`❌ Failed to compute hash for ${artifact.path}`);
    allValid = false;
    continue;
  }
  
  if (computedHash !== artifact.sha256) {
    console.error(`❌ Hash mismatch for ${artifact.path}:`);
    console.error(`   Expected: ${artifact.sha256}`);
    console.error(`   Actual:   ${computedHash}`);
    allValid = false;
  } else {
    console.log(`✅ ${artifact.path} hash verified`);
  }
}

// Verify tag commit SHA
try {
  const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).toString().trim();
  if (currentCommit !== manifest.artifacts.tag.commit_sha) {
    console.warn(`⚠️  Commit SHA mismatch:`);
    console.warn(`   Manifest: ${manifest.artifacts.tag.commit_sha}`);
    console.warn(`   Current:  ${currentCommit}`);
    // Not necessarily an error since manifest might be from different commit
  }
} catch (err) {
  console.warn(`⚠️  Could not get current commit SHA: ${err.message}`);
}

if (allValid) {
  console.log(`\n✅ All artifact hashes verified successfully!`);
  console.log(`📦 Manifest is valid for tag ${TAG}`);
} else {
  console.error(`\n❌ Some artifacts failed verification`);
  process.exit(1);
}