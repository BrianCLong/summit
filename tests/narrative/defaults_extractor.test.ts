import { extractDefaults } from '../../src/narrative/inference/defaults_extractor';
import { findSupportSpan } from '../../src/narrative/inference/support_spans';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Interpretive Defaults Extractor', () => {
  const fixturesPath = join(__dirname, 'fixtures', 'interpretive_defaults.json');
  const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));

  test('Finds support span correctly', () => {
    const doc = fixtures[0];
    const span = findSupportSpan(doc.text, 'obviously', doc.doc_id);
    expect(span).not.toBeNull();
    expect(span?.text).toBe('obviously');
    expect(span?.doc_id).toBe('doc1');
  });

  test('Extracts defaults based on rules', async () => {
    const doc = fixtures[0];
    const defaults = await extractDefaults(doc.text, doc.doc_id);

    expect(defaults).toHaveLength(1);
    expect(defaults[0].assumption_type).toBe('presupposition');
    expect(defaults[0].support_spans).toHaveLength(1);
    expect(defaults[0].support_spans[0].text).toBe('obviously');
    expect(defaults[0].default_id).toMatch(/^ev:default:/);
  });

  test('Extracts causal links', async () => {
    const doc = fixtures[1];
    const defaults = await extractDefaults(doc.text, doc.doc_id);

    expect(defaults).toHaveLength(1);
    expect(defaults[0].assumption_type).toBe('causal_link');
  });
});
