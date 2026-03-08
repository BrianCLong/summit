"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ledger_1 = require("../src/ledger");
const verifier_1 = require("../src/verifier");
const fs_1 = __importDefault(require("fs"));
const TEST_DIR = './tmp/test-ledger';
describe('Ledger', () => {
    let ledger;
    beforeEach(() => {
        if (fs_1.default.existsSync(TEST_DIR)) {
            fs_1.default.rmSync(TEST_DIR, { recursive: true, force: true });
        }
        ledger = new ledger_1.Ledger({ dataDir: TEST_DIR, enabled: true });
    });
    afterEach(() => {
        if (fs_1.default.existsSync(TEST_DIR)) {
            fs_1.default.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });
    test('should register evidence and create claim', () => {
        const evidence = ledger.registerEvidence({
            contentHash: 'abc',
            licenseId: 'MIT',
            source: 'user',
            transforms: []
        });
        expect(evidence.id).toBeDefined();
        const claim = ledger.createClaim({
            evidenceIds: [evidence.id],
            transformChainIds: [],
            text: 'test claim'
        });
        expect(claim.id).toBeDefined();
        expect(claim.hash).toBeDefined();
    });
    test('should verify valid manifest', () => {
        const evidence = ledger.registerEvidence({
            contentHash: 'abc',
            licenseId: 'MIT',
            source: 'user',
            transforms: []
        });
        const claim = ledger.createClaim({
            evidenceIds: [evidence.id],
            transformChainIds: [],
            text: 'test claim'
        });
        const manifest = ledger.generateManifest([claim.id]);
        const verification = verifier_1.Verifier.verifyManifest(manifest);
        expect(verification.valid).toBe(true);
    });
    test('should fail verification on tampered claim', () => {
        const evidence = ledger.registerEvidence({
            contentHash: 'abc',
            licenseId: 'MIT',
            source: 'user',
            transforms: []
        });
        const claim = ledger.createClaim({
            evidenceIds: [evidence.id],
            transformChainIds: [],
            text: 'test claim'
        });
        const manifest = ledger.generateManifest([claim.id]);
        // Tamper
        if (manifest.claims.length > 0 && manifest.claims[0]) {
            manifest.claims[0].text = 'tampered text';
        }
        const verification = verifier_1.Verifier.verifyManifest(manifest);
        expect(verification.valid).toBe(false);
        expect(verification.errors.length).toBeGreaterThan(0);
    });
    test('should fail verification on tampered merkle root', () => {
        const evidence = ledger.registerEvidence({
            contentHash: 'abc',
            licenseId: 'MIT',
            source: 'user',
            transforms: []
        });
        const claim = ledger.createClaim({
            evidenceIds: [evidence.id],
            transformChainIds: [],
            text: 'test claim'
        });
        const manifest = ledger.generateManifest([claim.id]);
        // Tamper Root
        manifest.merkleRoot = 'deadbeef';
        const verification = verifier_1.Verifier.verifyManifest(manifest);
        expect(verification.valid).toBe(false);
    });
});
