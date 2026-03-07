import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { GeoScoringEngine } from '../../agentic_web_visibility/geo/src/scoring/index.js';

test('GeoScoringEngine calculates separate layers and corrected lift', () => {
    const engine = new GeoScoringEngine();

    // Test case 1: High visibility, high prior
    const score1 = engine.calculateScore(
        'HubSpot',
        'hubspot.com',
        'recommendation',
        { name: 'HubSpot', mentions: 2, recommended: true, rank: 1 },
        [{ domain: 'hubspot.com', url: 'https://hubspot.com', mentions: 2 }]
    );

    assert.strictEqual(score1.selection, 1.0); // 0.35 + 0.2 + 0.45
    assert.strictEqual(score1.attribution, 0.7); // 0.5 + 0.2
    assert.strictEqual(score1.upstreamPrior, 0.8);
    // Lift: (1.0 * 0.7 + 0.7 * 0.3) - 0.8 = 0.91 - 0.8 = 0.11
    assert.ok(Math.abs(score1.correctedLift - 0.11) < 0.001);

    // Test case 2: Low visibility, high prior (Engine penalized the brand vs search)
    const score2 = engine.calculateScore(
        'Salesforce',
        'salesforce.com',
        'recommendation',
        undefined, // Not selected
        [] // No citations
    );

    assert.strictEqual(score2.selection, 0.0);
    assert.strictEqual(score2.attribution, 0.0);
    assert.strictEqual(score2.upstreamPrior, 0.9);
    // Lift: 0 - 0.9 = -0.9
    assert.strictEqual(score2.correctedLift, -0.9);
});
