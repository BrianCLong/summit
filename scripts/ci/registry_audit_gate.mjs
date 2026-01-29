import fs from 'node:fs';
import yaml from 'js-yaml';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_REGISTRY_PATH = 'governance/tool_registry.yaml';
const AGENT_REGISTRY_PATH = 'agents/registry.yaml';

function loadYaml(filepath) {
  try {
    const fileContents = fs.readFileSync(filepath, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error(`Error loading YAML file ${filepath}:`, e);
    process.exit(1);
  }
}

function auditRegistry(targetDir = process.cwd()) {
  console.log('Auditing Tool Registry...');

  const toolRegistryPath = path.resolve(targetDir, TOOL_REGISTRY_PATH);
  const agentRegistryPath = path.resolve(targetDir, AGENT_REGISTRY_PATH);

  if (!fs.existsSync(toolRegistryPath)) {
    console.error(`❌ Tool Registry file not found: ${toolRegistryPath}`);
    process.exit(1);
  }

  const toolRegistry = loadYaml(toolRegistryPath);
  const agentRegistry = loadYaml(agentRegistryPath);

  // 1. Validate Tool Registry Schema (Basic)
  if (!toolRegistry.tools || !Array.isArray(toolRegistry.tools)) {
    console.error('❌ Tool Registry missing "tools" array.');
    process.exit(1);
  }

  const registeredTools = new Set(toolRegistry.tools.map(t => t.name));
  console.log(`✅ Loaded ${registeredTools.size} tools from registry.`);

  // 2. Cross-reference with Agent Registry
  let errors = 0;
  if (agentRegistry.agents && Array.isArray(agentRegistry.agents)) {
    agentRegistry.agents.forEach(agent => {
      if (agent.capabilities) {
        agent.capabilities.forEach(cap => {
          if (cap.scope && cap.scope.allowed_tools) {
            cap.scope.allowed_tools.forEach(toolName => {
              if (!registeredTools.has(toolName)) {
                console.error(`❌ Missing Tool Definition: Agent '${agent.identity.name}' uses tool '${toolName}' which is NOT defined in ${TOOL_REGISTRY_PATH}.`);
                errors++;
              }
            });
          }
        });
      }
    });
  }

  if (errors > 0) {
    console.error(`❌ Registry Audit Failed with ${errors} errors.`);
    process.exit(1);
  }

  console.log('✅ Registry Audit Passed.');
  return true;
}

// Check if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  auditRegistry();
}

export { auditRegistry };
