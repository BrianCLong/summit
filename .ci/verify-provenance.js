#!/usr/bin/env node
const fs = require("fs");
const crypto = require("crypto");

const path = process.argv[2] || "provenance.json";
const p = JSON.parse(fs.readFileSync(path, "utf8"));
let ok = true;

for (const a of p.artifacts) {
  if (!fs.existsSync(a.path)) {
    console.error(`Missing artifact: ${a.path}`);
    ok = false;
    continue;
  }
  const h = crypto.createHash("sha256").update(fs.readFileSync(a.path)).digest("hex");
  if (h !== a.sha256) {
    console.error(`Hash mismatch for ${a.path}. expected=${a.sha256} got=${h}`);
    ok = false;
  }
}

if (!ok) {
  console.error("Provenance verification FAILED");
  process.exit(1);
}
console.log("Provenance verification OK");
