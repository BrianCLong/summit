import { test } from 'node:test';
import * as assert from 'node:assert';
import { PersonaFusionEngine } from '../../src/personas/fusion_engine';
import { PlatformAccount } from '../../src/personas/identity_graph';

test('fuse merges similar accounts without deception', () => {
    const engine = new PersonaFusionEngine();
    const accounts: PlatformAccount[] = [
        { platform: 'X', account_handle: 'haxor1', account_id: 'x_1', language: 'en', location: 'US', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
        { platform: 'Telegram', account_handle: 'haxor1_tg', account_id: 'tg_1', language: 'en', location: 'US', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
    ];
    const candidateScores = new Map<string, number>();
    const result = engine.fuse(accounts, candidateScores);
    assert.strictEqual(result.personas.length, 1);
    const p = result.personas[0];
    assert.strictEqual(p.deception_profile, 'NONE');
    assert.strictEqual(p.platforms_count, 2);
    assert.strictEqual(p.accounts_count, 2);
});

test('detectDeception flags contradictory datasets', () => {
    const engine = new PersonaFusionEngine();
    const accounts: PlatformAccount[] = [
        { platform: 'X', account_handle: 'haxor1', account_id: 'x_1', language: 'en', location: 'US', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
        { platform: 'Telegram', account_handle: 'haxor1_tg', account_id: 'tg_1', language: 'ru', location: 'RU', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
    ];
    const candidateScores = new Map<string, number>();
    const result = engine.fuse(accounts, candidateScores);

    assert.strictEqual(result.personas.length, 1);
    const p = result.personas[0];
    assert.strictEqual(p.deception_profile, 'ANTI_LINKAGE_TACTICS');
    assert.ok(result.links[0].link_type === 'CONTRADICTED_LINK');
});

test('explain_persona details evidence for and against', () => {
    const engine = new PersonaFusionEngine();
    const accounts: PlatformAccount[] = [
        { platform: 'X', account_handle: '1', account_id: '1', language: 'en', location: 'US', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
        { platform: 'Telegram', account_handle: '2', account_id: '2', language: 'ru', location: 'US', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
    ];
    const result = engine.fuse(accounts, new Map<string, number>());
    const explanation = engine.explain_persona(result.personas[0].persona_id, accounts, result.links);
    assert.ok(explanation.includes('Evidence AGAINST Linkage'));
    assert.ok(explanation.includes('linguistic divergence'));
});
