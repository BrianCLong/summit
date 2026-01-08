import fs from "fs";
import path from "path";
import crypto from "crypto";
import yaml from "js-yaml";

const REGISTRY_PATH = "prompts/registry.yaml";
const ROOT_DIR = process.cwd();

interface PromptEntry {
  id: string;
  version: string;
  path: string;
  sha256: string;
  description?: string;
  scope?: any;
  verification?: any;
  allowed_operations?: string[];
}

interface Registry {
  version: number;
  prompts: PromptEntry[];
}

function calculateSha256(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

function updateRegistry() {
  const fullRegistryPath = path.join(ROOT_DIR, REGISTRY_PATH);

  if (!fs.existsSync(fullRegistryPath)) {
    console.error(`Registry not found at ${fullRegistryPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(fullRegistryPath, "utf-8");
  const registry = yaml.load(fileContent) as Registry;
  let updatedCount = 0;

  registry.prompts.forEach((entry) => {
    const promptPath = path.join(ROOT_DIR, entry.path);
    if (fs.existsSync(promptPath)) {
      const currentHash = calculateSha256(promptPath);
      if (currentHash !== entry.sha256) {
        console.log(`Updating hash for ${entry.id} (${entry.path})`);
        entry.sha256 = currentHash;
        updatedCount++;
      }
    } else {
      console.warn(`Warning: Prompt file not found: ${entry.path}`);
    }
  });

  if (updatedCount > 0) {
    const newContent = yaml.dump(registry, { indent: 2, lineWidth: -1 });
    fs.writeFileSync(fullRegistryPath, newContent, "utf-8");
    console.log(`Updated ${updatedCount} prompt hashes in registry.`);
  } else {
    console.log("No prompt hashes needed updating.");
  }
}

updateRegistry();
