import { test } from 'node:test';
import * as assert from 'node:assert';
import {
    createPersonaHypothesis,
    attachPlatformAccount,
    markContestedLink,
    computePersonaMetrics,
    PersonaHypothesis,
    PlatformAccount,
    PersonaLink
} from '../../src/personas/identity_graph';

test('createPersonaHypothesis initializes correctly', () => {
    const p = createPersonaHypothesis({ risk_profile: 'SUSPECTED_ADVERSARIAL' });
    assert.strictEqual(p.risk_profile, 'SUSPECTED_ADVERSARIAL');
    assert.strictEqual(p.confidence, 'LOW');
    assert.ok(p.persona_id.startsWith('persona_'));
    assert.strictEqual(p.platforms_count, 0);
    assert.strictEqual(p.accounts_count, 0);
});

test('attachPlatformAccount aggregates cross-platform data correctly', () => {
    const p = createPersonaHypothesis();
    const currentAccounts: PlatformAccount[] = [
        {
            platform: 'X',
            account_handle: 'haxor1',
            account_id: 'x_1',
            linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] }
        }
    ];

    const newAccount: PlatformAccount = {
        platform: 'Telegram',
        account_handle: 'haxor1_tg',
        account_id: 'tg_1',
        linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] }
    };

    const link: PersonaLink = {
        link_type: 'CANDIDATE_LINK',
        evidence_score: 0.8,
        evidence_factors: ['same handle'],
        source_account_id: 'x_1',
        target_account_id: 'tg_1'
    };

    // Before attach metrics are 0
    const attached = attachPlatformAccount(p, newAccount, link, currentAccounts);
    assert.strictEqual(attached.updatedPersona.accounts_count, 2);
    assert.strictEqual(attached.updatedPersona.platforms_count, 2);
});

test('markContestedLink flips to CONTRADICTED_LINK and appends factors', () => {
    const link: PersonaLink = {
        link_type: 'CANDIDATE_LINK',
        evidence_score: 0.8,
        evidence_factors: ['same handle'],
        source_account_id: 'x_1',
        target_account_id: 'tg_1'
    };

    const contested = markContestedLink(link, ['different timezones', 'linguistic mismatch']);
    assert.strictEqual(contested.link_type, 'CONTRADICTED_LINK');
    assert.strictEqual(contested.evidence_factors.length, 3);
    assert.ok(contested.evidence_factors.includes('different timezones'));
});

test('computePersonaMetrics calculates correctly', () => {
    const p = createPersonaHypothesis();
    const accounts: PlatformAccount[] = [
        { platform: 'X', account_handle: '1', account_id: '1', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
        { platform: 'X', account_handle: '2', account_id: '2', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
        { platform: 'Telegram', account_handle: '3', account_id: '3', linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] } },
    ];
    const metrics = computePersonaMetrics(p, accounts);
    assert.strictEqual(metrics.accounts_count, 3);
    assert.strictEqual(metrics.platforms_count, 2);
});
