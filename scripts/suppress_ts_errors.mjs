import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const cwd = process.argv[2] || process.cwd();

console.log(`Running tsc in ${cwd}...`);

let output;
try {
  const tsconfig = fs.existsSync(path.join(cwd, "tsconfig.strict.json"))
    ? "-p tsconfig.strict.json"
    : "";
  // tsc output format: file.ts(1,2): error TS1234: ...
  output = execSync(`npx tsc ${tsconfig} --noEmit --pretty false`, {
    cwd,
    maxBuffer: 1024 * 1024 * 50,
    env: { ...process.env, FORCE_COLOR: "0" },
  }).toString();
} catch (e) {
  output = e.stdout.toString();
}

const lines = output.split("\n");
const fileSet = new Set();

for (const line of lines) {
  // Match filename(line,col): error
  // Handles paths with relative parts or simple filenames
  const match = line.match(/^([^\(]+)\(\d+,\d+\): error TS/);
  if (match) {
    // resolve to absolute path
    fileSet.add(path.resolve(cwd, match[1]));
  }
}

const limit = parseInt(process.argv[3] || "100", 10);
console.log(`Found ${fileSet.size} files with TS errors. Processing max ${limit}...`);

let modifiedCount = 0;
for (const absPath of fileSet) {
  if (modifiedCount >= limit) break;
  try {
    let content = fs.readFileSync(absPath, "utf8");
    if (content.includes("// @ts-nocheck")) continue;

    const lines = content.split("\n");
    if (lines.length > 0 && lines[0].startsWith("#!")) {
      // Insert after shebang
      lines.splice(1, 0, "// @ts-nocheck");
      content = lines.join("\n");
    } else {
      content = "// @ts-nocheck\n" + content;
    }

    fs.writeFileSync(absPath, content);
    modifiedCount++;
  } catch (e) {
    console.error(`Failed to modify ${absPath}:`, e.message);
  }
}

console.log(`Suppressed TS errors in ${modifiedCount} files.`);
