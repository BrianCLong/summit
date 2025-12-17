import fs from 'fs';
import path from 'path';
import { GraphSchema } from './types.js';

const FALLBACK_PATH = path.resolve(__dirname, '../schema/fallback-schema.json');
const CONTRACT_SCHEMA = path.resolve(
  process.cwd(),
  'contracts/query/schema.json',
);

function readSchemaFile(filePath: string): GraphSchema | undefined {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as GraphSchema;
  } catch (err) {
    return undefined;
  }
}

export function loadSchema(): { schema: GraphSchema; source: string } {
  const contractSchema = readSchemaFile(CONTRACT_SCHEMA);
  if (contractSchema) {
    return { schema: contractSchema, source: CONTRACT_SCHEMA };
  }

  const fallbackSchema = readSchemaFile(FALLBACK_PATH);
  if (!fallbackSchema) {
    throw new Error('Missing graph schema for NL→Cypher translation');
  }

  return { schema: fallbackSchema, source: FALLBACK_PATH };
}

export function normalizeSchema(schema: GraphSchema): GraphSchema {
  return {
    nodes: schema.nodes.map((node) => ({
      label: node.label,
      properties: node.properties.map((prop) => prop.toLowerCase()),
    })),
    relationships: schema.relationships.map((rel) => ({
      type: rel.type,
      from: rel.from,
      to: rel.to,
    })),
  };
}
