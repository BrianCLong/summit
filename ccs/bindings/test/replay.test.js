"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const crypto_1 = require("crypto");
const assert_1 = __importDefault(require("assert"));
const index_1 = require("../src/index");
function decodeHex(input) {
    if (input.length % 2 !== 0) {
        throw new Error('hex input must have even length');
    }
    const out = new Uint8Array(input.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        const byte = parseInt(input.slice(i * 2, i * 2 + 2), 16);
        if (Number.isNaN(byte)) {
            throw new Error('invalid hex input');
        }
        out[i] = byte;
    }
    return out;
}
function encodeHex(bytes) {
    return Buffer.from(bytes).toString('hex');
}
function buildCertificate(participants, plan, seedHex, secretSeedHex) {
    const seed = decodeHex(seedHex);
    const secretSeed = decodeHex(secretSeedHex);
    const keyPair = tweetnacl_1.default.sign.keyPair.fromSeed(secretSeed);
    const transcript = [];
    const buckets = new Map();
    const strata = {};
    for (const participant of participants) {
        const stratum = plan.keys
            .map((key) => `${key}=${participant.attributes[key]}`)
            .join('|');
        const message = new Uint8Array(seed.length + participant.id.length);
        message.set(seed);
        message.set(Buffer.from(participant.id), seed.length);
        const proof = tweetnacl_1.default.sign.detached(message, keyPair.secretKey);
        const randomness = (0, crypto_1.createHash)('sha256')
            .update(Buffer.from(proof))
            .digest('hex');
        const entry = {
            id: participant.id,
            stratum,
            randomness,
            proof: Buffer.from(proof).toString('base64'),
        };
        transcript.push(entry);
        const bucket = buckets.get(stratum) ?? [];
        bucket.push({
            id: participant.id,
            stratum,
            randomness,
            proof: entry.proof,
        });
        buckets.set(stratum, bucket);
    }
    for (const [_, bucket] of buckets.entries()) {
        bucket.sort((a, b) => {
            if (a.randomness === b.randomness) {
                return a.id.localeCompare(b.id);
            }
            return a.randomness.localeCompare(b.randomness);
        });
    }
    const cohort = [];
    for (const [stratum, target] of Object.entries(plan.targets)) {
        const bucket = buckets.get(stratum) ?? [];
        cohort.push(...bucket.slice(0, target));
        strata[stratum] = {
            target,
            selected: target,
            available: bucket.length,
        };
    }
    cohort.sort((a, b) => {
        if (a.stratum === b.stratum) {
            if (a.randomness === b.randomness) {
                return a.id.localeCompare(b.id);
            }
            return a.randomness.localeCompare(b.randomness);
        }
        return a.stratum.localeCompare(b.stratum);
    });
    const certificate = {
        seed: seedHex,
        publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
        plan,
        strata,
        exclusions: [],
        cohort,
        transcript,
        timestamp: new Date().toISOString(),
        hash: encodeHex(new Uint8Array(32)),
    };
    return certificate;
}
const participants = [
    { id: 'p1', attributes: { region: 'na', tier: 'control' } },
    { id: 'p2', attributes: { region: 'na', tier: 'treatment' } },
    { id: 'p3', attributes: { region: 'eu', tier: 'control' } },
    { id: 'p4', attributes: { region: 'eu', tier: 'treatment' } },
    { id: 'p5', attributes: { region: 'na', tier: 'control' } },
    { id: 'p6', attributes: { region: 'na', tier: 'treatment' } },
];
const plan = {
    keys: ['region', 'tier'],
    targets: {
        'region=na|tier=control': 1,
        'region=na|tier=treatment': 1,
        'region=eu|tier=control': 1,
        'region=eu|tier=treatment': 1,
    },
};
const seedHex = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const secretSeedHex = '1a0d6b29f9796dfd7c9230abd6f3a5b4f6274957332b26738d0fdb59bd4cb0f1';
const certificate = buildCertificate(participants, plan, seedHex, secretSeedHex);
(0, index_1.verifyCertificate)(participants, certificate);
const tampered = { ...certificate, cohort: [...certificate.cohort] };
tampered.cohort[0] = { ...tampered.cohort[0], id: 'bad' };
let failed = false;
try {
    (0, index_1.verifyCertificate)(participants, tampered);
}
catch (_err) {
    failed = true;
}
assert_1.default.ok(failed, 'tampering should fail verification');
// TypeScript replay verification passed
