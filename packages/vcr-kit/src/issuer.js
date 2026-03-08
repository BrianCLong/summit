"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueConsentReceipt = issueConsentReceipt;
const node_crypto_1 = require("node:crypto");
const canonicalize_1 = __importDefault(require("canonicalize"));
const luxon_1 = require("luxon");
const crypto_js_1 = require("./crypto.js");
async function issueConsentReceipt(options) {
    const issuanceDate = luxon_1.DateTime.utc().toISO();
    const credentialId = options.credentialId ?? `urn:uuid:${(0, node_crypto_1.randomUUID)()}`;
    const expirationDate = options.expirationDate
        ? normalizeExpiration(options.expirationDate)
        : undefined;
    const credential = {
        '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://w3id.org/consent/v1',
        ],
        id: credentialId,
        type: ['VerifiableCredential', 'ConsentReceiptCredential'],
        issuer: options.issuerDid,
        issuanceDate,
        expirationDate,
        credentialSubject: {
            ...options.subject,
            consent: options.claims,
        },
    };
    const serialized = (0, canonicalize_1.default)({ ...credential });
    if (!serialized) {
        throw new Error('Failed to canonicalize credential');
    }
    const signature = await (0, crypto_js_1.signEd25519)(Buffer.from(serialized), options.issuerPrivateKey);
    const proof = {
        type: 'Ed25519Signature2020',
        created: issuanceDate,
        verificationMethod: `${options.issuerDid}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue: (0, crypto_js_1.base64UrlEncode)(signature),
        revocationListCredential: options.revocationListCredential,
    };
    credential.proof = proof;
    return credential;
}
function normalizeExpiration(value) {
    if (!value) {
        throw new Error('Expiration value missing');
    }
    if (typeof value === 'string') {
        return luxon_1.DateTime.fromISO(value, { zone: 'utc' }).toISO();
    }
    if (value instanceof Date) {
        return luxon_1.DateTime.fromJSDate(value).toUTC().toISO();
    }
    return value.toUTC().toISO();
}
