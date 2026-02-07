import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type TimestampFinding = { path: string; value: string };

const root = process.cwd();
const schemaDir = path.join(root, 'src/agents/evidence/schemas');
const templateDir = path.join(root, 'src/agents/evidence/templates');

const pairs: Array<[string, string]> = [
  ['report.schema.json', 'report.json'],
  ['metrics.schema.json', 'metrics.json'],
  ['stamp.schema.json', 'stamp.json'],
  ['index.schema.json', 'evidence.index.json'],
];

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const errors: string[] = [];
const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

function scanForTimestamp(value: unknown, pathStack: string[] = []): TimestampFinding[] {
  if (typeof value === 'string' && timestampPattern.test(value)) {
    return [{ path: pathStack.join('.'), value }];
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

for (const [schemaName, templateName] of pairs) {
  const schemaPath = path.join(schemaDir, schemaName);
  const templatePath = path.join(templateDir, templateName);
  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  const validate = ajv.compile(schema);

  if (!validate(template)) {
    errors.push(
      `Schema validation failed for ${templateName}: ${ajv.errorsText(validate.errors)}`,
    );
  }

  if (templateName !== 'stamp.json') {
    const timestampFindings = scanForTimestamp(template);
    if (timestampFindings.length > 0) {
      errors.push(
        `Timestamp policy violation in ${templateName}: ${timestampFindings
          .map((finding) => `${finding.path || '<root>'}=${finding.value}`)
          .join(', ')}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Evidence schemas validated successfully.');
