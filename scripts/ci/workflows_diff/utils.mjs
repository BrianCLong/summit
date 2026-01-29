import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

export function listYamlFiles(root) {
  return fs.readdirSync(root)
    .filter(f => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map(f => path.join(root, f));
}

export function readYaml(file) {
  return yaml.parse(fs.readFileSync(file, "utf8"));
}

export function explodeMatrix(matrix) {
  // Approximate expansion size; supports include/exclude minimally.
  if (!matrix || typeof matrix !== "object") return 1;
  const keys = Object.keys(matrix).filter(k => !["include","exclude"].includes(k));
  const sizes = keys.map(k => Array.isArray(matrix[k]) ? matrix[k].length : 1);
  const base = sizes.reduce((a,b)=>a*b,1) || 1;
  const inc = Array.isArray(matrix.include) ? matrix.include.length : 0;
  const exc = Array.isArray(matrix.exclude) ? matrix.exclude.length : 0;
  return Math.max(1, base + inc - exc);
}

export function hasConcurrency(workflow) {
  if (workflow?.concurrency) return true;
  if (workflow?.jobs) {
    return Object.values(workflow.jobs).some(j => j?.concurrency);
  }
  return false;
}
