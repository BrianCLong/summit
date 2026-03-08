"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateManifestHash = calculateManifestHash;
exports.signManifest = signManifest;
exports.verifyManifest = verifyManifest;
exports.buildEvidenceChain = buildEvidenceChain;
const canonicalize_js_1 = require("./canonicalize.js");
const hash_js_1 = require("./hash.js");
const ledger_js_1 = require("./ledger.js");
const signing_js_1 = require("./signing.js");
function manifestPayload(manifest) {
    const { integrity: _integrity, ...rest } = manifest;
    return rest;
}
function calculateManifestHash(manifest) {
    return (0, hash_js_1.hashJson)(manifestPayload(manifest));
}
function signManifest(manifest, privateKeyPem, keyId) {
    const payload = manifestPayload(manifest);
    const canonical = (0, canonicalize_js_1.canonicalString)(payload);
    const manifestHash = (0, hash_js_1.hashJson)(payload);
    const signature = (0, signing_js_1.signPayload)(canonical, privateKeyPem);
    manifest.integrity = {
        manifestHash,
        signature: {
            algorithm: 'ed25519',
            keyId,
            value: signature,
        },
    };
    return manifest.integrity;
}
function buildLedgerMap(ledger) {
    const map = new Map();
    for (const entry of ledger.entries) {
        map.set(entry.sequence, entry);
    }
    return map;
}
function validateManifestLedger(manifest, ledger) {
    const errors = [];
    const ledgerMap = buildLedgerMap(ledger);
    for (const ref of manifest.ledger.entries) {
        const entry = ledgerMap.get(ref.sequence);
        if (!entry) {
            errors.push(`manifest references missing ledger sequence ${ref.sequence}`);
            continue;
        }
        if (entry.hash !== ref.hash) {
            errors.push(`ledger hash mismatch for sequence ${ref.sequence}: manifest=${ref.hash} ledger=${entry.hash}`);
        }
    }
    for (const claim of manifest.claims) {
        for (const evidence of claim.evidence) {
            const entry = ledgerMap.get(evidence.ledgerSequence);
            if (!entry) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} missing ledger sequence ${evidence.ledgerSequence}`);
                continue;
            }
            if (entry.claimId !== claim.claimId) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} ledger claim mismatch ${entry.claimId}`);
            }
            if (entry.entityId !== claim.entityId) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} ledger entity mismatch ${entry.entityId}`);
            }
            if (entry.stage !== evidence.stage) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} stage mismatch manifest=${evidence.stage} ledger=${entry.stage}`);
            }
            if (entry.contentHash !== evidence.artifactHash) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} content hash mismatch manifest=${evidence.artifactHash} ledger=${entry.contentHash}`);
            }
            if (evidence.artifactUri && entry.artifactUri && entry.artifactUri !== evidence.artifactUri) {
                errors.push(`claim ${claim.claimId} evidence ${evidence.evidenceId} artifactUri mismatch manifest=${evidence.artifactUri} ledger=${entry.artifactUri}`);
            }
        }
    }
    const itemCount = manifest.bundle.itemCount;
    if (itemCount !== manifest.claims.length) {
        errors.push(`bundle itemCount ${itemCount} does not match number of claims ${manifest.claims.length}`);
    }
    return errors;
}
function verifyManifest(manifest, ledger, options = {}) {
    const errors = [];
    const ledgerVerification = (0, ledger_js_1.verifyLedger)(ledger);
    if (!ledgerVerification.valid) {
        errors.push(...ledgerVerification.errors);
    }
    errors.push(...validateManifestLedger(manifest, ledger));
    if (manifest.ledger.rootHash !== ledgerVerification.rootHash) {
        errors.push(`manifest rootHash ${manifest.ledger.rootHash} does not match ledger root ${ledgerVerification.rootHash}`);
    }
    const payload = manifestPayload(manifest);
    const canonical = (0, canonicalize_js_1.canonicalString)(payload);
    const computedHash = (0, hash_js_1.hashJson)(payload);
    if (manifest.integrity.manifestHash !== computedHash) {
        errors.push(`manifest hash mismatch manifest=${manifest.integrity.manifestHash} computed=${computedHash}`);
    }
    const signature = manifest.integrity.signature;
    if (signature) {
        if (signature.algorithm !== 'ed25519') {
            errors.push(`unsupported manifest signature algorithm ${signature.algorithm}`);
        }
        if (!options.manifestPublicKey) {
            errors.push('manifest signature present but no public key provided');
        }
        else {
            const verified = (0, signing_js_1.verifyPayload)(canonical, options.manifestPublicKey, signature.value);
            if (!verified) {
                errors.push('manifest signature verification failed');
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        ledger: ledgerVerification,
    };
}
function buildEvidenceChain(entityId, manifest, ledger) {
    const ledgerMap = buildLedgerMap(ledger);
    const chains = [];
    for (const claim of manifest.claims) {
        if (claim.entityId !== entityId) {
            continue;
        }
        const nodes = claim.evidence
            .map((evidence) => {
            const entry = ledgerMap.get(evidence.ledgerSequence);
            return {
                sequence: evidence.ledgerSequence,
                stage: evidence.stage,
                actor: entry?.actor ?? '',
                timestamp: entry?.timestamp ?? '',
                contentHash: entry?.contentHash ?? evidence.artifactHash,
                artifactUri: entry?.artifactUri ?? evidence.artifactUri,
                metadata: entry?.metadata,
            };
        })
            .sort((a, b) => a.sequence - b.sequence);
        chains.push({
            claimId: claim.claimId,
            entityId: claim.entityId,
            summary: claim.summary,
            evidence: nodes,
        });
    }
    return chains;
}
