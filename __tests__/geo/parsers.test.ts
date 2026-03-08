import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { AnswerParser } from '../../agentic_web_visibility/geo/src/parsers/answer_parser.js';
import { CitationParser } from '../../agentic_web_visibility/geo/src/parsers/citation_parser.js';

test('AnswerParser extracts brands', () => {
    const parser = new AnswerParser(['HubSpot', 'Salesforce']);
    const answer = `The top CRM tools are:
    1. HubSpot - Best for startups
    2. Salesforce - Good for enterprise
    HubSpot is highly recommended.`;

    const entities = parser.parse(answer);

    assert.strictEqual(entities.length, 2);

    const hubspot = entities.find(e => e.name === 'HubSpot');
    assert.ok(hubspot);
    assert.strictEqual(hubspot.mentions, 2);
    assert.strictEqual(hubspot.recommended, true);
    assert.strictEqual(hubspot.rank, 1);

    const salesforce = entities.find(e => e.name === 'Salesforce');
    assert.ok(salesforce);
    assert.strictEqual(salesforce.mentions, 1);
    assert.strictEqual(salesforce.recommended, false);
    assert.strictEqual(salesforce.rank, 2);
});

test('CitationParser extracts citations', () => {
    const parser = new CitationParser();
    const citations = [
        'https://hubspot.com/pricing',
        'hubspot.com/blog',
        'https://www.salesforce.com'
    ];

    const extracted = parser.parse(citations);

    assert.strictEqual(extracted.length, 2);

    const hubspot = extracted.find(c => c.domain === 'hubspot.com');
    assert.ok(hubspot);
    assert.strictEqual(hubspot.mentions, 2);

    const salesforce = extracted.find(c => c.domain === 'salesforce.com');
    assert.ok(salesforce);
    assert.strictEqual(salesforce.mentions, 1);
});
