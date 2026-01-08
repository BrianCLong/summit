import fs from "fs";
import path from "path";

const EVIDENCE_INDEX_PATH = "docs/compliance/EVIDENCE_INDEX.md";

console.log("Verifying Compliance Evidence Drift...");

if (!fs.existsSync(EVIDENCE_INDEX_PATH)) {
  console.error(`ERROR: Evidence Index not found at ${EVIDENCE_INDEX_PATH}`);
  process.exit(1);
}

const evidenceContent = fs.readFileSync(EVIDENCE_INDEX_PATH, "utf-8");
const lines = evidenceContent.split("\n");

let errorCount = 0;

lines.forEach((line, index) => {
  if (!line.trim().startsWith("|") || line.includes("---") || line.includes("Control ID")) {
    return;
  }

  const columns = line
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  if (columns.length < 4) return;

  // Col 3: Location / Artifact
  const location = columns[3];

  // Check if the location is a file and if it exists
  if (!location.includes(" ") && !location.startsWith("http")) {
    const cleanPath = location.replace(/`/g, "");

    if (cleanPath.endsWith("/")) {
      if (!fs.existsSync(cleanPath) && !fs.existsSync(path.resolve(process.cwd(), cleanPath))) {
        console.error(`DRIFT ERROR: Directory not found: ${cleanPath} (Line ${index + 1})`);
        errorCount++;
      }
    } else {
      if (!fs.existsSync(cleanPath) && !fs.existsSync(path.resolve(process.cwd(), cleanPath))) {
        console.error(`DRIFT ERROR: File not found: ${cleanPath} (Line ${index + 1})`);
        errorCount++;
      }
    }
  }
});

if (errorCount > 0) {
  console.error(`FAILED: Found ${errorCount} evidence artifacts missing.`);
  process.exit(1);
}

console.log("SUCCESS: All checked evidence artifacts exist.");
