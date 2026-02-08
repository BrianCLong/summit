import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvidenceBundle } from '../../../src/agents/compound/evidence/validate.js';

type FixtureResult = ReturnType<typeof validateEvidenceBundle>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name: string): FixtureResult {
  return validateEvidenceBundle(path.join(fixturesDir, name));
}

describe('compound evidence validation', () => {
  it('accepts a valid minimal bundle', () => {
    const result = loadFixture('valid-minimal');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a bundle missing plan', () => {
    const result = loadFixture('missing-plan');
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('report.json');
  });

  it('rejects a bundle with invalid index schema', () => {
    const result = loadFixture('invalid-index');
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('index.json');
  });
});
