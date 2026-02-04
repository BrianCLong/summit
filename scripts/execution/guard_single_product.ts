import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust config path assuming script is in scripts/execution/
const CONFIG_PATH = path.resolve(__dirname, '../../config/execution_governor.yml');

export interface Config {
  active_product: string;
  frozen_products: string[];
  allowed_paths_always: string[];
  override_file: string;
}

export function loadConfig(configPath: string = CONFIG_PATH): Config {
  if (!fs.existsSync(configPath)) {
      console.error(`Config file not found at ${configPath}`);
      process.exit(1);
  }
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents) as Config;
}

export function checkOverride(overrideFile: string): boolean {
  const overridePath = path.resolve(process.cwd(), overrideFile);
  if (!fs.existsSync(overridePath)) {
    return false;
  }
  const content = fs.readFileSync(overridePath, 'utf8').trim();

  const lines = content.split('\n');
  const expiryLine = lines.find(line => line.toLowerCase().startsWith('expires:'));

  if (!expiryLine) {
    console.error(`Error: ${overrideFile} found but missing 'Expires: YYYY-MM-DD' line.`);
    return false;
  }

  const dateStr = expiryLine.split(':')[1].trim();
  const expiryDate = new Date(dateStr);
  const now = new Date();

  if (isNaN(expiryDate.getTime())) {
    console.error(`Error: Invalid expiry date format in ${overrideFile}. Use YYYY-MM-DD.`);
    return false;
  }

  // Set expiry to end of day to avoid timezone confusion issues on the same day
  expiryDate.setHours(23, 59, 59, 999);

  if (expiryDate < now) {
    console.error(`Error: Override file ${overrideFile} has expired on ${dateStr}.`);
    return false;
  }

  console.log(`Override active until ${dateStr}.`);
  return true;
}

export function getChangedFiles(): string[] {
  try {
    let baseRef = 'origin/main';
    try {
        execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
    } catch {
        try {
            execSync('git rev-parse --verify main', { stdio: 'ignore' });
            baseRef = 'main';
        } catch {
            console.warn("Could not find 'origin/main' or 'main'. Checking only staged/modified files.");
            const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
            return output.split('\n').filter(line => line.trim() !== '');
        }
    }

    const command = `git diff --name-only ${baseRef}...HEAD`;
    const output = execSync(command, { encoding: 'utf8' });
    return output.split('\n').filter(line => line.trim() !== '');
  } catch (error) {
      console.warn("Git diff failed, falling back to HEAD diff", error);
      try {
        const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
        return output.split('\n').filter(line => line.trim() !== '');
      } catch (e) {
          return [];
      }
  }
}

export function validateFiles(files: string[], config: Config): string[] {
  const violations: string[] = [];
  const frozenProducts = config.frozen_products || [];
  const allowedPaths = config.allowed_paths_always || [];

  for (const file of files) {
    if (!file) continue;

    // Check if file is in allowed paths (prefix match)
    const isAllowed = allowedPaths.some(allowed => file.startsWith(allowed));
    if (isAllowed) continue;

    // Check if file touches a frozen product
    const parts = file.split('/');
    for (const frozen of frozenProducts) {
       if (parts.includes(frozen)) {
         violations.push(file);
         break;
       }
    }
  }
  return violations;
}

export function main() {
  const config = loadConfig();

  if (checkOverride(config.override_file)) {
    console.log("Single Product Mode overridden.");
    process.exit(0);
  }

  const changedFiles = getChangedFiles();
  const violations = validateFiles(changedFiles, config);

  if (violations.length > 0) {
    console.error("ERROR: Single Product Mode Violation.");
    console.error(`Active Product: ${config.active_product}`);
    console.error("The following files touch frozen product areas:");
    violations.forEach(v => console.error(` - ${v}`));
    console.error(`\nTo bypass, add a ${config.override_file} file with 'Reason' and 'Expires: YYYY-MM-DD'.`);
    process.exit(1);
  }

  console.log(`Single Product Mode check passed. Active: ${config.active_product}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
