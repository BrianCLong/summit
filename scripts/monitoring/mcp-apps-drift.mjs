import fs from "node:fs";
import path from "node:path";

function die(msg){ console.error(msg); process.exit(1); }

const root = process.cwd();
const manifestPath = path.join(root, "subsumption/mcp-apps/manifest.yaml");
if(!fs.existsSync(manifestPath)) die("Drift: manifest missing");

const requiredDocs = [
  "docs/standards/mcp-apps.md",
  "docs/security/data-handling/mcp-apps.md"
];
for(const d of requiredDocs){
  if(!fs.existsSync(path.join(root,d))) die(`Drift: doc missing ${d}`);
}

// Compare counts if we had a baseline, for now just basic sanity
console.log("Drift check passed");
