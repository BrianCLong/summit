import * as fs from 'fs';
import * as path from 'path';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { fileURLToPath } from 'url';
import { normalizeFixtures } from '../../analysis/ontology/normalize-ai-influence-campaign';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Ontology Determinism', () => {
  const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');

  it('should produce identical normalized results on repeated runs', () => {
    const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    const fixturePaths = fixtureFiles.map(f => path.join(fixturesDir, f));

    const run1 = normalizeFixtures(fixturePaths);
    const run2 = normalizeFixtures(fixturePaths);

    assert.deepStrictEqual(run1, run2);
    assert.strictEqual(JSON.stringify(run1), JSON.stringify(run2));
  });
});
