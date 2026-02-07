import fs from "node:fs";
import path from "node:path";

const evidenceDir = process.argv[2] ?? "evidence";
const schemaDir = path.join(evidenceDir, "schemas");
const requiredSchemas = [
  "report.schema.json",
  "metrics.schema.json",
  "stamp.schema.json",
  "index.schema.json",
];

function mustExist(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing: ${filePath}`);
  }
}

mustExist(evidenceDir);
mustExist(path.join(evidenceDir, "index.json"));
JSON.parse(fs.readFileSync(path.join(evidenceDir, "index.json"), "utf-8"));
mustExist(schemaDir);

for (const schema of requiredSchemas) {
  mustExist(path.join(schemaDir, schema));
}

console.log("evidence-verify: OK (structure only)");
