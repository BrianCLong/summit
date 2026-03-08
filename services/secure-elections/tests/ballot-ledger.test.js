"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ballot_ledger_js_1 = require("../src/blockchain/ballot-ledger.js");
(0, vitest_1.describe)('BallotLedger', () => {
    let ledger;
    (0, vitest_1.beforeEach)(() => {
        ledger = new ballot_ledger_js_1.BallotLedger(2, 10); // Lower difficulty for faster tests
    });
    const createBallot = (id) => ({
        ballotId: id,
        electionId: 'election-1',
        encryptedPayload: `encrypted-vote-${id}`,
        voterProof: `proof-${id}`,
        timestamp: new Date().toISOString(),
    });
    (0, vitest_1.describe)('recordBallot', () => {
        (0, vitest_1.it)('should record a valid ballot', () => {
            const ballot = createBallot('ballot-001');
            const result = ledger.recordBallot(ballot);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.position).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should reject duplicate ballot IDs', () => {
            const ballot = createBallot('ballot-dup');
            ledger.recordBallot(ballot);
            (0, vitest_1.expect)(() => ledger.recordBallot(ballot)).toThrow('Duplicate ballot detected');
        });
        (0, vitest_1.it)('should reject invalid ballot structure', () => {
            const invalidBallot = { ballotId: '', encryptedPayload: '', voterProof: '' };
            (0, vitest_1.expect)(() => ledger.recordBallot(invalidBallot)).toThrow('Invalid ballot structure');
        });
    });
    (0, vitest_1.describe)('mineBlock', () => {
        (0, vitest_1.it)('should mine pending ballots into a block', () => {
            ledger.recordBallot(createBallot('ballot-1'));
            ledger.recordBallot(createBallot('ballot-2'));
            const block = ledger.mineBlock();
            (0, vitest_1.expect)(block).not.toBeNull();
            (0, vitest_1.expect)(block.index).toBe(1);
            (0, vitest_1.expect)(block.ballots).toHaveLength(2);
            (0, vitest_1.expect)(block.hash).toMatch(/^0{2}/); // Matches difficulty
        });
        (0, vitest_1.it)('should return null when no pending ballots', () => {
            const block = ledger.mineBlock();
            (0, vitest_1.expect)(block).toBeNull();
        });
    });
    (0, vitest_1.describe)('verifyChain', () => {
        (0, vitest_1.it)('should verify a valid chain', () => {
            ledger.recordBallot(createBallot('ballot-v1'));
            ledger.mineBlock();
            ledger.recordBallot(createBallot('ballot-v2'));
            ledger.mineBlock();
            const result = ledger.verifyChain();
            (0, vitest_1.expect)(result.valid).toBe(true);
        });
    });
    (0, vitest_1.describe)('generateReceipt', () => {
        (0, vitest_1.it)('should generate receipt for recorded ballot', () => {
            const ballot = createBallot('ballot-receipt');
            ledger.recordBallot(ballot);
            ledger.mineBlock();
            const receipt = ledger.generateReceipt('ballot-receipt');
            (0, vitest_1.expect)(receipt.found).toBe(true);
            (0, vitest_1.expect)(receipt.blockIndex).toBe(1);
            (0, vitest_1.expect)(receipt.ballotHash).toBeDefined();
            (0, vitest_1.expect)(receipt.merkleProof).toBeDefined();
        });
        (0, vitest_1.it)('should return not found for unknown ballot', () => {
            const receipt = ledger.generateReceipt('unknown-ballot');
            (0, vitest_1.expect)(receipt.found).toBe(false);
        });
    });
    (0, vitest_1.describe)('getStats', () => {
        (0, vitest_1.it)('should return accurate statistics', () => {
            ledger.recordBallot(createBallot('stat-1'));
            ledger.recordBallot(createBallot('stat-2'));
            ledger.mineBlock();
            const stats = ledger.getStats();
            (0, vitest_1.expect)(stats.totalBlocks).toBe(2); // Genesis + 1
            (0, vitest_1.expect)(stats.totalBallots).toBe(2);
            (0, vitest_1.expect)(stats.chainValid).toBe(true);
        });
    });
});
