"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const evidence_sample_json_1 = __importDefault(require("../fixtures/evidence.sample.json"));
const playbook_defensive_example_json_1 = __importDefault(require("../fixtures/playbook.defensive.example.json"));
const matchPlaybook_1 = require("../engine/matchPlaybook");
(0, vitest_1.describe)('PG matcher (non-prescriptive output)', () => {
    (0, vitest_1.it)('emits an analytic hypothesis with confidence + gaps, without recommendations', () => {
        const actionSignaturesById = {
            'pg.action.sig.coordinated-posting.v1': {
                id: 'pg.action.sig.coordinated-posting.v1',
                label: 'Coordinated posting signature',
                indicators: [
                    {
                        id: 'ind1',
                        signal: 'coordinated posting pattern',
                        weight: 0.7,
                        evidenceKinds: ['post', 'report']
                    }
                ],
                provenance: {
                    source: 'seed',
                    createdAt: '2026-03-05T00:00:00Z',
                    curator: 'summit.seed'
                }
            },
            'pg.action.sig.cross-platform-amplification.v1': {
                id: 'pg.action.sig.cross-platform-amplification.v1',
                label: 'Cross-platform amplification signature',
                indicators: [
                    {
                        id: 'ind2',
                        signal: 'cross-platform amplification',
                        weight: 0.3,
                        evidenceKinds: ['report']
                    }
                ],
                provenance: {
                    source: 'seed',
                    createdAt: '2026-03-05T00:00:00Z',
                    curator: 'summit.seed'
                }
            }
        };
        const output = (0, matchPlaybook_1.matchPlaybook)({
            playbook: playbook_defensive_example_json_1.default,
            actionSignaturesById,
            evidence: evidence_sample_json_1.default
        });
        (0, vitest_1.expect)(output.playbookId).toBe(playbook_defensive_example_json_1.default.id);
        (0, vitest_1.expect)(output.confidence).toBeGreaterThan(0);
        (0, vitest_1.expect)(output.matchedIndicators.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(output.recommendedActions).toBeUndefined();
        (0, vitest_1.expect)(output.notes.toLowerCase()).toContain('non-prescriptive');
    });
});
