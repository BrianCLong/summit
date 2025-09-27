import { readFile } from 'node:fs/promises';
import {
  DataClassChange,
  DataClassDefinition,
  TaxonomyDiff,
  TaxonomyDocument,
} from './types.js';

export const loadTaxonomy = async (
  filePath: string,
): Promise<TaxonomyDocument> => {
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as TaxonomyDocument;

  if (!parsed.version) {
    throw new Error(`Taxonomy at ${filePath} is missing a version field.`);
  }

  if (!Array.isArray(parsed.dataClasses)) {
    throw new Error(
      `Taxonomy at ${filePath} must include a dataClasses array.`,
    );
  }

  parsed.dataClasses.forEach((item) => {
    if (!item.id) {
      throw new Error(`Encountered data class without id in ${filePath}.`);
    }
    if (!Array.isArray(item.lawfulBases)) {
      throw new Error(`Data class ${item.id} is missing lawfulBases array.`);
    }
    if (typeof item.retentionMinimumDays !== 'number') {
      throw new Error(
        `Data class ${item.id} is missing retentionMinimumDays number.`,
      );
    }
  });

  return parsed;
};

const toMap = (
  dataClasses: DataClassDefinition[],
): Map<string, DataClassDefinition> => {
  return new Map(dataClasses.map((item) => [item.id, item]));
};

const diffArray = (before: string[], after: string[]): boolean => {
  if (before.length !== after.length) {
    return true;
  }

  const sortedBefore = [...before].sort();
  const sortedAfter = [...after].sort();

  for (let index = 0; index < sortedBefore.length; index += 1) {
    if (sortedBefore[index] !== sortedAfter[index]) {
      return true;
    }
  }

  return false;
};

const diffNumbers = (before: number, after: number): boolean =>
  before !== after;

export const diffTaxonomies = (
  baseline: TaxonomyDocument,
  updated: TaxonomyDocument,
): TaxonomyDiff => {
  const baselineMap = toMap(baseline.dataClasses);
  const updatedMap = toMap(updated.dataClasses);

  const added: DataClassDefinition[] = [];
  const removed: DataClassDefinition[] = [];
  const updatedChanges: DataClassChange[] = [];

  for (const [id, dataClass] of updatedMap.entries()) {
    if (!baselineMap.has(id)) {
      added.push(dataClass);
    }
  }

  for (const [id, dataClass] of baselineMap.entries()) {
    if (!updatedMap.has(id)) {
      removed.push(dataClass);
    }
  }

  for (const [id, updatedClass] of updatedMap.entries()) {
    const baselineClass = baselineMap.get(id);

    if (!baselineClass) {
      continue;
    }

    const delta: DataClassChange['delta'] = {};
    let mutated = false;

    if (diffArray(baselineClass.lawfulBases, updatedClass.lawfulBases)) {
      delta.lawfulBases = {
        before: baselineClass.lawfulBases,
        after: updatedClass.lawfulBases,
      };
      mutated = true;
    }

    if (
      diffNumbers(
        baselineClass.retentionMinimumDays,
        updatedClass.retentionMinimumDays,
      )
    ) {
      delta.retentionMinimumDays = {
        before: baselineClass.retentionMinimumDays,
        after: updatedClass.retentionMinimumDays,
      };
      mutated = true;
    }

    if (
      (baselineClass.description || updatedClass.description) &&
      baselineClass.description !== updatedClass.description
    ) {
      delta.description = {
        before: baselineClass.description,
        after: updatedClass.description,
      };
      mutated = true;
    }

    if (mutated) {
      updatedChanges.push({
        id,
        type: 'updated',
        before: baselineClass,
        after: updatedClass,
        delta,
      });
    }
  }

  added.sort((a, b) => a.id.localeCompare(b.id));
  removed.sort((a, b) => a.id.localeCompare(b.id));
  updatedChanges.sort((a, b) => a.id.localeCompare(b.id));

  return { added, removed, updated: updatedChanges };
};
