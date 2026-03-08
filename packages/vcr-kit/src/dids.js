"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryDidResolver = void 0;
exports.deriveDidKeyDocument = deriveDidKeyDocument;
exports.publicKeyFromMultibase = publicKeyFromMultibase;
exports.verifyEd25519Signature = verifyEd25519Signature;
const bs58_1 = __importDefault(require("bs58"));
const ed25519_1 = require("@noble/ed25519");
// Multicodec prefix for Ed25519 public key
const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);
class InMemoryDidResolver {
    docs = new Map();
    constructor(initialDocs = []) {
        initialDocs.forEach((doc) => this.docs.set(doc.id, doc));
    }
    register(doc) {
        this.docs.set(doc.id, doc);
    }
    async resolve(did) {
        if (did.startsWith('did:key:')) {
            return deriveDidKeyDocument(did);
        }
        const doc = this.docs.get(did);
        if (!doc) {
            throw new Error(`DID document not found for ${did}`);
        }
        return doc;
    }
}
exports.InMemoryDidResolver = InMemoryDidResolver;
function deriveDidKeyDocument(did) {
    const fragment = `${did}#keys-1`;
    const publicKeyMultibase = did.replace('did:key:', '');
    return {
        id: did,
        assertionMethod: [fragment],
        verificationMethod: [
            {
                id: fragment,
                type: 'Ed25519VerificationKey2020',
                controller: did,
                publicKeyMultibase,
            },
        ],
    };
}
function publicKeyFromMultibase(multibaseKey) {
    if (!multibaseKey.startsWith('z')) {
        throw new Error('Only base58-btc multibase keys are supported');
    }
    const decoded = bs58_1.default.decode(multibaseKey.slice(1));
    if (decoded.length !== 34) {
        throw new Error('Unsupported key length for did:key');
    }
    const keyBytes = decoded.slice(2);
    if (decoded[0] !== ED25519_PREFIX[0] ||
        decoded[1] !== ED25519_PREFIX[1]) {
        throw new Error('Unsupported multicodec prefix for did:key');
    }
    return keyBytes;
}
async function verifyEd25519Signature(publicKey, data, signature) {
    return (0, ed25519_1.verify)(signature, data, publicKey);
}
