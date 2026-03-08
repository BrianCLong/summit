"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendLedgerEntry = appendLedgerEntry;
exports.verifyLedger = verifyLedger;
const canonicalize_js_1 = require("./canonicalize.js");
const hash_js_1 = require("./hash.js");
const signing_js_1 = require("./signing.js");
function omitUndefined(payload) {
    const clone = { ...payload };
    if (!clone.artifactUri) {
        delete clone.artifactUri;
    }
    if (!clone.metadata || Object.keys(clone.metadata).length === 0) {
        delete clone.metadata;
    }
    return clone;
}
function entryToPayload(entry) {
    const { hash: _hash, signature: _sig, ...payload } = entry;
    return omitUndefined(payload);
}
function appendLedgerEntry(ledger, input, privateKeyPem) {
    const sequence = ledger.entries.length + 1;
    const prevHash = ledger.entries.length > 0 ? ledger.entries[ledger.entries.length - 1].hash : null;
    const timestamp = input.timestamp ?? new Date().toISOString();
    const payload = omitUndefined({
        sequence,
        claimId: input.claimId,
        entityId: input.entityId,
        evidenceId: input.evidenceId,
        stage: input.stage,
        contentHash: input.contentHash,
        actor: input.actor,
        timestamp,
        prevHash,
        signingKeyId: input.signingKeyId,
        artifactUri: input.artifactUri,
        metadata: input.metadata,
    });
    const canonical = (0, canonicalize_js_1.canonicalString)(payload);
    const hash = (0, hash_js_1.hashJson)(payload);
    const signature = (0, signing_js_1.signPayload)(canonical, privateKeyPem);
    const entry = {
        ...payload,
        hash,
        signature,
    };
    ledger.entries.push(entry);
    ledger.rootHash = hash;
    return entry;
}
function verifyLedger(ledger) {
    const errors = [];
    const keyMap = new Map(ledger.publicKeys.map((k) => [k.keyId, k]));
    let expectedSequence = 1;
    let prevHash = null;
    let computedRoot = '';
    for (const entry of ledger.entries) {
        if (entry.sequence !== expectedSequence) {
            errors.push(`sequence mismatch at entry ${entry.sequence}: expected ${expectedSequence}`);
        }
        if (entry.prevHash !== prevHash) {
            errors.push(`prevHash mismatch at sequence ${entry.sequence}`);
        }
        const payload = entryToPayload(entry);
        const canonical = (0, canonicalize_js_1.canonicalString)(payload);
        const computedHash = (0, hash_js_1.hashJson)(payload);
        if (computedHash !== entry.hash) {
            errors.push(`hash mismatch at sequence ${entry.sequence}`);
        }
        const key = keyMap.get(entry.signingKeyId);
        if (!key) {
            errors.push(`missing public key ${entry.signingKeyId} for sequence ${entry.sequence}`);
        }
        else {
            const signatureValid = (0, signing_js_1.verifyPayload)(canonical, key.publicKey, entry.signature);
            if (!signatureValid) {
                errors.push(`invalid signature at sequence ${entry.sequence}`);
            }
        }
        prevHash = entry.hash;
        computedRoot = entry.hash;
        expectedSequence += 1;
    }
    if (ledger.entries.length === 0) {
        computedRoot = '';
    }
    if (ledger.rootHash !== computedRoot) {
        errors.push(`rootHash mismatch: expected ${ledger.rootHash}, computed ${computedRoot}`);
    }
    return {
        valid: errors.length === 0,
        errors,
        rootHash: computedRoot,
        entryCount: ledger.entries.length,
    };
}
