#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--evidence-dir") out.dir = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!out.dir) throw new Error("Missing --evidence-dir");
  if (!out.out) throw new Error("Missing --out");
  return out;
}

function sha256File(p) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(p, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    while (true) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      h.update(buf.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return h.digest("hex");
}

function listFilesRecursive(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    const ents = fs.readdirSync(d, { withFileTypes: true })
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const args = parseArgs(process.argv);
const root = path.resolve(args.dir);

const exclude = new Set([
  path.resolve(args.out),
  path.resolve(path.join(root, "bundle.sha256")),
  path.resolve(path.join(root, "bundle.sha256.sigstore.json"))
]);

const files = listFilesRecursive(root)
  .filter((p) => !exclude.has(path.resolve(p)));

const artifacts = files.map((p) => {
  const st = fs.statSync(p);
  const rel = path.relative(root, p).replace(/\\/g, "/");
  return {
    path: rel,
    sha256: sha256File(p),
    bytes: st.size
  };
});

const manifest = {
  manifestVersion: "1.0",
  repository: process.env.GITHUB_REPOSITORY || "",
  sha: process.env.GITHUB_SHA || "",
  ref: process.env.GITHUB_REF || "",
  workflow: process.env.GITHUB_WORKFLOW || "",
  artifacts
};

fs.writeFileSync(args.out, JSON.stringify(manifest, null, 2));
