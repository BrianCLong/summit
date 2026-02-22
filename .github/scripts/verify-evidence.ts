import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type CheckMode = 'schemas' | 'index' | 'all';

type EvidenceFile = {
  fileName: string;
  schemaName: string;
  mode: CheckMode;
};

const timestampKeyPattern = /^(timestamp|created_at|updated_at|createdAt|updatedAt|retrieved_at|retrievedAt)$/i;

const schemaDir = path.resolve('docs/governance/evidence/schemas');

const evidenceFiles: EvidenceFile[] = [
  { fileName: 'report.json', schemaName: 'report.schema.json', mode: 'schemas' },
  { fileName: 'metrics.json', schemaName: 'metrics.schema.json', mode: 'schemas' },
  { fileName: 'stamp.json', schemaName: 'stamp.schema.json', mode: 'schemas' },
  { fileName: 'index.json', schemaName: 'index.schema.json', mode: 'index' },
];

const args = process.argv.slice(2);
const getArgValue = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
};

const evidenceDir = path.resolve(getArgValue('--evidence-dir') ?? 'evidence');
const check = (getArgValue('--check') ?? 'all') as CheckMode;

const shouldRun = (mode: CheckMode): boolean => check === 'all' || check === mode;

const loadJson = async (filePath: string) => {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const findTimestampKeys = (value: unknown, basePath: string, results: string[]) => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findTimestampKeys(item, `${basePath}[${index}]`, results);
    });
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    if (timestampKeyPattern.test(key)) {
      results.push(nextPath);
    }
    findTimestampKeys(nested, nextPath, results);
  }
};

type VerificationOptions = {
  evidenceDir?: string;
  check?: CheckMode;
};

export type VerificationResult = {
  success: boolean;
  failures: string[];
};

export const verifyEvidence = async (
  options: VerificationOptions = {},
): Promise<VerificationResult> => {
  const resolvedEvidenceDir = path.resolve(options.evidenceDir ?? evidenceDir);
  const resolvedCheck = options.check ?? check;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const failures: string[] = [];

  for (const entry of evidenceFiles) {
    if (!(resolvedCheck === 'all' || resolvedCheck === entry.mode)) {
      continue;
    }

    const evidencePath = path.join(resolvedEvidenceDir, entry.fileName);
    const schemaPath = path.join(schemaDir, entry.schemaName);

    try {
      await fs.access(evidencePath);
    } catch (error) {
      failures.push(`Missing evidence file: ${evidencePath}`);
      continue;
    }

    try {
      await fs.access(schemaPath);
    } catch (error) {
      failures.push(`Missing schema file: ${schemaPath}`);
      continue;
    }

    const [payload, schema] = await Promise.all([
      loadJson(evidencePath),
      loadJson(schemaPath),
    ]);

    const validate = ajv.compile(schema);
    const valid = validate(payload);
    if (!valid) {
      const details = ajv.errorsText(validate.errors, { separator: '\n' });
      failures.push(`Schema validation failed for ${entry.fileName}:\n${details}`);
    }

    if (entry.fileName !== 'stamp.json') {
      const timestampKeys: string[] = [];
      findTimestampKeys(payload, '', timestampKeys);
      if (timestampKeys.length > 0) {
        failures.push(
          `Timestamp fields are only allowed in stamp.json. Found in ${entry.fileName}: ${timestampKeys.join(
            ', ',
          )}`,
        );
      }
    }
  }

  return { success: failures.length === 0, failures };
};

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  verifyEvidence()
    .then((result) => {
      if (!result.success) {
        console.error('Evidence verification failed:');
        for (const failure of result.failures) {
          console.error(`- ${failure}`);
        }
        process.exit(1);
      }
      console.log('Evidence verification passed.');
    })
    .catch((error) => {
      console.error('Evidence verification failed with an unexpected error.');
      console.error(error);
      process.exit(1);
    });
}
