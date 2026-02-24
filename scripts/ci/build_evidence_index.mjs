import fs from "node:fs";
import path from "node:path";
import { sha256hex } from "./lib/sha.mjs";
import { parseArgs } from "./lib/args.mjs";

const args = parseArgs(process.argv.slice(2));
const evidenceDir = args["evidence-dir"] || "evidence";
const outPath = args.out || "evidence_index.json";

if (!fs.existsSync(evidenceDir)) {
  console.error(`Evidence directory ${evidenceDir} does not exist`);
  process.exit(1);
}

const items = fs.readdirSync(evidenceDir)
  .filter(f => f.endsWith(".json"))
  .map(f => {
    const p = path.join(evidenceDir, f);
    const buf = fs.readFileSync(p);
    let doc;
    try {
        doc = JSON.parse(buf.toString("utf8"));
    } catch (e) {
        throw new Error(`Invalid JSON in ${f}`);
    }
    return { id: doc.id, path: f, sha256: sha256hex(buf) };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const index = {
  release: args.release || "unknown",
  commit: args.commit || "unknown",
  items
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n");
console.log(`Generated index at ${outPath} with ${items.length} items`);
