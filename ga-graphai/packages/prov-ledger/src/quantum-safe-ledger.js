"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumSafeLedger = exports.AccessTokenService = void 0;
exports.computeLedgerHash = computeLedgerHash;
exports.generateLamportKeyPair = generateLamportKeyPair;
exports.signWithLamport = signWithLamport;
exports.verifyLamportSignature = verifyLamportSignature;
exports.generateHybridKeyPair = generateHybridKeyPair;
exports.signHybrid = signHybrid;
exports.verifyHybridSignature = verifyHybridSignature;
exports.generateSchnorrKeyPair = generateSchnorrKeyPair;
exports.createSchnorrProof = createSchnorrProof;
exports.verifySchnorrProof = verifySchnorrProof;
const node_crypto_1 = require("node:crypto");
const bundle_utils_js_1 = require("./bundle-utils.js");
const LAMPORT_KEY_COUNT = 256;
const LAMPORT_SECRET_BYTES = 32;
const RFC3526_GROUP14_PRIME = '0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
    '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
    'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
    'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381' +
    'FFFFFFFFFFFFFFFF';
const RFC3526_GROUP14_GENERATOR = 2n;
function sha256(buffer) {
    return (0, node_crypto_1.createHash)('sha256').update(buffer).digest();
}
function sha256Hex(buffer) {
    return sha256(buffer).toString('hex');
}
function bigIntFromHex(hex) {
    return BigInt(hex.startsWith('0x') ? hex : `0x${hex}`);
}
function modPow(base, exponent, modulus) {
    if (modulus === 1n)
        return 0n;
    let result = 1n;
    let b = base % modulus;
    let e = exponent;
    while (e > 0n) {
        if (e % 2n === 1n) {
            result = (result * b) % modulus;
        }
        e /= 2n;
        b = (b * b) % modulus;
    }
    return result;
}
function randomScalar(modulus) {
    const byteLength = Math.ceil(modulus.toString(16).length / 2);
    let scalar = 0n;
    while (scalar === 0n) {
        const bytes = (0, node_crypto_1.randomBytes)(byteLength);
        scalar = BigInt(`0x${bytes.toString('hex')}`) % (modulus - 1n);
    }
    return scalar;
}
function computeLedgerHash(fact, timestamp, previousHash) {
    return sha256Hex(`${fact.id}|${fact.category}|${fact.actor}|${fact.action}|${fact.resource}|${JSON.stringify(fact.payload)}|${timestamp}|${previousHash ?? ''}`);
}
function generateLamportKeyPair() {
    const privateKey = [];
    const publicKey = [];
    for (let i = 0; i < LAMPORT_KEY_COUNT; i += 1) {
        const left = (0, node_crypto_1.randomBytes)(LAMPORT_SECRET_BYTES);
        const right = (0, node_crypto_1.randomBytes)(LAMPORT_SECRET_BYTES);
        privateKey.push([left.toString('base64'), right.toString('base64')]);
        publicKey.push([sha256(left).toString('base64'), sha256(right).toString('base64')]);
    }
    return { publicKey, privateKey };
}
function signWithLamport(message, keyPair) {
    const digest = sha256(typeof message === 'string' ? Buffer.from(message) : message);
    const signature = [];
    digest.forEach((byte, digestIndex) => {
        for (let bit = 0; bit < 8; bit += 1) {
            const isOne = (byte >> bit) & 1;
            const keyIndex = digestIndex * 8 + bit;
            const part = keyPair.privateKey[keyIndex]?.[isOne];
            if (!part) {
                throw new Error(`Missing Lamport private key segment at index ${keyIndex}`);
            }
            signature.push(part);
        }
    });
    return { algorithm: 'lamport-ots-sha256', signature };
}
function verifyLamportSignature(message, signature, publicKey) {
    if (signature.signature.length !== LAMPORT_KEY_COUNT) {
        return false;
    }
    const digest = sha256(typeof message === 'string' ? Buffer.from(message) : message);
    let cursor = 0;
    for (let digestIndex = 0; digestIndex < digest.length; digestIndex += 1) {
        const byte = digest[digestIndex];
        for (let bit = 0; bit < 8; bit += 1) {
            const isOne = (byte >> bit) & 1;
            const pubIndex = digestIndex * 8 + bit;
            const expected = publicKey[pubIndex]?.[isOne];
            const revealed = signature.signature[cursor];
            if (!expected || !revealed) {
                return false;
            }
            if (sha256(Buffer.from(revealed, 'base64')).toString('base64') !== expected) {
                return false;
            }
            cursor += 1;
        }
    }
    return true;
}
function generateHybridKeyPair() {
    const { publicKey, privateKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
    const lamport = generateLamportKeyPair();
    return {
        lamport,
        ed25519PublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        ed25519PrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    };
}
function signHybrid(message, keyPair) {
    const payload = typeof message === 'string' ? Buffer.from(message) : message;
    const lamport = signWithLamport(payload, keyPair.lamport);
    const ed25519Signature = (0, node_crypto_1.sign)(null, payload, keyPair.ed25519PrivateKey).toString('base64');
    return {
        algorithm: 'hybrid-ed25519-lamport',
        lamport,
        lamportPublicKey: keyPair.lamport.publicKey,
        ed25519Signature,
        ed25519PublicKey: keyPair.ed25519PublicKey,
    };
}
function verifyHybridSignature(message, signature) {
    if (signature.algorithm !== 'hybrid-ed25519-lamport') {
        return false;
    }
    const payload = typeof message === 'string' ? Buffer.from(message) : message;
    const lamportOk = verifyLamportSignature(payload, signature.lamport, signature.lamportPublicKey);
    if (!lamportOk) {
        return false;
    }
    const publicKey = (0, node_crypto_1.createPublicKey)(signature.ed25519PublicKey);
    const ed25519Ok = (0, node_crypto_1.verify)(null, payload, publicKey, Buffer.from(signature.ed25519Signature, 'base64'));
    return ed25519Ok;
}
const SCHNORR_MODULUS = bigIntFromHex(RFC3526_GROUP14_PRIME);
const SCHNORR_GENERATOR = RFC3526_GROUP14_GENERATOR;
const SCHNORR_ORDER = SCHNORR_MODULUS - 1n;
function generateSchnorrKeyPair() {
    const secret = randomScalar(SCHNORR_MODULUS);
    const publicKey = modPow(SCHNORR_GENERATOR, secret, SCHNORR_MODULUS);
    return { secret, publicKey };
}
function deriveSchnorrChallenge(commitment, message) {
    const digest = sha256(`${commitment.toString(16)}:${message}`).toString('hex');
    return BigInt(`0x${digest}`) % SCHNORR_ORDER;
}
function createSchnorrProof(keyPair, message, randomNonce) {
    const nonce = randomNonce ?? randomScalar(SCHNORR_MODULUS);
    const commitment = modPow(SCHNORR_GENERATOR, nonce, SCHNORR_MODULUS);
    const challenge = deriveSchnorrChallenge(commitment, message);
    const response = (nonce + challenge * keyPair.secret) % SCHNORR_ORDER;
    return {
        commitment: commitment.toString(16),
        challenge: challenge.toString(16),
        response: response.toString(16),
    };
}
function verifySchnorrProof(publicKey, message, proof) {
    const commitment = bigIntFromHex(proof.commitment);
    const challenge = bigIntFromHex(proof.challenge);
    const response = bigIntFromHex(proof.response);
    const derivedChallenge = deriveSchnorrChallenge(commitment, message);
    if (derivedChallenge !== challenge) {
        return false;
    }
    const lhs = modPow(SCHNORR_GENERATOR, response, SCHNORR_MODULUS);
    const rhs = (commitment * modPow(publicKey, challenge, SCHNORR_MODULUS)) % SCHNORR_MODULUS;
    return lhs === rhs;
}
class AccessTokenService {
    secret;
    ttlMs;
    now;
    constructor(secret, options = {}) {
        this.secret = (0, node_crypto_1.createSecretKey)(Buffer.from(secret));
        this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
        this.now = options.now ?? (() => new Date());
    }
    issue(actor, scope) {
        const issuedAt = this.now().toISOString();
        const expiresAt = new Date(this.now().getTime() + this.ttlMs).toISOString();
        const payload = { actor, scope, issuedAt, expiresAt };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = (0, node_crypto_1.createHmac)('sha256', this.secret).update(payloadBase64).digest('base64url');
        return { token: `${payloadBase64}.${signature}`, payload };
    }
    verify(token, expectedActor, expectedScope, options = {}) {
        const [payloadBase64, signature] = token.split('.');
        if (!payloadBase64 || !signature) {
            return null;
        }
        const expectedSignature = (0, node_crypto_1.createHmac)('sha256', this.secret)
            .update(payloadBase64)
            .digest('base64url');
        if (expectedSignature !== signature) {
            return null;
        }
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
        const now = this.now();
        if (!options.allowExpired && new Date(payload.expiresAt).getTime() < now.getTime()) {
            return null;
        }
        if (expectedActor && payload.actor !== expectedActor) {
            return null;
        }
        if (expectedScope && payload.scope !== expectedScope) {
            return null;
        }
        return payload;
    }
}
exports.AccessTokenService = AccessTokenService;
class QuantumSafeLedger {
    tokenService;
    entries = [];
    now;
    identityPublicKey;
    constructor(tokenService, options = {}) {
        this.tokenService = tokenService;
        this.now = options.now ?? (() => new Date());
        this.identityPublicKey = options.identityPublicKey;
    }
    append(fact, signature, accessToken, zkProof) {
        const timestamp = fact.timestamp ?? this.now().toISOString();
        const previous = this.entries.at(-1);
        const entry = {
            ...fact,
            timestamp,
            previousHash: previous?.hash,
            hash: '',
        };
        entry.hash = computeLedgerHash(entry, timestamp, entry.previousHash);
        const access = this.tokenService.verify(accessToken, entry.actor, fact.category);
        if (!access) {
            throw new Error('Access token is invalid or expired for actor/category');
        }
        if (!verifyHybridSignature(entry.hash, signature)) {
            throw new Error('Signature verification failed');
        }
        if (this.identityPublicKey) {
            if (!zkProof) {
                throw new Error('Zero-knowledge proof is required when an identity key is configured');
            }
            const proofOk = verifySchnorrProof(this.identityPublicKey, entry.hash, zkProof);
            if (!proofOk) {
                throw new Error('Zero-knowledge proof verification failed');
            }
        }
        const chainSource = `${previous?.chainHash ?? ''}|${entry.hash}|${signature.ed25519Signature}`;
        const chainHash = sha256Hex(chainSource);
        const recorded = {
            ...entry,
            chainHash,
            signature,
            zkProof,
            access,
            accessToken,
        };
        this.entries.push(recorded);
        return recorded;
    }
    list(limit = 100) {
        if (limit >= this.entries.length) {
            return [...this.entries];
        }
        return this.entries.slice(this.entries.length - limit);
    }
    verifyChain() {
        return this.entries.every((entry, index) => {
            const payloadHash = computeLedgerHash(entry, entry.timestamp, entry.previousHash);
            if (payloadHash !== entry.hash) {
                return false;
            }
            if (!verifyHybridSignature(entry.hash, entry.signature)) {
                return false;
            }
            const prior = index === 0 ? undefined : this.entries[index - 1];
            const expectedChain = sha256Hex(`${prior?.chainHash ?? ''}|${entry.hash}|${entry.signature.ed25519Signature}`);
            if (entry.chainHash !== expectedChain) {
                return false;
            }
            const tokenPayload = this.tokenService.verify(entry.accessToken, entry.actor, entry.category, {
                allowExpired: true,
            });
            if (!tokenPayload) {
                return false;
            }
            if (this.identityPublicKey) {
                if (!entry.zkProof) {
                    return false;
                }
                if (!verifySchnorrProof(this.identityPublicKey, entry.hash, entry.zkProof)) {
                    return false;
                }
            }
            return true;
        });
    }
    exportEvidence(limit = 200) {
        const entries = this.list(limit);
        const baseBundle = {
            generatedAt: this.now().toISOString(),
            headHash: entries.at(-1)?.chainHash,
            entries,
        };
        const signer = entries.at(-1)?.signature;
        const augmented = (0, bundle_utils_js_1.augmentEvidenceBundle)(baseBundle, entries, {
            signer: 'quantum-safe-ledger',
            publicKey: signer?.ed25519PublicKey,
            signature: signer?.ed25519Signature,
            issuedAt: this.now(),
        });
        const executionAttestation = this.identityPublicKey
            ? (0, bundle_utils_js_1.buildExecutionAttestation)('QuantumSafeLedger chain integrity verified', this.verifyChain(), this.now(), 'quantum-safe-ledger')
            : undefined;
        return { ...augmented, executionAttestation };
    }
}
exports.QuantumSafeLedger = QuantumSafeLedger;
