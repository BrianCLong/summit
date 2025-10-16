import { buildMigrationPlan, MigrationPlanError } from '../src/plan-builder.js';
import type { MigrationDefinition, MigrationRecord } from '../src/types.js';

const migration = (id: string, dependencies?: string[]): MigrationDefinition => {
  const base: MigrationDefinition = {
    id,
    up: async () => undefined,
    down: async () => undefined,
  };
  return dependencies ? { ...base, dependencies } : base;
};

describe('buildMigrationPlan', () => {
  it('orders migrations based on dependencies', () => {
    const definitions: MigrationDefinition[] = [
      migration('a'),
      migration('b', ['a']),
      migration('c', ['b']),
    ];
    const applied: MigrationRecord[] = [];

    const plan = buildMigrationPlan(definitions, { applied });

    expect(plan.map((item) => item.definition.id)).toEqual(['a', 'b', 'c']);
  });

  it('throws when dependencies are missing', () => {
    const definitions: MigrationDefinition[] = [migration('b', ['missing'])];

    expect(() => buildMigrationPlan(definitions, { applied: [] })).toThrow(MigrationPlanError);
  });

  it('ignores already applied migrations', () => {
    const definitions: MigrationDefinition[] = [migration('a'), migration('b')];
    const applied: MigrationRecord[] = [
      { id: 'a', version: 'a', checksum: '1', appliedAt: new Date().toISOString(), durationMs: 10 },
    ];

    const plan = buildMigrationPlan(definitions, { applied });
    expect(plan.map((item) => item.definition.id)).toEqual(['b']);
  });

  it('cuts plan at target migration', () => {
    const definitions: MigrationDefinition[] = [migration('a'), migration('b'), migration('c')];
    const plan = buildMigrationPlan(definitions, { applied: [], target: 'b' });
    expect(plan.map((item) => item.definition.id)).toEqual(['a', 'b']);
  });

  it('throws when encountering cycles', () => {
    const definitions: MigrationDefinition[] = [
      migration('a', ['b']),
      migration('b', ['a']),
    ];

    expect(() => buildMigrationPlan(definitions, { applied: [] })).toThrow(MigrationPlanError);
  });
});
