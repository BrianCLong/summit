import { Policy, TransformAction } from '../types.js';
import { canonicalTransformSignature } from '../descriptors.js';

function escapeTsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function toPascalCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const HELPER_BLOCK: string[] = [
  "import { createHash } from 'node:crypto';",
  '',
  'export type SrlcRecord = Record<string, unknown>;',
  '',
  'type NullableString = string | null;',
  '',
  'function assertFormat(value: NullableString, format: string): void {',
  '  if (value == null) {',
  '    return;',
  '  }',
  '  const patterns: Record<string, RegExp> = {',
  "    ssn: /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/,",
  "    iban: /^[A-Z0-9]{15,34}$/,",
  "    phone: /^\\+?[0-9]{10,15}$/,",
  '  };',
  '  const pattern = patterns[format];',
  '  if (pattern && !pattern.test(value)) {',
  '    throw new Error(`SRLC format violation for ${format}: ${value}`);',
  '  }',
  '}',
  '',
  'function mask(value: NullableString, keep: number, maskChar: string, format: string): NullableString {',
  '  if (value == null) {',
  '    return value;',
  '  }',
  '  assertFormat(value, format);',
  '  if (keep <= 0) {',
  "    return value.replace(/[A-Za-z0-9]/g, maskChar);",
  '  }',
  '  let visible = 0;',
  "  let result = '';",
  '  for (let idx = value.length - 1; idx >= 0; idx -= 1) {',
  '    const ch = value[idx];',
    '    if (/[A-Za-z0-9]/.test(ch)) {',
  '      if (visible < keep) {',
  "        result = ch + result;",
  '        visible += 1;',
  '      } else {',
  "        result = maskChar + result;",
  '      }',
  '    } else {',
  "      result = ch + result;",
  '    }',
  '  }',
  '  return result;',
  '}',
  '',
  "function hash(value: NullableString, algorithm: 'sha256' | 'sha512', saltScope: string): NullableString {",
  '  if (value == null) {',
  '    return value;',
  '  }',
  "  const salt = saltScope === 'global' ? 'SRLC_GLOBAL' : 'SRLC_SESSION';",
  '  return createHash(algorithm).update(value + salt).digest(\'hex\');',
  '}',
  '',
  'function tokenize(value: NullableString, namespace: string, preserveFormat: boolean, format: string): NullableString {',
  '  if (value == null) {',
  '    return value;',
  '  }',
  '  assertFormat(value, format);',
  "  const token = createHash('sha256').update(`${namespace}:${value}`).digest('hex');",
  '  return preserveFormat ? token.slice(0, value.length) : token;',
  '}',
  '',
  'function generalize(value: NullableString, granularity: string): NullableString {',
  '  if (value == null) {',
  '    return value;',
  '  }',
  "  if (granularity === 'none') {",
  '    return value;',
  '  }',
  "  return `${granularity}::${value}`;",
  '}',
  '',
  'export const helpers = {',
  '  assertFormat,',
  '  mask,',
  '  hash,',
  '  tokenize,',
  '  generalize',
  '};'
];

function applyActionExpression(tempVar: string, action: TransformAction, format: string): string {
  switch (action.type) {
    case 'mask':
      return `mask(${tempVar}, ${action.keep}, '${escapeTsString(action.char)}', '${format}')`;
    case 'hash':
      return `hash(${tempVar}, '${action.algorithm}', '${action.saltScope}')`;
    case 'tokenize':
      return `tokenize(${tempVar}, '${escapeTsString(action.namespace)}', ${action.preserveFormat ? 'true' : 'false'}, '${format}')`;
    case 'generalize':
      return `generalize(${tempVar}, '${action.granularity}')`;
    default:
      return tempVar;
  }
}

export function emitTypescript(policy: Policy): string {
  const lines: string[] = [...HELPER_BLOCK];
  lines.push('');
  const fnName = `apply${toPascalCase(policy.name)}Redactions`;
  lines.push(`export function ${fnName}(record: SrlcRecord): SrlcRecord {`);
  lines.push('  const next: SrlcRecord = { ...record };');
  lines.push('');
  policy.fields.forEach((field, index) => {
    const key = escapeTsString(field.path);
    const tempVar = `current${index}`;
    lines.push('  {');
    lines.push(`    const original = record['${key}'];`);
    lines.push(`    let ${tempVar}: NullableString = original == null ? null : String(original);`);
    field.transforms.forEach((action) => {
      const expr = applyActionExpression(tempVar, action, field.format);
      lines.push(`    ${tempVar} = ${expr};`);
    });
    lines.push(`    next['${key}'] = ${tempVar};`);
    lines.push(`    // ${canonicalTransformSignature(field)}`);
    lines.push('  }');
    lines.push('');
  });
  if (policy.fields.length === 0) {
    lines.push('  // No field rules defined for this policy.');
    lines.push('');
  }
  lines.push('  return next;');
  lines.push('}');
  return lines.join('\n');
}
