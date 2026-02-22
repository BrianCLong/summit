import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type {
  BannedPatternRegistry,
  PolicyBundle,
  SourceRegistry,
  ToolRegistry,
} from './policyTypes';

const TOOL_SCHEMA = 'tool_registry.schema.json';
const SOURCE_SCHEMA = 'source_registry.schema.json';

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function validateSchema<T>(schemaPath: string, data: T, label: string): void {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = readJson<object>(schemaPath);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    const message = ajv.errorsText(validate.errors, { separator: '; ' });
    throw new Error(`Policy schema validation failed for ${label}: ${message}`);
  }
}

function validateRegistryIds(
  registryName: string,
  records: Record<string, { id: string }>,
): void {
  for (const [key, value] of Object.entries(records)) {
    if (key !== value.id) {
      throw new Error(
        `Policy registry key mismatch in ${registryName}: ${key} != ${value.id}`,
      );
    }
  }
}

function validateBannedPatterns(registry: BannedPatternRegistry): void {
  if (!Array.isArray(registry.patterns) || registry.patterns.length === 0) {
    throw new Error('Banned patterns registry must include at least one pattern.');
  }
  for (const pattern of registry.patterns) {
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new Error('Banned patterns registry contains an invalid pattern.');
    }
  }
}

export function loadPolicyBundle(
  policyDir = path.resolve(
    process.cwd(),
    '.github',
    'policies',
    'agent-data-access',
  ),
): PolicyBundle {
  const toolSchemaPath = path.join(policyDir, TOOL_SCHEMA);
  const sourceSchemaPath = path.join(policyDir, SOURCE_SCHEMA);

  const toolRegistry = readJson<ToolRegistry>(
    path.join(policyDir, 'tool_registry.json'),
  );
  const sourceRegistry = readJson<SourceRegistry>(
    path.join(policyDir, 'source_registry.json'),
  );
  const bannedRegistry = readJson<BannedPatternRegistry>(
    path.join(policyDir, 'banned_patterns.json'),
  );

  validateSchema(toolSchemaPath, toolRegistry, 'tool_registry');
  validateSchema(sourceSchemaPath, sourceRegistry, 'source_registry');
  validateRegistryIds('tool_registry', toolRegistry.tools);
  validateRegistryIds('source_registry', sourceRegistry.sources);
  validateBannedPatterns(bannedRegistry);

  return {
    tools: toolRegistry.tools,
    sources: sourceRegistry.sources,
    bannedPatterns: bannedRegistry.patterns,
  };
}
