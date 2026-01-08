import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const targetDir = process.argv[2] || "server";
const cwd = path.resolve(process.cwd(), targetDir);

console.log(`Generating strict tsconfig for ${targetDir}...`);

const strictConfigPath = path.join(cwd, "tsconfig.strict.json");

// Initialize if not exists
if (!fs.existsSync(strictConfigPath)) {
  const originalConfigPath = path.join(cwd, "tsconfig.json");
  const originalConfig = JSON.parse(fs.readFileSync(originalConfigPath, "utf8"));
  const strictConfig = {
    extends: "./tsconfig.json",
    compilerOptions: { strict: true, noImplicitAny: true },
    exclude: [...(originalConfig.exclude || []), "node_modules", "dist"],
  };
  fs.writeFileSync(strictConfigPath, JSON.stringify(strictConfig, null, 2));
}

let iteration = 0;
while (iteration < 10) {
  iteration++;
  console.log(`Iteration ${iteration}: Running tsc -p tsconfig.strict.json...`);

  let output = "";
  try {
    execSync(`npx tsc -p tsconfig.strict.json --noEmit --pretty false`, {
      cwd,
      maxBuffer: 1024 * 1024 * 50,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    console.log("No errors found!");
    break;
  } catch (e) {
    output = e.stdout.toString();
  }

  const lines = output.split("\n");
  const failingFiles = new Set();
  for (const line of lines) {
    const match = line.match(/^([^\(]+)\(\d+,\d+\): error TS/);
    if (match) {
      failingFiles.add(match[1].trim());
    }
  }

  if (failingFiles.size === 0) {
    console.log("tsc failed but no file errors found?");
    // console.log(output.substring(0, 500));
    break;
  }

  console.log(`Found ${failingFiles.size} NEW files with strict errors.`);

  const currentConfig = JSON.parse(fs.readFileSync(strictConfigPath, "utf8"));
  const currentExclude = new Set(currentConfig.exclude || []);
  let added = 0;
  for (const f of failingFiles) {
    // Normalize path separators to forward slashes for tsconfig consistency
    const normalized = f.replace(/\\/g, "/");
    if (!currentExclude.has(normalized)) {
      currentExclude.add(normalized);
      added++;
    }
  }

  if (added === 0) {
    console.log("No new files added to exclude list. Stopping to avoid infinite loop.");
    break;
  }

  currentConfig.exclude = Array.from(currentExclude).sort();
  fs.writeFileSync(strictConfigPath, JSON.stringify(currentConfig, null, 2));
  console.log(
    `Added ${added} files to exclude list. Total excludes: ${currentConfig.exclude.length}`
  );
}
