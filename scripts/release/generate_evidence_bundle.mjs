#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const outIdx = process.argv.indexOf('--out');
if (outIdx === -1) throw new Error('Missing --out');
const OUT = process.argv[outIdx + 1];

const compare = (a,b)=> (a<b?-1:a>b?1:0);
const sha256 = (buf)=> crypto.createHash('sha256').update(buf).digest('hex');

fs.mkdirSync(OUT, { recursive: true });

const artifactsDir = 'dist';
const files = [];
const walk = (d)=>{
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(artifactsDir);

files.sort(compare);

const evidenceMap = {};
for (const f of files) {
  const buf = fs.readFileSync(f);
  const id = `artifact:${f.replace(/\\/g,'/')}`;
  const rel = path.relative(OUT, f);
  // Ensure the destination directory exists
  // We need to be careful with relative paths.
  // If f is "dist/file.txt" and OUT is ".ga/evidence"
  // rel will be "../../dist/file.txt".
  // copying using rel as destination inside OUT is wrong if we want to bundle it INTO OUT.

  // The original script:
  // fs.copyFileSync(f, path.join(OUT, rel));
  // This implies the structure inside OUT should mirror the relative path?
  // If OUT is ".ga/evidence", and f is "dist/foo.js".
  // path.join(OUT, rel) -> ".ga/evidence/../../dist/foo.js" -> "dist/foo.js".
  // This would try to copy the file to itself or fail.

  // The intent of an evidence bundle is usually to copy the artifacts INTO the bundle folder.
  // So we probably want to preserve the structure relative to 'dist'.

  const relToDist = path.relative(artifactsDir, f);
  const destPath = path.join(OUT, relToDist);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(f, destPath);

  // The map should point to the file INSIDE the bundle.
  // evidenceMap[id] = { path: relToDist, sha256: sha256(buf) };
  // But the original script used `rel`.

  // Let's look at the original script again provided by the user.
  /*
  const rel = path.relative(OUT, f);
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.copyFileSync(f, path.join(OUT, rel));
  evidenceMap[id] = { path: rel, sha256: sha256(buf) };
  */

  // If OUT is ".ga/evidence" (depth 2) and f is "dist/foo" (depth 1).
  // rel is "../../dist/foo".
  // path.join(OUT, rel) is ".ga/evidence/../../dist/foo" which resolves to "dist/foo".
  // So it copies "dist/foo" to "dist/foo". This is a no-op or error if file is open.

  // I think the user's script has a bug in `rel` calculation or assumes OUT is a sibling of `dist`?
  // Even if they are siblings: OUT="evidence", f="dist/foo". rel="../dist/foo".
  // join(OUT, rel) -> "evidence/../dist/foo" -> "dist/foo".

  // I will fix this to copy content of `dist` INTO `OUT`.

  evidenceMap[id] = { path: relToDist, sha256: sha256(buf) };
}

fs.writeFileSync(path.join(OUT, 'evidence-map.json'),
  JSON.stringify(Object.fromEntries(Object.entries(evidenceMap).sort((a,b)=>compare(a[0],b[0]))), null, 2)
);

// runtime metadata isolated
fs.writeFileSync(path.join(OUT, 'stamp.json'),
  JSON.stringify({ generated: 'runtime-only' }, null, 2)
);
