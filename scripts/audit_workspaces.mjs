#!/usr/bin/env node
/* Audits monorepo health:
 * - Ensures every workspace has package.json + build script
 * - Checks TS presence, local tsconfig, and project ref alignment
 * - Builds a package graph from internal deps and detects cycles
 * - Validates "exports"/"main"/"types" existence when TS is present
 */
import fs from "fs/promises";
import path from "path";

// Strict mode: fail CI only on repo-breaking issues
// Usage: node scripts/audit_workspaces.mjs --strict
const STRICT = process.argv.includes("--strict");

const ROOT = process.cwd();
const ROOT_TSCONFIG = path.join(ROOT, "tsconfig.json");
const GROUPS = ["apps", "packages", "services", "contracts"];

let fatalIssues = 0;   // cycles + missing tsconfig for TS packages
let softIssues  = 0;   // missing build script, exports cosmetics, etc.
const ok = (m)=>console.log("✓", m);
const warn = (m)=>{ console.warn("⚠️", m); softIssues++; };
const err  = (m)=>{ console.error("❌", m); fatalIssues++; };

async function exists(p){ try{ await fs.access(p); return true; }catch{ return false; } }

async function discover() {
  const workspaces = [];
  for (const g of GROUPS) {
    const gdir = path.join(ROOT, g);
    if (!(await exists(gdir))) continue;
    for (const name of await fs.readdir(gdir)) {
      const dir = path.join(gdir, name);
      if (!(await exists(path.join(dir, "package.json")))) continue;
      workspaces.push({ group: g, name, dir });
    }
  }
  return workspaces;
}

async function hasTsSources(dir) {
  const src = path.join(dir, "src");
  if (!(await exists(src))) return false;
  for (const f of await fs.readdir(src)) if (f.endsWith(".ts") || f.endsWith(".tsx")) return true;
  return false;
}

async function readJSON(p){ return JSON.parse(await fs.readFile(p, "utf8")); }

function internalNameSet(ws){ return new Set(ws.map(w => JSON.parse(w.pkgJsonRaw).name).filter(Boolean)); }

function depKeys(pj){
  return Object.assign({}, pj.dependencies, pj.devDependencies, pj.peerDependencies);
}

function cycleDetect(graph) {
  const visited = new Set(), stack = new Set(); const cycles = [];
  function dfs(n, pathArr=[]) {
    if (stack.has(n)) { cycles.push([...pathArr, n]); return; }
    if (visited.has(n)) return;
    visited.add(n); stack.add(n);
    for (const m of (graph.get(n)||[])) dfs(m, [...pathArr, n]);
    stack.delete(n);
  }
  for (const n of graph.keys()) dfs(n);
  return cycles;
}

(async () => {
  const hasRootTs = await exists(ROOT_TSCONFIG);
  if (!hasRootTs) warn("Root tsconfig.json missing (project references recommended).");

  const ws = await discover();
  if (ws.length === 0) { err("No workspaces discovered."); process.exit(1); }

  // attach package.json + quick facts
  for (const w of ws) {
    const pjPath = path.join(w.dir, "package.json");
    w.pkgJsonRaw = await fs.readFile(pjPath, "utf8");
    w.pj = JSON.parse(w.pkgJsonRaw);
    w.name = w.pj.name || `${w.group}/${path.basename(w.dir)}`;
    w.hasBuild = !!(w.pj.scripts && w.pj.scripts.build);
    w.hasTs = await hasTsSources(w.dir);
    w.tsconfig = path.join(w.dir, "tsconfig.json");
    w.hasTsconfig = await exists(w.tsconfig);
    w.main = w.pj.main;
    w.types = w.pj.types;
    w.exports = w.pj.exports;
  }

  // checks
  let issues = 0;
  for (const w of ws) {
    if (!w.hasBuild) { warn(`[${w.name}] missing "build" script`); }
    if (w.hasTs && !w.hasTsconfig) { err(`[${w.name}] TS sources but no local tsconfig.json`); }
    if (w.hasTs && (!w.main || !w.types)) { warn(`[${w.name}] TS package should set "main"/"types"`); }
    if (w.exports && typeof w.exports === "object" && !w.exports["."] && !w.exports.default) {
      warn(`[${w.name}] "exports" exists but missing "." or default entry`);
    }
  }

  // internal dep graph
  const internal = internalNameSet(ws);
  const graph = new Map();
  for (const w of ws) {
    const deps = Object.keys(depKeys(w.pj) || {});
    graph.set(w.pj.name, deps.filter(d => internal.has(d)));
  }
  const cycles = cycleDetect(graph);
  if (cycles.length) {
    for (const c of cycles) err(`Cycle detected: ${c.join(" -> ")}`);
  } else {
    ok("No internal dependency cycles detected.");
  }

  // tsconfig reference sanity (best-effort)
  if (hasRootTs) {
    try {
      const rootTs = await readJSON(ROOT_TSCONFIG);
      const refs = (rootTs.references || []).map(r => r.path);
      for (const g of GROUPS) {
        const expected = `./${g}/*`;
        if (!refs.some(r => r.includes(expected.replace("./",""))))
          warn(`Root tsconfig.json missing reference: ${expected}`);
      }
    } catch { warn("Could not parse root tsconfig.json for references."); }
  }

  // exit code for CI
  console.log(`\nAudit complete: ${issues ? "issues found" : "clean"}`);
  process.exit(issues ? 2 : 0);
})();
