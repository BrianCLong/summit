import * as fs from 'fs';
import * as path from 'path';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Ontology Fixtures', () => {
  const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');

  it('should have exactly 3 fixtures', () => {
    const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    assert.strictEqual(fixtureFiles.length, 3);
    assert.ok(fixtureFiles.includes('state-io-uk-china.json'));
    assert.ok(fixtureFiles.includes('cartel-fear-amplification.json'));
    assert.ok(fixtureFiles.includes('scam-transnational-repression.json'));
  });

  it('each fixture should be valid JSON and contain campaign_id', () => {
    const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    fixtureFiles.forEach(f => {
      const content = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8'));
      assert.ok('campaign_id' in content);
      assert.ok('actor_ids' in content);
      assert.ok('objectives' in content);
      assert.ok('tactics' in content);
      assert.ok('evidence' in content);
      assert.strictEqual(Array.isArray(content.actor_ids), true);
      assert.strictEqual(Array.isArray(content.objectives), true);
      assert.strictEqual(Array.isArray(content.tactics), true);
      assert.strictEqual(Array.isArray(content.evidence), true);
    });
  });
});
