"use strict";
/**
 * DID Manager - Create, resolve, and manage Decentralized Identifiers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIDManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class DIDManager {
    documents = new Map();
    async createDID(method = 'key', options) {
        const keyPair = await this.generateKeyPair();
        const did = this.generateDID(method, keyPair.publicKey);
        const document = {
            '@context': [
                'https://www.w3.org/ns/did/v1',
                'https://w3id.org/security/suites/jws-2020/v1',
            ],
            id: did,
            controller: options?.controller,
            verificationMethod: [
                {
                    id: `${did}#key-1`,
                    type: 'JsonWebKey2020',
                    controller: did,
                    publicKeyJwk: {
                        kty: 'EC',
                        crv: 'P-256',
                        x: keyPair.publicKey.substring(0, 43),
                        y: keyPair.publicKey.substring(43),
                    },
                },
            ],
            authentication: [`${did}#key-1`],
            assertionMethod: [`${did}#key-1`],
            service: options?.services,
        };
        this.documents.set(did, document);
        return {
            did,
            document,
            privateKey: keyPair.privateKey,
        };
    }
    async resolveDID(did) {
        // Check local cache
        const cached = this.documents.get(did);
        if (cached) {
            return cached;
        }
        // In production, resolve via DID resolver network
        return undefined;
    }
    async updateDID(did, updates) {
        const document = this.documents.get(did);
        if (!document) {
            return undefined;
        }
        const updated = {
            ...document,
            ...updates,
            id: did, // Ensure ID isn't changed
        };
        this.documents.set(did, updated);
        return updated;
    }
    async addVerificationMethod(did, method) {
        const document = this.documents.get(did);
        if (!document) {
            return undefined;
        }
        document.verificationMethod.push(method);
        return document;
    }
    async addService(did, service) {
        const document = this.documents.get(did);
        if (!document) {
            return undefined;
        }
        document.service = document.service || [];
        document.service.push(service);
        return document;
    }
    async deactivateDID(did) {
        return this.documents.delete(did);
    }
    async generateKeyPair() {
        const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync('ec', {
            namedCurve: 'P-256',
        });
        return {
            publicKey: publicKey
                .export({ type: 'spki', format: 'der' })
                .toString('base64url'),
            privateKey: privateKey
                .export({ type: 'pkcs8', format: 'der' })
                .toString('base64url'),
        };
    }
    generateDID(method, publicKey) {
        const fingerprint = crypto_1.default
            .createHash('sha256')
            .update(publicKey)
            .digest('base64url')
            .substring(0, 32);
        switch (method) {
            case 'key':
                return `did:key:z${fingerprint}`;
            case 'web':
                return `did:web:intelgraph.io:users:${fingerprint}`;
            case 'ion':
                return `did:ion:${fingerprint}`;
            default:
                return `did:key:z${fingerprint}`;
        }
    }
}
exports.DIDManager = DIDManager;
