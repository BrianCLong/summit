#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [,, inDir = "./shards", outDir = "./artifacts-merged"] = process.argv;

fs.mkdirSync(outDir, { recursive: true });

function safeLstat(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

const isSymlink = (p) => {
  const st = safeLstat(p);
  return st ? st.isSymbolicLink() : false;
};

const isDirectory = (p) => {
  const st = safeLstat(p);
  return st ? st.isDirectory() : false;
};

function safeReadFile(p) {
  if (!fs.existsSync(p)) return null;
  if (isSymlink(p)) throw new Error(`Refusing symlink: ${p}`);
  return fs.readFileSync(p, "utf8");
}

function listShardDirs(root) {
  return fs
    .readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((p) => isDirectory(p))
    .sort(); // deterministic order
}

function mergeJUnit() {
  const shardDirs = listShardDirs(inDir);
  const junitFiles = [];

  for (const shardDir of shardDirs) {
    const p = path.join(shardDir, "artifacts", "junit.xml");
    if (fs.existsSync(p) && !isSymlink(p)) junitFiles.push(p);
  }

  const header = `<?xml version="1.0" encoding="UTF-8"?><testsuites>`;
  const footer = `</testsuites>`;
  let body = "";

  for (const f of junitFiles) {
    const xml = safeReadFile(f);
    if (!xml) continue;
    body += xml
      .replace(/^<\?xml.*?\?>/g, "")
      .replace(/<\/?testsuites>/g, "")
      .trim();
  }

  fs.writeFileSync(path.join(outDir, "junit-merged.xml"), header + body + footer);
  return junitFiles.length;
}

function mergeCoverage() {
  const shardDirs = listShardDirs(inDir);
  const lcovs = [];

  for (const shardDir of shardDirs) {
    const p = path.join(shardDir, "artifacts", "coverage", "lcov.info");
    if (fs.existsSync(p) && !isSymlink(p)) lcovs.push(p);
  }

  if (lcovs.length) {
    const out = path.join(outDir, "lcov-merged.info");
    const contents = lcovs.map((f) => safeReadFile(f) ?? "").join("\n");
    fs.writeFileSync(out, contents);
    return { mode: "lcov", count: lcovs.length };
  }

  for (const shardDir of shardDirs) {
    const cov = path.join(shardDir, "artifacts", "coverage");
    if (fs.existsSync(cov) && !isSymlink(cov) && isDirectory(cov)) {
      fs.cpSync(cov, path.join(outDir, "coverage"), { recursive: true });
      return { mode: "dir", count: 1 };
    }
  }

  return { mode: "none", count: 0 };
}

const junitCount = mergeJUnit();
const cov = mergeCoverage();

const summary = {
  expectedShards: Number(process.env.SHARD_TOTAL ?? 0) || null,
  junitFilesMerged: junitCount,
  coverage: cov,
};

fs.writeFileSync(
  path.join(outDir, "summary.json"),
  JSON.stringify(summary, null, 2),
);

console.log(JSON.stringify(summary));
