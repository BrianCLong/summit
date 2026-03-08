"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const invariants_js_1 = require("../invariants.js");
const hashChain_js_1 = require("../hashChain.js");
console.log('Running Provenance Integrity Verification...');
// --- Invariants Tests ---
console.log('Test 1: Validate valid entry');
const validEntry = {
    actionType: 'CREATE',
    timestamp: new Date(),
    actorId: 'user-123',
    resourceId: 'doc-456',
    metadata: {
        correlationId: 'corr-789',
    },
};
try {
    (0, invariants_js_1.validateInvariants)(validEntry);
    console.log('  PASS: Valid entry accepted');
}
catch (e) {
    console.error('  FAIL: Valid entry rejected', e);
    process.exit(1);
}
console.log('Test 2: Validate missing fields');
const invalidCases = [
    { field: 'actionType', errorMatch: /event_type/ },
    { field: 'timestamp', errorMatch: /occurred_at/ },
    { field: 'actorId', errorMatch: /actor/ },
    { field: 'resourceId', errorMatch: /subject/ },
];
for (const testCase of invalidCases) {
    const invalidEntry = { ...validEntry };
    delete invalidEntry[testCase.field];
    try {
        (0, invariants_js_1.validateInvariants)(invalidEntry);
        console.error(`  FAIL: Missing ${testCase.field} was accepted`);
        process.exit(1);
    }
    catch (e) {
        if (testCase.errorMatch.test(e.message)) {
            console.log(`  PASS: Detected missing ${testCase.field}`);
        }
        else {
            console.error(`  FAIL: Incorrect error message for ${testCase.field}: ${e.message}`);
            process.exit(1);
        }
    }
}
console.log('Test 3: Validate missing metadata/correlationId');
try {
    const noMeta = { ...validEntry };
    delete noMeta.metadata;
    (0, invariants_js_1.validateInvariants)(noMeta);
    console.error('  FAIL: Missing metadata accepted');
    process.exit(1);
}
catch (e) {
    if (/correlation_id/.test(e.message)) {
        console.log('  PASS: Detected missing metadata');
    }
    else {
        console.error('  FAIL: Incorrect error for missing metadata');
        process.exit(1);
    }
}
// --- Hash Chain Tests ---
console.log('\nRunning Hash Chain Tests...');
const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
const hashEntry = {
    id: 'prov_1',
    tenantId: 'tenant_1',
    sequenceNumber: 1n,
    timestamp: new Date('2023-01-01T00:00:00Z'),
    actionType: 'CREATE',
    resourceType: 'Document',
    resourceId: 'doc-1',
    actorId: 'user-1',
    actorType: 'user',
    payload: { foo: 'bar' },
    metadata: { correlationId: 'abc' },
};
console.log('Test 4: Deterministic output (Legacy Mode)');
const hash1 = (0, hashChain_js_1.computeEntryHash)(hashEntry, previousHash, { enabled: false });
const hash2 = (0, hashChain_js_1.computeEntryHash)(hashEntry, previousHash, { enabled: false });
assert_1.default.strictEqual(hash1, hash2, 'Hashes should be identical');
assert_1.default.strictEqual(hash1.length, 64, 'Hash should be SHA-256 hex (64 chars)');
console.log('  PASS: Legacy mode is deterministic');
console.log('Test 5: Deterministic output (V2 Mode)');
const v2Hash1 = (0, hashChain_js_1.computeEntryHash)(hashEntry, previousHash, { enabled: true });
const v2Hash2 = (0, hashChain_js_1.computeEntryHash)(hashEntry, previousHash, { enabled: true });
assert_1.default.strictEqual(v2Hash1, v2Hash2, 'V2 Hashes should be identical');
assert_1.default.notStrictEqual(hash1, v2Hash1, 'V2 hash should differ from Legacy hash');
console.log('  PASS: V2 mode is deterministic and distinct');
console.log('Test 6: Content sensitivity (V2 Mode)');
const changedEntry = { ...hashEntry, actionType: 'UPDATE' };
const v2Hash3 = (0, hashChain_js_1.computeEntryHash)(changedEntry, previousHash, { enabled: true });
assert_1.default.notStrictEqual(v2Hash1, v2Hash3, 'Changing content should change hash');
console.log('  PASS: Hash changes with content');
console.log('Test 7: Chain sensitivity (V2 Mode)');
const diffPrevHash = '1111111111111111111111111111111111111111111111111111111111111111';
const v2Hash4 = (0, hashChain_js_1.computeEntryHash)(hashEntry, diffPrevHash, { enabled: true });
assert_1.default.notStrictEqual(v2Hash1, v2Hash4, 'Changing previousHash should change hash');
console.log('  PASS: Hash changes with previous link');
console.log('\nAll Integrity Checks PASSED.');
