import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { MetricSpec, SpecRecord } from './types';
import { createSpecSignature } from './utils';

export function loadSpecFromFile(filePath: string): SpecRecord {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parse(content) as MetricSpec;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid spec structure in ${filePath}`);
  }
  validateSpec(parsed, filePath);
  const signature = createSpecSignature(parsed);
  return { spec: parsed, absolutePath: filePath, signature };
}

export function discoverSpecFiles(specRoot: string): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        results.push(abs);
      }
    }
  };
  walk(specRoot);
  return results.sort();
}

function validateSpec(spec: MetricSpec, filePath: string): void {
  if (!spec.name) {
    throw new Error(`Spec ${filePath} is missing required field 'name'.`);
  }
  if (typeof spec.version !== 'number') {
    throw new Error(`Spec ${spec.name} is missing numeric 'version'.`);
  }
  if (!Array.isArray(spec.grain) || spec.grain.length === 0) {
    throw new Error(`Spec ${spec.name} must define at least one grain column.`);
  }
  if (!spec.source) {
    throw new Error(`Spec ${spec.name} must define a source table or view.`);
  }
  if (!Array.isArray(spec.measures) || spec.measures.length === 0) {
    throw new Error(`Spec ${spec.name} must define at least one measure.`);
  }
  if (!Array.isArray(spec.owners) || spec.owners.length === 0) {
    throw new Error(`Spec ${spec.name} must define at least one owner.`);
  }
}
