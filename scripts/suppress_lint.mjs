import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const target = process.argv[2] || ".";
const cwd = process.argv[3] || process.cwd();
const limit = parseInt(process.argv[4] || "100", 10);

console.log(`Running eslint on ${target} in ${cwd} with limit ${limit}...`);

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

let modifiedFilesCount = 0;

for (const fileResult of report) {
  if (modifiedFilesCount >= limit) break;

  const { filePath, messages } = fileResult;
  if (!messages || messages.length === 0) continue;

  const errors = messages.filter((m) => m.ruleId);
  if (errors.length === 0) continue;

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.error(`Could not read ${filePath}`);
    continue;
  }

  const lines = fileContent.split("\n");
  const errorsByLine = {};
  for (const error of errors) {
    if (!error.ruleId) continue;
    if (!errorsByLine[error.line]) {
      errorsByLine[error.line] = new Set();
    }
    errorsByLine[error.line].add(error.ruleId);
  }

  const errorLines = Object.keys(errorsByLine)
    .map(Number)
    .sort((a, b) => b - a);
  let modified = false;

  for (const lineNum of errorLines) {
    const lineIndex = lineNum - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;

    const rules = Array.from(errorsByLine[lineNum]);
    const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : "";

    if (prevLine.trim().startsWith("// eslint-disable-next-line")) {
      const match = prevLine.match(/\/\/ eslint-disable-next-line (.*)/);
      if (match) {
        const existingRules = match[1].split(",").map((s) => s.trim());
        const newRules = [...new Set([...existingRules, ...rules])];
        const indent = prevLine.match(/^\s*/)[0];
        lines[lineIndex - 1] = `${indent}// eslint-disable-next-line ${newRules.join(", ")}`;
        modified = true;
        continue;
      }
    }

    const targetLine = lines[lineIndex];
    const indent = targetLine.match(/^\s*/)[0];
    const suppression = `${indent}// eslint-disable-next-line ${rules.join(", ")}`;

    lines.splice(lineIndex, 0, suppression);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join("\n"));
    modifiedFilesCount++;
    console.log(`Suppressed errors in ${path.basename(filePath)}`);
  }
}

console.log(`Process complete. Modified ${modifiedFilesCount} files.`);
if (modifiedFilesCount === 0) {
  console.log("No more errors to suppress!");
}
