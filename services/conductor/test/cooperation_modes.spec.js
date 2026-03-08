"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auctionOfExperts_1 = require("../src/fabric/modes/auctionOfExperts");
const semanticBraid_1 = require("../src/fabric/modes/semanticBraid");
const counterfactualShadowing_1 = require("../src/fabric/modes/counterfactualShadowing");
const crossEntropySwaps_1 = require("../src/fabric/modes/crossEntropySwaps");
const federatedDeliberation_1 = require("../src/fabric/modes/federatedDeliberation");
const proofOfUsefulWorkbook_1 = require("../src/fabric/modes/proofOfUsefulWorkbook");
describe('cooperation modes', () => {
    it('runs Auction-of-Experts and selects winners under constraints', () => {
        const result = (0, auctionOfExperts_1.runAuctionOfExperts)([
            {
                modelId: 'llm-a',
                est: { quality: 0.82, latencyMs: 500, costUSD: 0.08 },
                confidence: 0.8,
                fitTags: ['flakeRate', 'test'],
                rationale: 'High coverage for test repairs',
            },
            {
                modelId: 'llm-b',
                est: { quality: 0.7, latencyMs: 700, costUSD: 0.05 },
                confidence: 0.7,
                fitTags: ['coverage'],
                rationale: 'Coverage specialist',
            },
        ], {
            costBudgetUsd: 0.2,
            latencyBudgetMs: 900,
            requiredSkills: ['test', 'coverage'],
        });
        expect(result.winners.length).toBeGreaterThan(0);
        expect(result.coverage).toBeGreaterThan(0);
    });
    it('weaves semantic braid and flags inconsistencies', () => {
        const braid = (0, semanticBraid_1.weaveSemanticBraid)([
            { kind: 'spec', content: 'Spec describes target MAESTRO-WORKER' },
            {
                kind: 'tests',
                content: 'Adds test MAESTRO-WORKER-FLAKE',
                references: ['MAESTRO-WORKER'],
            },
            {
                kind: 'impl',
                content: 'Implementation ensures MAESTRO-WORKER-FLAKE fixed',
            },
            {
                kind: 'release',
                content: 'Release ensures flakeRate and coverage are improved',
            },
        ], {
            acceptanceMetrics: ['flakeRate', 'coverage'],
            declaredTargets: ['MAESTRO-WORKER'],
        });
        expect(braid.issues.find((msg) => msg.includes('undeclared'))).toBeUndefined();
        expect(braid.consistencyProof.length).toBeGreaterThan(0);
    });
    it('builds counterfactual seeds to improve flake reproduction', () => {
        const shadow = (0, counterfactualShadowing_1.buildCounterfactualShadow)([
            { test: 'spec1', failureRate: 0.4, env: { seed: 1, parallelism: 2 } },
            { test: 'spec2', failureRate: 0.1, env: { seed: 5 } },
        ], 2);
        expect(shadow.seeds.length).toBeGreaterThan(0);
        expect(shadow.expectedReproRate).toBeGreaterThan(0);
    });
    it('prefers proposal with lower cross entropy', () => {
        const result = (0, crossEntropySwaps_1.crossEntropySwap)({ id: 'a', text: 'fix', criticScores: [0.9, 0.8, 0.85] }, { id: 'b', text: 'alt', criticScores: [0.1, 0.1, 0.1] });
        expect(result.winner.id).toBe('a');
    });
    it('computes federated consensus using weighted quorums', () => {
        const consensus = (0, federatedDeliberation_1.federatedConsensus)([
            { region: 'us', proposalId: 'p1', score: 0.9, weight: 0.5 },
            { region: 'eu', proposalId: 'p1', score: 0.8, weight: 0.3 },
            { region: 'apac', proposalId: 'p2', score: 0.7, weight: 0.2 },
        ], 0.6);
        expect(consensus.winningProposalId).toBe('p1');
        expect(consensus.support).toBeGreaterThan(0.6);
    });
    it('issues proof-of-useful workbook receipts', () => {
        const bundle = (0, proofOfUsefulWorkbook_1.issueProofOfUsefulWorkbook)('task:router-test', [
            {
                name: 'k6',
                command: 'npm run k6',
                expectedEvidence: 'k6-report.json',
            },
            { name: 'jest', command: 'npm test', expectedEvidence: 'junit.xml' },
        ], () => 'pass');
        expect(bundle.receipts.length).toBe(2);
        expect(bundle.digest.startsWith('sha256:')).toBe(true);
    });
});
