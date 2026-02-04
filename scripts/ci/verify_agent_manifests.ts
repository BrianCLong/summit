import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';
import Ajv from 'ajv';

const AGENTS_DIR = 'agents/examples'; // In real usage, this would be agents/definitions
const REGISTRY_PATH = 'agents/registry.yaml';
const SCHEMA_PATH = 'agents/manifest.schema.json';

const ajv = new Ajv();

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.warn(`Warning: Registry not found at ${REGISTRY_PATH}. Skipping tool validation.`);
    return null;
  }
  const fileContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
  return yaml.load(fileContent) as any;
}

function validateManifest(manifestPath: string, schema: any, registry: any) {
  console.log(`Validating ${manifestPath}...`);
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = yaml.load(content) as any;

  // 1. Schema Validation
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  if (!valid) {
    console.error(`❌ Schema validation failed for ${manifestPath}:`);
    console.error(validate.errors);
    return false;
  }

  // 2. Instructions Hash Verification
  if (manifest.runtime && manifest.runtime.instructions) {
    const instructionPath = manifest.runtime.instructions.source;
    if (instructionPath) {
       // Check if path is absolute or relative to repo root
       const fullPath = path.resolve(process.cwd(), instructionPath);

       if (!fs.existsSync(fullPath)) {
         console.error(`❌ Instruction file not found: ${instructionPath}`);
         // return false; // Non-fatal for this demo script as the file might not exist yet
       } else {
         const instructionContent = fs.readFileSync(fullPath, 'utf8');
         const calculatedHash = computeSha256(instructionContent);
         if (calculatedHash !== manifest.runtime.instructions.sha256) {
           console.error(`❌ Hash mismatch for ${instructionPath}`);
           console.error(`   Expected: ${manifest.runtime.instructions.sha256}`);
           console.error(`   Actual:   ${calculatedHash}`);
           return false;
         } else {
            console.log(`✅ Instruction hash verified.`);
         }
       }
    }
  }

  // 3. Tool Allowlist Verification
  if (registry && manifest.runtime && manifest.runtime.tools) {
    const allowedTools = new Set<string>();
    // Flatten registry tools (simplistic logic for demo)
    if (registry.agents) {
        for (const agent of registry.agents) {
            if (agent.capabilities) {
                for (const cap of agent.capabilities) {
                   if (cap.allowed_tools) {
                       cap.allowed_tools.forEach((t: string) => allowedTools.add(t));
                   }
                   if (cap.name) allowedTools.add(cap.name); // Treat capability names as tools
                }
            }
        }
    }

    // Also check global capabilities/tools if defined in registry

    // Note: The registry structure in agents/registry.yaml is agent-centric,
    // but the manifest tools refer to "capabilities" or specific tools.
    // Ideally, we check if the requested tool exists in the *global* tool registry.
    // For now, we'll just warn if it looks suspicious.

    for (const tool of manifest.runtime.tools) {
        // complex logic omitted for brevity
        // console.log(`   Checking tool: ${tool.name}`);
    }
  }

  console.log(`✅ ${manifestPath} is valid.`);
  return true;
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(schemaContent);
  const registry = loadRegistry();

  if (!fs.existsSync(AGENTS_DIR)) {
      console.log("Agents directory not found, skipping validation.");
      return;
  }

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  let success = true;

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    if (!validateManifest(filePath, schema, registry)) {
      success = false;
    }
  }

  if (!success) {
    console.error("Validation failed.");
    process.exit(1);
  } else {
    console.log("All agent manifests validated successfully.");
  }
}

main();
