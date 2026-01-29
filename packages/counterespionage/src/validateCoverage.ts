import fs from "node:fs";
import process from "node:process";

export function validateCoverage(path = "packages/counterespionage/coverage/coverage_map.json") {
  const doc = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!doc?.techniques?.length) throw new Error("coverage_map.json must include techniques[]");
  for (const t of doc.techniques) {
    if (!t.technique_id || !t.name) throw new Error("Each technique needs technique_id + name");
    if (!Array.isArray(t.controls) || !Array.isArray(t.detections)) throw new Error("controls/detections must be arrays");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    validateCoverage();
    console.log("OK: coverage map valid");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
