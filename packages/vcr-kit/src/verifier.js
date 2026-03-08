"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyConsentReceipt = verifyConsentReceipt;
exports.assertVerified = assertVerified;
const canonicalize_1 = __importDefault(require("canonicalize"));
const luxon_1 = require("luxon");
const crypto_js_1 = require("./crypto.js");
const dids_js_1 = require("./dids.js");
async function verifyConsentReceipt(credential, options) {
    if (!credential.proof) {
        return { verified: false, reason: 'Missing proof' };
    }
    const { proof } = credential;
    const unsigned = { ...credential };
    delete unsigned.proof;
    const serialized = (0, canonicalize_1.default)(unsigned);
    if (!serialized) {
        return { verified: false, reason: 'Unable to canonicalize credential' };
    }
    let doc;
    try {
        doc = await options.resolver.resolve(credential.issuer);
    }
    catch (error) {
        return { verified: false, reason: error.message };
    }
    const verificationMethod = doc.verificationMethod.find((vm) => vm.id === proof.verificationMethod);
    if (!verificationMethod) {
        return { verified: false, reason: 'Verification method not found in DID document' };
    }
    const publicKey = (0, dids_js_1.publicKeyFromMultibase)(verificationMethod.publicKeyMultibase);
    const signature = (0, crypto_js_1.base64UrlDecode)(proof.proofValue);
    const message = Buffer.from(serialized);
    const valid = await (0, dids_js_1.verifyEd25519Signature)(publicKey, message, signature);
    if (!valid) {
        return { verified: false, reason: 'Signature verification failed' };
    }
    const now = resolveVerificationTime(options.atTime);
    const expiry = credential.expirationDate
        ? luxon_1.DateTime.fromISO(credential.expirationDate, { zone: 'utc' })
        : undefined;
    if (expiry && now > expiry) {
        return { verified: false, reason: 'Credential expired' };
    }
    if (options.revocationRegistry) {
        const revoked = await options.revocationRegistry.isRevoked(credential.id);
        if (revoked) {
            return { verified: false, reason: 'Credential revoked' };
        }
    }
    return { verified: true };
}
function assertVerified(result) {
    if (!result.verified) {
        throw new Error(result.reason ?? 'Verification failed');
    }
}
function resolveVerificationTime(atTime) {
    if (!atTime) {
        return luxon_1.DateTime.utc();
    }
    if (atTime instanceof Date) {
        return luxon_1.DateTime.fromJSDate(atTime).toUTC();
    }
    if (typeof atTime === 'string') {
        return luxon_1.DateTime.fromISO(atTime, { zone: 'utc' });
    }
    return atTime.toUTC();
}
