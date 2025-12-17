import { normalizeSchema, loadSchema } from './schema.js';
import { isBlocked } from './sanitizer.js';
import { validateCypher } from './validator.js';
import { GraphSchema, TranslationResult } from './types.js';

function tokenize(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function selectLabel(tokens: string[], schema: GraphSchema): string {
  const match = schema.nodes.find((node) =>
    tokens.some((token) => token === node.label.toLowerCase()),
  );
  return match ? match.label : schema.nodes[0]?.label ?? 'Entity';
}

function collectProperties(tokens: string[], label: string, schema: GraphSchema): string[] {
  const node = schema.nodes.find((n) => n.label === label);
  if (!node) return [];
  return node.properties.filter((prop) => tokens.includes(prop.toLowerCase()));
}

function buildWhereClause(label: string, properties: string[]): string {
  if (properties.length === 0) return '';
  const clauses = properties.map((prop, index) => `n.${prop} CONTAINS $p${index}`);
  return `WHERE ${clauses.join(' AND ')}`;
}

function buildCypher(prompt: string, schema: GraphSchema, trace: string[]): TranslationResult {
  const tokens = tokenize(prompt);
  trace.push(`tokens: ${tokens.join(',')}`);
  const targetLabel = selectLabel(tokens, schema);
  trace.push(`targetLabel: ${targetLabel}`);
  const properties = collectProperties(tokens, targetLabel, schema);
  trace.push(`properties: ${properties.join(',') || 'none'}`);
  const where = buildWhereClause(targetLabel, properties);
  const cypher = [`MATCH (n:${targetLabel})`, where, 'RETURN n', 'LIMIT 25']
    .filter(Boolean)
    .join('\n');

  const sql = `SELECT * FROM ${targetLabel.toLowerCase()}${
    properties.length ? ' WHERE ' + properties.map((p, idx) => `${p} LIKE :p${idx}`).join(' AND ') : ''
  } LIMIT 25`;

  const confidence = Math.min(0.95, 0.55 + properties.length * 0.1 + (where ? 0.05 : 0));
  const warnings: string[] = [];

  const blocked = isBlocked(cypher);
  if (blocked.blocked) {
    warnings.push(...blocked.reasons);
  }

  const { valid, warnings: validationWarnings } = validateCypher(cypher);
  warnings.push(...validationWarnings);

  if (!valid) {
    trace.push('validator flagged query; lowering confidence');
    return {
      cypher,
      sqlFallback: sql,
      confidence: Math.min(confidence, 0.5),
      warnings,
      reasoningTrace: trace,
    };
  }

  return { cypher, sqlFallback: sql, confidence, warnings, reasoningTrace: trace };
}

export function translate(prompt: string): TranslationResult {
  const trace: string[] = [`prompt: ${prompt}`];
  const { schema, source } = loadSchema();
  trace.push(`schemaSource: ${source}`);
  const normalized = normalizeSchema(schema);
  const result = buildCypher(prompt, normalized, trace);
  return result;
}
