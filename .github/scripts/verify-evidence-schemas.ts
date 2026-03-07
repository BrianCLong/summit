import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type EvidenceTemplate = Record<string, unknown>;

const root = process.cwd();
const templateDir = path.join(root, 'src/agents/evidence/templates');

const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function scanForTimestamp(value: unknown, pathStack: string[] = []): string[] {
  if (typeof value === 'string' && timestampPattern.test(value)) {
    return [`${pathStack.join('.') || '<root>'}=${value}`];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanForTimestamp(entry, [...pathStack, String(index)]),
    );
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      scanForTimestamp(entry, [...pathStack, key]),
    );
  }

  return [];
}

function validateReportTemplate(payload: EvidenceTemplate): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(payload.evidence_id)) errors.push('report.evidence_id missing');
  if (!isNonEmptyString(payload.item)) errors.push('report.item missing');
  if (!isNonEmptyString(payload.summary)) errors.push('report.summary missing');
  const artifacts = payload.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    errors.push('report.artifacts must be a non-empty array');
  }
  return errors;
}

function validateMetricsTemplate(payload: EvidenceTemplate): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(payload.evidence_id)) errors.push('metrics.evidence_id missing');
  if (!payload.metrics || typeof payload.metrics !== 'object') {
    errors.push('metrics.metrics must be an object');
  }
  return errors;
}

function validateStampTemplate(payload: EvidenceTemplate): string[] {
  const errors: string[] = [];
  if (!isNonEmptyString(payload.created_at)) errors.push('stamp.created_at missing');
  if (!isNonEmptyString(payload.git_sha)) errors.push('stamp.git_sha missing');
  return errors;
}

function validateIndexTemplate(payload: EvidenceTemplate): string[] {
  const errors: string[] = [];
  const entries = payload.evidence;
  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push('index.evidence must be a non-empty array');
    return errors;
  }

  for (const [i, entry] of entries.entries()) {
    if (!entry || typeof entry !== 'object') {
      errors.push(`index.evidence[${i}] must be an object`);
      continue;
    }
    const value = entry as Record<string, unknown>;
    if (!isNonEmptyString(value.evidence_id)) {
      errors.push(`index.evidence[${i}].evidence_id missing`);
    }
    const paths = value.paths as Record<string, unknown> | undefined;
    if (!paths || typeof paths !== 'object') {
      errors.push(`index.evidence[${i}].paths missing`);
      continue;
    }
    for (const key of ['report', 'metrics', 'stamp']) {
      if (!isNonEmptyString(paths[key])) {
        errors.push(`index.evidence[${i}].paths.${key} missing`);
      }
    }
  }

  return errors;
}

const validators: Array<{
  template: string;
  validate: (payload: EvidenceTemplate) => string[];
}> = [
  { template: 'report.json', validate: validateReportTemplate },
  { template: 'metrics.json', validate: validateMetricsTemplate },
  { template: 'stamp.json', validate: validateStampTemplate },
  { template: 'evidence.index.json', validate: validateIndexTemplate },
];

const errors: string[] = [];

for (const { template, validate } of validators) {
  const fullPath = path.join(templateDir, template);
  const payload = JSON.parse(await readFile(fullPath, 'utf8')) as EvidenceTemplate;
  errors.push(...validate(payload).map((msg) => `${template}: ${msg}`));

  if (template !== 'stamp.json') {
    const timestampFindings = scanForTimestamp(payload);
    if (timestampFindings.length > 0) {
      errors.push(
        `${template}: timestamp policy violation: ${timestampFindings.join(', ')}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Evidence schemas validated successfully.');
