"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueDEK = issueDEK;
const client_kms_1 = require("@aws-sdk/client-kms");
const kms = new client_kms_1.KMSClient({});
const KEY_ARN = process.env.KMS_KEY_ARN;
async function issueDEK(runId, stepId) {
    const { CiphertextBlob, Plaintext } = await kms.send(new client_kms_1.GenerateDataKeyCommand({
        KeyId: KEY_ARN,
        KeySpec: 'AES_256',
        EncryptionContext: { runId, stepId },
    }));
    return {
        dek: Buffer.from(Plaintext),
        wrapped: Buffer.from(CiphertextBlob),
    };
}
