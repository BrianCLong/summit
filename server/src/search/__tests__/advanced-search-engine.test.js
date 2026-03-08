"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const advanced_search_engine_js_1 = require("../advanced-search-engine.js");
(0, globals_1.describe)('AdvancedSearchEngine', () => {
    const docs = [
        {
            id: '1',
            title: 'Zero Trust Network Posture',
            body: 'Guidance on zero trust and secure enclaves',
            facets: { status: ['open'], region: ['us'] },
            tags: ['security', 'zero-trust'],
            entities: [{ id: 'ent-1', type: 'actor', label: 'Zeus' }],
            references: ['2', '3'],
            embedding: [0.9, 0.8, 0.7],
            createdAt: new Date('2024-01-01'),
        },
        {
            id: '2',
            title: 'Random Threat Intelligence',
            body: 'Observations about emerging threats and random incidents',
            facets: { status: ['closed'], region: ['eu'], tag: ['critical'] },
            tags: ['intel', 'threat'],
            entities: [{ id: 'ent-2', type: 'malware', label: 'Hydra' }],
            references: [],
            embedding: [0.2, 0.1, 0.1],
            createdAt: new Date('2024-02-01'),
        },
        {
            id: '3',
            title: 'Insider Risk Playbook',
            body: 'Guidance on detecting insider risk and behavioral telemetry',
            facets: { status: ['open'], region: ['us'], tag: ['critical'] },
            tags: ['risk', 'playbook'],
            entities: [
                { id: 'ent-3', type: 'tool', label: 'Sentinel' },
                { id: 'ent-4', type: 'actor', label: 'Zeus' },
            ],
            references: ['1'],
            embedding: [0.85, 0.75, 0.65],
            createdAt: new Date('2024-03-01'),
        },
    ];
    (0, globals_1.it)('performs full-text, faceted, and DSL filtering', () => {
        const engine = new advanced_search_engine_js_1.AdvancedSearchEngine();
        engine.index(docs);
        const results = engine.search({
            text: 'guidance',
            facets: { status: ['open'] },
            dsl: 'tag:playbook AND region:us',
            semantic: true,
            fuzzy: true,
        });
        (0, globals_1.expect)(results.hits).toHaveLength(1);
        (0, globals_1.expect)(results.hits[0].document.id).toBe('3');
        (0, globals_1.expect)(results.facets.status.open).toBe(1);
    });
    (0, globals_1.it)('supports fuzzy matching and semantic reranking', () => {
        const engine = new advanced_search_engine_js_1.AdvancedSearchEngine();
        engine.index(docs);
        const results = engine.search({ text: 'Randam Thret', fuzzy: true, semantic: true, limit: 2 });
        (0, globals_1.expect)(results.hits.length).toBeGreaterThan(0);
        (0, globals_1.expect)(results.suggestions.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('tracks saved searches and history', () => {
        const engine = new advanced_search_engine_js_1.AdvancedSearchEngine({ now: () => new Date('2024-04-01') });
        engine.index(docs);
        const saved = engine.saveSearch({
            id: 'sv1',
            name: 'Critical Open Cases',
            query: { text: 'critical', facets: { status: ['open'] } },
            createdBy: 'alice',
        });
        const run = engine.search({ text: 'critical', userId: 'alice' });
        (0, globals_1.expect)(saved.createdAt.toISOString()).toContain('2024-04-01');
        (0, globals_1.expect)(engine.savedSearches()).toHaveLength(1);
        (0, globals_1.expect)(engine.searchHistory('alice')[0].query.text).toBe('critical');
        (0, globals_1.expect)(run.autocomplete[0].toLowerCase()).toContain('critical');
    });
    (0, globals_1.it)('computes autocomplete, entity linking, and cross references', () => {
        const engine = new advanced_search_engine_js_1.AdvancedSearchEngine();
        engine.index(docs);
        const results = engine.search({ text: 'Zeus guidance', semantic: true, fuzzy: true });
        const zeusHit = results.hits.find((h) => h.document.id === '3');
        (0, globals_1.expect)(zeusHit?.matchedEntities.map((e) => e.label)).toContain('Zeus');
        (0, globals_1.expect)(zeusHit?.crossReferences).toEqual(globals_1.expect.arrayContaining([
            { id: '1', direction: 'references' },
            { id: '1', direction: 'referencedBy' },
        ]));
        (0, globals_1.expect)(engine.autocomplete('Ze')).toContain('Zero');
    });
    (0, globals_1.it)('honors NOT and OR DSL operators alongside time windows', () => {
        const engine = new advanced_search_engine_js_1.AdvancedSearchEngine();
        engine.index(docs);
        const results = engine.search({
            text: 'guidance',
            dsl: 'region:us AND NOT status:closed OR entity:Hydra',
            time: { from: new Date('2024-02-15'), to: new Date('2024-04-01') },
        });
        (0, globals_1.expect)(results.hits.map((h) => h.document.id)).toEqual(['3']);
        (0, globals_1.expect)(results.facets.region.us).toBe(1);
    });
});
