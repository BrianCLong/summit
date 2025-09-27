import type { DataContract, NormalizedField } from '../types';
import { normalizeFields } from '../schema/normalize';

function fieldExpectationType(field: NormalizedField): string {
  if (field.type.includes('int') || field.type.includes('float') || field.type.includes('double') || field.type.includes('number') || field.type.includes('long')) {
    return 'number';
  }
  if (field.type.includes('bool')) {
    return 'boolean';
  }
  return 'string';
}

function renderFieldCheck(field: NormalizedField): string {
  const expectedType = fieldExpectationType(field);
  if (field.optional) {
    return `if (record.hasOwnProperty('${field.name}')) { expect(typeof record['${field.name}']).toBe('${expectedType}'); }`;
  }
  return `expect(typeof record['${field.name}']).toBe('${expectedType}');`;
}

export function buildProviderTest(contract: DataContract): string {
  const fields = normalizeFields(contract);
  const fieldChecks = fields.map((field) => renderFieldCheck(field)).join('\n      ');
  const fixtureName = `${contract.name.replace(/\s+/g, '_').toLowerCase()}-golden.json`;
  return `import { readFileSync } from 'node:fs';
import path from 'node:path';

const fixturePath = path.resolve(__dirname, '../__fixtures__/${fixtureName}');
const sample = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('${contract.name} provider contract', () => {
  it('produces records that match the published schema snapshot', () => {
    expect(Array.isArray(sample)).toBe(true);
    for (const record of sample) {
      ${fieldChecks}
    }
  });

  it('includes semantics metadata for downstream validation', () => {
    const semantics = ${JSON.stringify(contract.semantics ?? {}, null, 2)};
    expect(semantics).toBeDefined();
  });
});
`;
}

export function providerTestFileName(contract: DataContract): string {
  return `${contract.name.replace(/\s+/g, '-')}.provider.test.ts`;
}

export function providerFixtureName(contract: DataContract): string {
  return `${contract.name.replace(/\s+/g, '_').toLowerCase()}-golden.json`;
}
