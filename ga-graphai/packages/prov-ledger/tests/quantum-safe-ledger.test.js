"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const quantum_safe_ledger_1 = require("../src/quantum-safe-ledger");
const fixedNow = () => new Date('2024-01-01T00:00:00.000Z');
(0, vitest_1.describe)('Lamport one-time signatures', () => {
    (0, vitest_1.it)('signs and verifies while detecting tampering', () => {
        const keyPair = (0, quantum_safe_ledger_1.generateLamportKeyPair)();
        const message = 'classified-digest';
        const signature = (0, quantum_safe_ledger_1.signWithLamport)(message, keyPair);
        (0, vitest_1.expect)((0, quantum_safe_ledger_1.verifyLamportSignature)(message, signature, keyPair.publicKey)).toBe(true);
        const altered = { ...signature, signature: [...signature.signature] };
        altered.signature[0] = keyPair.privateKey[0][0];
        (0, vitest_1.expect)((0, quantum_safe_ledger_1.verifyLamportSignature)(message, altered, keyPair.publicKey)).toBe(false);
    });
});
(0, vitest_1.describe)('Schnorr identification proof', () => {
    (0, vitest_1.it)('verifies proofs and rejects altered transcripts', () => {
        const identity = (0, quantum_safe_ledger_1.generateSchnorrKeyPair)();
        const message = 'audit-hash';
        const proof = (0, quantum_safe_ledger_1.createSchnorrProof)(identity, message);
        (0, vitest_1.expect)((0, quantum_safe_ledger_1.verifySchnorrProof)(identity.publicKey, message, proof)).toBe(true);
        (0, vitest_1.expect)((0, quantum_safe_ledger_1.verifySchnorrProof)(identity.publicKey, `${message}-tampered`, proof)).toBe(false);
    });
});
(0, vitest_1.describe)('QuantumSafeLedger', () => {
    (0, vitest_1.it)('chains entries with hybrid signatures, tokens, and proofs', () => {
        const tokenService = new quantum_safe_ledger_1.AccessTokenService('super-secret', { ttlMs: 1_000, now: fixedNow });
        const identity = (0, quantum_safe_ledger_1.generateSchnorrKeyPair)();
        const ledger = new quantum_safe_ledger_1.QuantumSafeLedger(tokenService, {
            now: fixedNow,
            identityPublicKey: identity.publicKey,
        });
        const hybridKeys = (0, quantum_safe_ledger_1.generateHybridKeyPair)();
        const token = tokenService.issue('alice', 'intel').token;
        const fact = {
            id: '1',
            category: 'intel',
            actor: 'alice',
            action: 'share',
            resource: 'report-42',
            payload: { sensitivity: 'secret' },
        };
        const expectedHash = (0, quantum_safe_ledger_1.computeLedgerHash)(fact, fixedNow().toISOString());
        const zkProof = (0, quantum_safe_ledger_1.createSchnorrProof)(identity, expectedHash);
        const signature = (0, quantum_safe_ledger_1.signHybrid)(expectedHash, hybridKeys);
        const entry = ledger.append(fact, signature, token, zkProof);
        (0, vitest_1.expect)(entry.hash).toBe(expectedHash);
        const secondFact = {
            ...fact,
            id: '2',
            resource: 'report-43',
            payload: { sensitivity: 'secret', revision: 2 },
        };
        const secondHash = (0, quantum_safe_ledger_1.computeLedgerHash)(secondFact, fixedNow().toISOString(), entry.hash);
        const secondProof = (0, quantum_safe_ledger_1.createSchnorrProof)(identity, secondHash);
        const secondSignature = (0, quantum_safe_ledger_1.signHybrid)(secondHash, hybridKeys);
        const chained = ledger.append(secondFact, secondSignature, token, secondProof);
        (0, vitest_1.expect)(chained.previousHash).toBe(entry.hash);
        (0, vitest_1.expect)(ledger.verifyChain()).toBe(true);
        // Tamper with the chain hash and expect verification to fail.
        const tampered = { ...chained, chainHash: `${chained.chainHash.slice(0, -1)}0` };
        // @ts-expect-error intentional tampering for validation purposes
        ledger['entries'][1] = tampered;
        (0, vitest_1.expect)(ledger.verifyChain()).toBe(false);
    });
    (0, vitest_1.it)('rejects hybrid signature tampering', () => {
        const tokenService = new quantum_safe_ledger_1.AccessTokenService('another-secret', { now: fixedNow });
        const ledger = new quantum_safe_ledger_1.QuantumSafeLedger(tokenService, { now: fixedNow });
        const hybridKeys = (0, quantum_safe_ledger_1.generateHybridKeyPair)();
        const token = tokenService.issue('bob', 'intel').token;
        const fact = {
            id: 't1',
            category: 'intel',
            actor: 'bob',
            action: 'access',
            resource: 'dataset',
            payload: { classification: 'top-secret' },
        };
        const expectedHash = (0, quantum_safe_ledger_1.computeLedgerHash)(fact, fixedNow().toISOString());
        const signature = (0, quantum_safe_ledger_1.signHybrid)(expectedHash, hybridKeys);
        ledger.append(fact, signature, token);
        (0, vitest_1.expect)(ledger.verifyChain()).toBe(true);
        const forgedSignature = {
            ...signature,
            ed25519Signature: signature.ed25519Signature.replace(/.$/, 'A'),
        };
        (0, vitest_1.expect)((0, quantum_safe_ledger_1.verifyHybridSignature)(expectedHash, forgedSignature)).toBe(false);
    });
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.restoreAllMocks();
});
