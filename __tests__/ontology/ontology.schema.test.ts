import * as fs from 'fs';
import * as path from 'path';
import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/ontology.schema.json');

describe('Ontology Schema validation', () => {
  it('schema file exists', () => {
    assert.strictEqual(fs.existsSync(schemaPath), true);
  });

  it('schema has correct structure', () => {
    const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert.strictEqual(schemaContent.$id, 'summit.ai-influence-campaign.ontology.v0');
    assert.strictEqual(schemaContent.type, 'object');
    assert.ok(schemaContent.required.includes('campaign_id'));
    assert.ok(schemaContent.required.includes('actor_ids'));
    assert.ok(schemaContent.required.includes('objectives'));
    assert.ok(schemaContent.required.includes('tactics'));
    assert.ok(schemaContent.required.includes('evidence'));
  });
});
