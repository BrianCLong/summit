import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

type FlakeRegistry = {
  version: number;
  flakes: FlakeEntry[];
};

export type FlakeEntry = {
  id: string;
  scope: 'unit-test' | 'integration-test' | 'workflow-job' | 'lint-rule';
  target: string;
  owner: string;
  ticket: string;
  created: string;
  expires: string;
  rationale: string;
  mitigation: string;
};

export type FlakeRegistryValidationResult = {
  registry: FlakeRegistry;
  errors: string[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function loadFlakeRegistry(registryPath = path.join('.github', 'flake-registry.yml')): FlakeRegistry {
  const absolutePath = path.resolve(registryPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Flake registry not found at ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, 'utf8');
  const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as FlakeRegistry;
  if (!parsed || !Array.isArray(parsed.flakes)) {
    throw new Error('Flake registry is missing required "flakes" array.');
  }
  return parsed;
}

export function loadFlakeSchema(schemaPath = path.join('schemas', 'flake-registry.schema.json')): object {
  const absolutePath = path.resolve(schemaPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Flake registry schema not found at ${absolutePath}`);
  }
  const schemaContent = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(schemaContent) as object;
}

export function validateAgainstSchema(registry: FlakeRegistry, schemaPath?: string): string[] {
  const schema = loadFlakeSchema(schemaPath);
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(registry);
  if (valid) {
    return [];
  }
  return (validate.errors ?? []).map((error) => `${error.instancePath || 'registry'} ${error.message ?? 'invalid'}`.trim());
}

export function parseDate(date: string): Date {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }
  return parsed;
}

export function daysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function isBroadTarget(target: string): boolean {
  const lowered = target.toLowerCase();
  if (lowered.includes('all tests') || lowered.includes('all-test') || lowered.includes('all jobs')) {
    return true;
  }
  if (target.includes('*') || target.includes('**')) {
    return true;
  }
  if (/(^|\s)(server|client|packages|services|apps)\//i.test(target) && target.includes('**')) {
    return true;
  }
  if (lowered === 'all' || lowered === 'any') {
    return true;
  }
  return false;
}

export function getFlakeById(registry: FlakeRegistry, id: string): FlakeEntry | undefined {
  return registry.flakes.find((flake) => flake.id === id);
}

export function ensureUniqueIds(registry: FlakeRegistry): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const flake of registry.flakes) {
    if (seen.has(flake.id)) {
      duplicates.push(flake.id);
    }
    seen.add(flake.id);
  }
  return duplicates;
}

export function validateDates(entry: FlakeEntry, today: Date, maxDurationDays: number): string[] {
  const errors: string[] = [];
  const created = parseDate(entry.created);
  const expires = parseDate(entry.expires);
  if (expires < today) {
    errors.push(`${entry.id}: expires ${entry.expires} is in the past.`);
  }
  if (expires < created) {
    errors.push(`${entry.id}: expires ${entry.expires} is before created ${entry.created}.`);
  }
  const duration = daysBetween(created, expires);
  if (duration > maxDurationDays) {
    errors.push(`${entry.id}: duration ${duration}d exceeds max ${maxDurationDays}d.`);
  }
  return errors;
}

export function collectValidationErrors(
  registry: FlakeRegistry,
  options: { maxDurationDays: number; allowLonger: Set<string> },
): string[] {
  const errors: string[] = [];
  const duplicates = ensureUniqueIds(registry);
  if (duplicates.length > 0) {
    errors.push(`Duplicate flake ids: ${duplicates.join(', ')}`);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (const entry of registry.flakes) {
    if (!entry.owner || !entry.ticket) {
      errors.push(`${entry.id}: owner and ticket are required.`);
    }
    if (isBroadTarget(entry.target)) {
      errors.push(`${entry.id}: target "${entry.target}" is too broad.`);
    }
    if (!options.allowLonger.has(entry.id)) {
      errors.push(...validateDates(entry, today, options.maxDurationDays));
    }
  }

  return errors;
}

export function validateFlakeRegistry(
  registryPath?: string,
  schemaPath?: string,
  options?: { maxDurationDays?: number; allowLonger?: Set<string> },
): FlakeRegistryValidationResult {
  const registry = loadFlakeRegistry(registryPath);
  const schemaErrors = validateAgainstSchema(registry, schemaPath);
  const maxDurationDays = options?.maxDurationDays ?? 14;
  const allowLonger = options?.allowLonger ?? new Set<string>();
  const ruleErrors = collectValidationErrors(registry, { maxDurationDays, allowLonger });
  return { registry, errors: [...schemaErrors, ...ruleErrors] };
}
