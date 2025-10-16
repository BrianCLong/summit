import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  Diagnostic,
  Position,
  SchemaInput,
  ValidateOptions,
} from './types';
import { escapeJsonPointerSegment } from './interpolate';

const validatorCache = new Map<string, ValidateFunction>();
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  messages: true,
  verbose: true,
});
addFormats(ajv);

export function validate(
  value: unknown,
  schema: SchemaInput,
  options: ValidateOptions = {},
): Diagnostic[] {
  const validateFn = resolveSchema(schema);
  const diagnostics: Diagnostic[] = [];

  if (!validateFn(value)) {
    if (validateFn.errors) {
      for (const error of validateFn.errors) {
        diagnostics.push(convertAjvError(error, options.pointerMap));
      }
    }
  }

  return diagnostics;
}

function resolveSchema(schema: SchemaInput): ValidateFunction {
  if (typeof schema === 'string') {
    const absolute = resolve(schema);
    const cached = validatorCache.get(absolute);
    if (cached) {
      return cached;
    }
    const raw = readFileSync(absolute, 'utf8');
    const parsed = JSON.parse(raw);
    const compiled = ajv.compile(parsed);
    validatorCache.set(absolute, compiled);
    return compiled;
  }

  const key = JSON.stringify(schema);
  const cached = validatorCache.get(key);
  if (cached) {
    return cached;
  }
  const compiled = ajv.compile(schema);
  validatorCache.set(key, compiled);
  return compiled;
}

function convertAjvError(
  error: ErrorObject,
  pointerMap?: Record<string, Position>,
): Diagnostic {
  const pointer = normalizePointer(error.instancePath);
  const position = pointerMap?.[pointer] ??
    pointerMap?.[''] ?? { line: 0, column: 0 };
  const message = error.message ?? 'Schema validation error';
  const code = error.keyword;
  const hint = buildHint(error);

  return {
    severity: 'error',
    message,
    pointer,
    line: position.line,
    column: position.column,
    code,
    hint,
  };
}

function buildHint(error: ErrorObject): string | undefined {
  switch (error.keyword) {
    case 'enum':
      if (Array.isArray(error.params?.allowedValues)) {
        return `Allowed values: ${error.params.allowedValues.join(', ')}`;
      }
      break;
    case 'required':
      if (typeof error.params?.missingProperty === 'string') {
        return `Missing required property: ${error.params.missingProperty}`;
      }
      break;
    case 'type':
      if (typeof error.params?.type === 'string') {
        return `Expected type ${error.params.type}.`;
      }
      break;
    default:
      break;
  }
  return undefined;
}

function normalizePointer(pointer: string): string {
  if (!pointer) {
    return '';
  }
  const segments = pointer
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((segment) => `/${escapeJsonPointerSegment(segment)}`);
  return segments.join('');
}
