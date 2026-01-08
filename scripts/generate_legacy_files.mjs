import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const target = process.argv[2] || ".";
const cwd = process.argv[3] || process.cwd();
const outputFile = process.argv[4] || "legacy-files.json";

console.log(`Running eslint on ${target} in ${cwd}...`);

let report;
try {
  const output = execSync(`npx eslint ${target} --format json`, {
    cwd,
    maxBuffer: 1024 * 1024 * 50,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  report = JSON.parse(output.toString());
} catch (e) {
  const output = e.stdout.toString();
  try {
    report = JSON.parse(output);
  } catch (parseError) {
    console.error("Failed to parse eslint output");
    process.exit(1);
  }
}

const newLegacyFiles = report
  .filter((r) => r.messages && r.messages.length > 0)
  .map((r) => path.relative(cwd, r.filePath));

let allLegacyFiles = new Set(newLegacyFiles);

const existingFilePath = path.join(cwd, outputFile);
if (fs.existsSync(existingFilePath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(existingFilePath, "utf8"));
    existing.forEach((f) => allLegacyFiles.add(f));
  } catch (e) {
    console.error("Failed to read existing file, starting fresh");
  }
}

const finalFiles = Array.from(allLegacyFiles).sort();

fs.writeFileSync(existingFilePath, JSON.stringify(finalFiles, null, 2));
console.log(
  `Wrote ${finalFiles.length} legacy files to ${outputFile} (added ${newLegacyFiles.length})`
);
