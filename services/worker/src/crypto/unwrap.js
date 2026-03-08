"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unwrapDEK = unwrapDEK;
const client_kms_1 = require("@aws-sdk/client-kms");
const kms = new client_kms_1.KMSClient({});
async function unwrapDEK(wrapped, claims) {
    if (!claims.attested)
        throw new Error('unwrap denied: not attested');
    const { Plaintext } = await kms.send(new client_kms_1.DecryptCommand({
        CiphertextBlob: wrapped,
        EncryptionContext: { runId: claims.runId, stepId: claims.stepId },
    }));
    return Buffer.from(Plaintext);
}
