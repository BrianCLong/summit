const fs = require('node:fs/promises');
const path = require('node:path');

const timestampKeys = new Set([
  'generated_at',
  'created_at',
  'updated_at',
  'timestamp',
  'time',
]);

const collectTimestampKeys = (value, hits = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectTimestampKeys(item, hits));
    return hits;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      if (timestampKeys.has(key)) {
        hits.push(key);
      }
      collectTimestampKeys(child, hits);
    });
  }

  return hits;
};

describe('AIBREAKPOINT20260205 sample evidence pack', () => {
  const sampleDir = path.resolve(
    __dirname,
    '..',
    '..',
    'evidence',
    'AIBREAKPOINT20260205',
    'sample-run',
  );

  const readJson = async (filename) => {
    const payload = await fs.readFile(path.join(sampleDir, filename), 'utf8');
    return JSON.parse(payload);
  };

  it('stores timestamps only in stamp.json', async () => {
    const report = await readJson('report.json');
    const metrics = await readJson('metrics.json');
    const stamp = await readJson('stamp.json');

    expect(collectTimestampKeys(report)).toEqual([]);
    expect(collectTimestampKeys(metrics)).toEqual([]);
    expect(collectTimestampKeys(stamp)).toContain('generated_at');
  });
});
