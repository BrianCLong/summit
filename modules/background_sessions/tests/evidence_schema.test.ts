import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

type TestCase = {
  schemaFile: string;
  validFixture: string;
  invalidFixture: string;
};

const testDir = dirname(fileURLToPath(import.meta.url));

const loadJson = async (relativePath: string) => {
  const filePath = join(testDir, relativePath);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
};

describe('background sessions evidence schemas', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const cases: TestCase[] = [
    {
      schemaFile: '../evidence/schemas/index.schema.json',
      validFixture: './fixtures/index.valid.json',
      invalidFixture: './fixtures/index.invalid.json',
    },
    {
      schemaFile: '../evidence/schemas/report.schema.json',
      validFixture: './fixtures/report.valid.json',
      invalidFixture: './fixtures/report.invalid.json',
    },
    {
      schemaFile: '../evidence/schemas/metrics.schema.json',
      validFixture: './fixtures/metrics.valid.json',
      invalidFixture: './fixtures/metrics.invalid.json',
    },
    {
      schemaFile: '../evidence/schemas/stamp.schema.json',
      validFixture: './fixtures/stamp.valid.json',
      invalidFixture: './fixtures/stamp.invalid.json',
    },
  ];

  test.each(cases)('validates %s fixtures', async ({
    schemaFile,
    validFixture,
    invalidFixture,
  }) => {
    const schema = await loadJson(schemaFile);
    const validate = ajv.compile(schema);

    const validData = await loadJson(validFixture);
    const invalidData = await loadJson(invalidFixture);

    expect(validate(validData)).toBe(true);
    expect(validate(invalidData)).toBe(false);
  });
});
