import { computeChecksum } from './checksum.js';
import type { MigrationDefinition, MigrationMeta, MigrationRecord, PlannedMigration } from './types.js';

export class MigrationPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationPlanError';
  }
}

export interface BuildPlanOptions {
  readonly target?: string;
  readonly applied: readonly MigrationRecord[];
}

export function buildMigrationPlan(
  definitions: readonly MigrationDefinition[],
  options: BuildPlanOptions
): PlannedMigration[] {
  const map = new Map(definitions.map((definition) => [definition.id, definition] as const));
  if (map.size !== definitions.length) {
    throw new MigrationPlanError('Duplicate migration ids detected');
  }

  const dependencyGraph = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const definition of definitions) {
    const dependencies = definition.dependencies ?? [];
    dependencyGraph.set(definition.id, new Set(dependencies));
    for (const dependency of dependencies) {
      if (!map.has(dependency)) {
        throw new MigrationPlanError(`Migration ${definition.id} depends on missing migration ${dependency}`);
      }
      if (!dependents.has(dependency)) {
        dependents.set(dependency, new Set());
      }
      dependents.get(dependency)?.add(definition.id);
    }
  }

  const appliedSet = new Set(options.applied.map((record) => record.id));
  const plan: PlannedMigration[] = [];
  const queue: string[] = definitions
    .filter((definition) => (dependencyGraph.get(definition.id)?.size ?? 0) === 0)
    .map((definition) => definition.id);

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      break;
    }
    const definition = map.get(id);
    if (!definition) {
      continue;
    }
    const metaBase: MigrationMeta = {
      id: definition.id,
      version: definition.version ?? definition.id,
      checksum: computeChecksum(definition),
      dependencies: [...(definition.dependencies ?? [])],
    };
    const meta = definition.title ? { ...metaBase, title: definition.title } : metaBase;

    const alreadyApplied = appliedSet.has(id);
    if (!alreadyApplied) {
      plan.push({ definition, meta });
    }

    for (const dependent of dependents.get(id) ?? []) {
      const graphEntry = dependencyGraph.get(dependent);
      graphEntry?.delete(id);
      if (graphEntry && graphEntry.size === 0) {
        queue.push(dependent);
      }
    }
  }

  if (plan.length === 0 && definitions.some((definition) => !appliedSet.has(definition.id))) {
    throw new MigrationPlanError('Cycle detected in migration dependencies');
  }

  const targetIndex = options.target
    ? plan.findIndex((planned) => planned.definition.id === options.target || planned.meta.version === options.target)
    : -1;
  if (targetIndex >= 0) {
    return plan.slice(0, targetIndex + 1);
  }
  return plan;
}
