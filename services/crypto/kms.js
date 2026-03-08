"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptBlob = encryptBlob;
exports.decryptBlob = decryptBlob;
const client_kms_1 = require("@aws-sdk/client-kms");
const kms = new client_kms_1.KMSClient({ region: process.env.AWS_REGION });
async function encryptBlob(plaintext, aad) {
    const r = await kms.send(new client_kms_1.EncryptCommand({
        KeyId: process.env.KMS_KEY_ID,
        Plaintext: plaintext,
        EncryptionContext: aad,
    }));
    return Buffer.from(r.CiphertextBlob);
}
async function decryptBlob(cipher, aad) {
    const r = await kms.send(new client_kms_1.DecryptCommand({
        CiphertextBlob: cipher,
        EncryptionContext: aad,
    }));
    return Buffer.from(r.Plaintext);
}
