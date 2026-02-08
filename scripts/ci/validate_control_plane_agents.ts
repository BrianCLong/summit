import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = 'control_plane/agents/manifest.schema.json';
const REGISTRY_DIR = 'control_plane/agents/registry';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getAllYamlFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllYamlFiles(filePath));
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      results.push(filePath);
    }
  });
  return results;
}

function countFields(obj: any, schema: any): { present: number; total: number } {
  let present = 0;
  let total = 0;

  const properties = schema.properties || {};
  for (const prop in properties) {
    total++;
    if (obj && obj[prop] !== undefined) {
      present++;
      if (properties[prop].type === 'object' && properties[prop].properties) {
        const sub = countFields(obj[prop], properties[prop]);
        present += sub.present;
        total += sub.total;
      }
    } else if (properties[prop].type === 'object' && properties[prop].properties) {
        // Even if the object is missing, we count its sub-properties as missing
        const sub = countFields(undefined, properties[prop]);
        total += sub.total;
    }
  }

  return { present, total };
}

function calculateCoverage(agent: any, schema: any): number {
  const { present, total } = countFields(agent, schema);
  return total > 0 ? (present / total) * 100 : 100;
}

function validateAgent(agent: any, schema: any, sourceFile: string): { valid: boolean; coverage: number } {
  const validate = ajv.compile(schema);
  const valid = validate(agent);
  const coverage = calculateCoverage(agent, schema);

  if (!valid) {
    console.error(`❌ Schema validation failed for agent '${agent.agent_id}' in ${sourceFile}:`);
    console.error(JSON.stringify(validate.errors, null, 2));
    return { valid: false, coverage };
  }

  // Instruction Hash Verification
  if (agent.runtime && agent.runtime.instructions) {
    const { source, sha256 } = agent.runtime.instructions;
    const fullPath = path.resolve(process.cwd(), source);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Instruction file not found for agent '${agent.agent_id}': ${source}`);
      return { valid: false, coverage };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const actualHash = computeSha256(content);

    if (actualHash !== sha256) {
      console.error(`❌ Hash mismatch for agent '${agent.agent_id}' instructions (${source}):`);
      console.error(`   Expected: ${sha256}`);
      console.error(`   Actual:   ${actualHash}`);
      return { valid: false, coverage };
    }
  }

  console.log(`✅ Agent '${agent.agent_id}' is valid. (Coverage: ${coverage.toFixed(1)}%)`);
  return { valid: true, coverage };
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

  if (!fs.existsSync(REGISTRY_DIR)) {
    console.error(`Registry directory not found at ${REGISTRY_DIR}`);
    process.exit(1);
  }

  const registryFiles = getAllYamlFiles(REGISTRY_DIR);
  let allValid = true;
  let totalCoverage = 0;
  let agentCount = 0;

  for (const filePath of registryFiles) {
    console.log(`Processing registry file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(content) as any;

    if (!data || !data.agents || !Array.isArray(data.agents)) {
      console.error(`❌ Invalid registry format in ${filePath}: 'agents' array missing.`);
      allValid = false;
      continue;
    }

    for (const agent of data.agents) {
      const { valid, coverage } = validateAgent(agent, schema, filePath);
      if (!valid) {
        allValid = false;
      }
      totalCoverage += coverage;
      agentCount++;
    }
  }

  if (agentCount > 0) {
    const avgCoverage = totalCoverage / agentCount;
    console.log(`\n📊 Aggregate Manifest Coverage: ${avgCoverage.toFixed(1)}%`);
  }

  if (!allValid) {
    console.error("❌ Validation failed.");
    process.exit(1);
  } else {
    console.log("🚀 All control plane agent manifests validated successfully.");
  }
}

main();
