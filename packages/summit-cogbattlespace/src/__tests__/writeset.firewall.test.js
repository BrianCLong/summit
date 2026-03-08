"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../storage");
const writeArtifacts_1 = require("../writeset/writeArtifacts");
describe('writeArtifacts', () => {
    it('rejects domain/entity mismatch for NG/BG split', async () => {
        const storage = new storage_1.InMemoryCogBattleStorage();
        const report = await (0, writeArtifacts_1.writeArtifacts)(storage, {
            kind: 'cog_writeset',
            version: 'v1',
            writesetId: 'writeset_1',
            createdAt: new Date().toISOString(),
            origin: { actor: 'pipeline', pipeline: 'test', runId: 'run1234' },
            scope: { allowDomains: ['NG', 'BG'], denyDomains: ['RG'] },
            ops: [
                {
                    opId: 'op-12345',
                    domain: 'NG',
                    entityType: 'Belief',
                    action: 'UPSERT',
                    payload: {
                        id: 'belief_123',
                        proposition: 'A proposition',
                        polarity: 'support',
                        confidence: 0.7,
                        timeSeries: [],
                        provenance: { evidenceArtifacts: [], estimator: 'v0' },
                    },
                },
            ],
        });
        expect(report.ok).toBe(false);
        expect(report.summary.rejectedOps).toBe(1);
    });
});
