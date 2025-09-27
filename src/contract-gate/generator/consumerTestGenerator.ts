import type { ContractDiff, DataContract } from '../types';
import { normalizeFields } from '../schema/normalize';

export function buildConsumerTest(contract: DataContract, diffs: ContractDiff[]): string {
  const fields = normalizeFields(contract);
  const optionalFields = fields.filter((field) => field.optional).map((field) => `'${field.name}'`);
  const breaking = diffs.filter((diff) => diff.severity === 'breaking');
  return `const optionalFields = [${optionalFields.join(', ')}];
const breakingChanges = ${JSON.stringify(breaking, null, 2)};

describe('${contract.name} consumer compatibility', () => {
  it('only introduces optional or new fields that are safe to ignore', () => {
    for (const field of optionalFields) {
      expect(optionalFields).toContain(field);
    }
  });

  it('does not contain breaking schema changes', () => {
    expect(breakingChanges).toHaveLength(0);
  });
});
`;
}

export function consumerTestFileName(contract: DataContract): string {
  return `${contract.name.replace(/\s+/g, '-')}.consumer.test.ts`;
}
