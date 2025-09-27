import { JsonSchema, SchemaHistoryEntry } from './types.js';

interface PropertyDescriptor {
  name: string;
  type: string;
  required: boolean;
}

function toPascalCase(value: string): string {
  const core = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const candidate = core.length > 0 ? core : 'Schema';
  return /^[A-Za-z]/.test(candidate) ? candidate : `Schema${candidate}`;
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  const lowered = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return /^[A-Za-z]/.test(lowered) ? lowered : `schema${pascal}`;
}

function versionIdentifier(version: string): string {
  return version.replace(/[^a-zA-Z0-9]/g, '_');
}

function getPropertyDescriptors(schema: JsonSchema): PropertyDescriptor[] {
  const properties = (schema?.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set<string>(Array.isArray(schema?.required) ? (schema.required as string[]) : []);

  return Object.keys(properties)
    .sort()
    .map((key) => {
      const descriptor = properties[key] as JsonSchema;
      const type = typeof descriptor?.type === 'string' ? (descriptor.type as string) : 'unknown';
      return {
        name: key,
        type,
        required: required.has(key),
      };
    });
}

function tsPropertyName(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    return name;
  }

  return `'${name.replace(/'/g, "\\'")}'`;
}

function tsTypeFor(jsonType: string): string {
  switch (jsonType) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'unknown[]';
    case 'object':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function pythonFieldName(name: string): { fieldName: string; alias?: string } {
  const sanitized = name
    .replace(/[^0-9A-Za-z_]/g, '_')
    .replace(/^[^A-Za-z_]+/, (match) => `field_${match}`);

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(sanitized)) {
    if (sanitized === name) {
      return { fieldName: sanitized };
    }
    return { fieldName: sanitized, alias: name };
  }

  return { fieldName: `field_${sanitized}`, alias: name };
}

function pythonTypeFor(jsonType: string, optional: boolean): string {
  const baseType = (() => {
    switch (jsonType) {
      case 'string':
        return 'str';
      case 'number':
        return 'float';
      case 'integer':
        return 'int';
      case 'boolean':
        return 'bool';
      case 'array':
        return 'List[Any]';
      case 'object':
        return 'Dict[str, Any]';
      default:
        return 'Any';
    }
  })();

  return optional ? `Optional[${baseType}]` : baseType;
}

function toTypescriptLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function toPythonLiteral(value: unknown, indent = 0): string {
  if (value === null) {
    return 'None';
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const nextIndent = indent + 2;
    const joined = value
      .map((item) => `${' '.repeat(nextIndent)}${toPythonLiteral(item, nextIndent)}`)
      .join(',\n');
    return `[\n${joined}\n${' '.repeat(indent)}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
      return '{}';
    }
    const nextIndent = indent + 2;
    const body = entries
      .map(
        ([key, val]) =>
          `${' '.repeat(nextIndent)}'${key.replace(/'/g, "\\'")}': ${toPythonLiteral(val, nextIndent)}`,
      )
      .join(',\n');
    return `{\n${body}\n${' '.repeat(indent)}}`;
  }

  return 'None';
}

export function generateTypescriptClient(entry: SchemaHistoryEntry): string {
  const descriptors = getPropertyDescriptors(entry.schema);
  const interfaceName = `${toPascalCase(entry.name)}V${versionIdentifier(entry.version)}`;
  const metadataConst = `${toCamelCase(entry.name)}${versionIdentifier(entry.version)}Metadata`;
  const metadata = {
    silo: entry.silo,
    name: entry.name,
    version: entry.version,
    policyTags: entry.policyTags,
    schema: entry.schema,
    registeredAt: entry.registeredAt.toISOString(),
  };

  const interfaceBody =
    descriptors.length === 0
      ? '  [key: string]: unknown;'
      : descriptors
          .map((descriptor) =>
            `  ${tsPropertyName(descriptor.name)}${descriptor.required ? '' : '?'}: ${tsTypeFor(descriptor.type)};`,
          )
          .join('\n');

  const docSummary = `Schema for ${entry.name} (v${entry.version}) in silo ${entry.silo}.`;
  const tagSummary = `Policy tags: sensitivity=${entry.policyTags.sensitivity}, residency=${entry.policyTags.residency}, retentionClass=${entry.policyTags.retentionClass}.`;

  return `/* Auto-generated by fsr-pt */\n` +
    `/**\n * ${docSummary}\n * ${tagSummary}\n */\n` +
    `export interface ${interfaceName} {\n${interfaceBody}\n}\n\n` +
    `export const ${metadataConst} = ${toTypescriptLiteral(metadata)} as const;\n\n` +
    `export function get${interfaceName}PolicyTags() {\n  return ${metadataConst}.policyTags;\n}\n`;
}

export function generatePythonClient(entry: SchemaHistoryEntry): string {
  const descriptors = getPropertyDescriptors(entry.schema);
  const className = `${toPascalCase(entry.name)}V${versionIdentifier(entry.version)}`;
  const metadata = {
    'silo': entry.silo,
    'name': entry.name,
    'version': entry.version,
    'policyTags': entry.policyTags,
    'schema': entry.schema,
    'registeredAt': entry.registeredAt.toISOString(),
  };

  const fields = descriptors.length
    ? descriptors
        .map((descriptor) => {
          const { fieldName, alias } = pythonFieldName(descriptor.name);
          const pythonType = pythonTypeFor(descriptor.type, !descriptor.required);
          const comment = alias ? `  # original: ${descriptor.name}` : '';
          const defaultValue = descriptor.required ? '' : ' = None';
          return `    ${fieldName}: ${pythonType}${defaultValue}${comment}`;
        })
        .join('\n')
    : '    data: Optional[Dict[str, Any]] = None';

  const imports = [
    'from __future__ import annotations',
    'from dataclasses import dataclass',
    'from typing import Any, Dict, List, Optional',
  ].join('\n');

  const metadataLiteral = toPythonLiteral(metadata);

  return `# Auto-generated by fsr-pt\n${imports}\n\nPOLICY_TAGS: Dict[str, str] = ${toPythonLiteral(entry.policyTags)}\nSCHEMA_DEFINITION: Dict[str, Any] = ${toPythonLiteral(entry.schema)}\n\n` +
    `@dataclass\nclass ${className}:\n${fields}\n\n` +
    `def get_${toSnakeCase(className)}_metadata() -> Dict[str, Any]:\n` +
    `    return ${metadataLiteral}\n`;
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toLowerCase();
}
