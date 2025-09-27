import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { DatasetDiff, GovernanceActionPlan } from './types.js';

export function readDatasetDiff(diffPath: string): DatasetDiff {
  const resolved = path.resolve(diffPath);
  const content = fs.readFileSync(resolved, 'utf8');

  try {
    return JSON.parse(content) as DatasetDiff;
  } catch (jsonError) {
    try {
      const parsed = yaml.load(content);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Unsupported diff format at ${resolved}`);
      }
      return parsed as DatasetDiff;
    } catch (yamlError) {
      throw new Error(`Unable to parse dataset diff: ${(jsonError as Error).message}; ${(yamlError as Error).message}`);
    }
  }
}

export function writePlanYaml(plan: GovernanceActionPlan, destination?: string): string {
  const doc = yaml.dump(plan, { sortKeys: true, lineWidth: 120, noRefs: true });
  if (destination) {
    fs.writeFileSync(path.resolve(destination), doc, 'utf8');
  }
  return doc;
}

export function readPlanYaml(planPath: string): GovernanceActionPlan {
  const resolved = path.resolve(planPath);
  const content = fs.readFileSync(resolved, 'utf8');
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Plan YAML does not contain a valid object.');
  }
  return parsed as GovernanceActionPlan;
}

export function writeSimulationSnapshot(snapshot: unknown, destination?: string): string {
  const serialized = JSON.stringify(snapshot, null, 2);
  if (destination) {
    fs.writeFileSync(path.resolve(destination), `${serialized}\n`, 'utf8');
  }
  return serialized;
}
