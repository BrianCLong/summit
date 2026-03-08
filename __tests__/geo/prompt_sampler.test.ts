import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { PromptSampler } from '../../agentic_web_visibility/geo/src/prompt_sampler.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('PromptSampler generates deterministic prompts based on taxonomy', () => {
    const taxonomyPath = path.join(__dirname, '../../agentic_web_visibility/geo/prompt_taxonomy.yaml');
    const sampler = new PromptSampler(taxonomyPath);
    const prompts = sampler.generateDeterministicPrompts();

    assert.ok(prompts.length > 0, 'Should generate at least one prompt');
    assert.strictEqual(prompts[0].id, 'GEO:PROMPT:001');
    assert.strictEqual(typeof prompts[0].weight, 'number');
    assert.ok(prompts[0].text.includes('best'), 'Prompt text should be constructed correctly');
});
