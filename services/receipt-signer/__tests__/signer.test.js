"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const client_kms_1 = require("@aws-sdk/client-kms");
const receipt_js_1 = require("../../../packages/provenance/src/receipt.js");
const signer_js_1 = require("../src/signer.js");
class MockKmsClient {
    lastSign;
    lastVerify;
    signature;
    verifyResult;
    constructor(options) {
        this.signature =
            options?.signature ??
                new Uint8Array(Buffer.from('fake-signature', 'utf8'));
        this.verifyResult = options?.verifyResult ?? true;
    }
    async send(command) {
        if (command instanceof client_kms_1.SignCommand) {
            this.lastSign = command.input;
            return {
                Signature: this.signature,
                SigningAlgorithm: command.input.SigningAlgorithm,
            };
        }
        if (command instanceof client_kms_1.VerifyCommand) {
            this.lastVerify = command.input;
            return {
                SignatureValid: this.verifyResult,
            };
        }
        throw new Error('Unsupported command');
    }
    destroy() {
        /* noop */
    }
}
const unsignedReceipt = {
    id: 'a1039d40-02e9-4b8c-b9a6-5a49753f10c4',
    schemaVersion: receipt_js_1.RECEIPT_SCHEMA_VERSION,
    issuer: 'kms:alias/provenance-signing',
    subject: 'artifact:example',
    issuedAt: '2025-01-01T00:00:00.000Z',
    payload: {
        artifactHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        manifestUri: 'https://example.test/manifest.json',
        nonce: 'nonce-1234567890',
    },
};
describe('ReceiptSigner', () => {
    it('signs a receipt and returns the KMS signature', async () => {
        const mockKms = new MockKmsClient();
        const signer = new signer_js_1.ReceiptSigner({
            kmsKeyId: 'alias/provenance-key',
            client: mockKms,
        });
        const signed = await signer.sign(unsignedReceipt);
        expect(signed.signature.value).toBe(Buffer.from('fake-signature').toString('base64'));
        expect(signed.signature.messageDigest).toHaveLength(64);
        expect(mockKms.lastSign?.KeyId).toBe('alias/provenance-key');
        expect(mockKms.lastSign?.MessageType).toBe('DIGEST');
    });
    it('verifies a receipt using KMS verify', async () => {
        const mockKms = new MockKmsClient({ verifyResult: true });
        const signer = new signer_js_1.ReceiptSigner({
            kmsKeyId: 'alias/provenance-key',
            client: mockKms,
        });
        const signed = await signer.sign(unsignedReceipt);
        const isValid = await signer.verify(signed);
        expect(isValid).toBe(true);
        expect(mockKms.lastVerify?.SigningAlgorithm).toBe(signed.signature.algorithm);
    });
    it('produces deterministic digests for canonical payloads', () => {
        const canonicalA = (0, signer_js_1.canonicaliseReceipt)(unsignedReceipt);
        const canonicalB = (0, signer_js_1.canonicaliseReceipt)({
            ...unsignedReceipt,
            payload: {
                ...unsignedReceipt.payload,
                metadata: { region: 'us-east-1' },
            },
        });
        expect(canonicalA.equals(canonicalB)).toBe(false);
        expect(JSON.parse(canonicalA.toString()).id).toBe(unsignedReceipt.id);
    });
});
