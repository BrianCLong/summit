"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enc = enc;
exports.dec = dec;
const client_kms_1 = require("@aws-sdk/client-kms");
const kms = new client_kms_1.KMSClient({});
const KEY_ID = process.env.KMS_KEY_ID;
async function enc(plaintext) {
    const r = await kms.send(new client_kms_1.EncryptCommand({ KeyId: KEY_ID, Plaintext: plaintext }));
    return Buffer.from(r.CiphertextBlob).toString('base64');
}
async function dec(ciphertextB64) {
    const r = await kms.send(new client_kms_1.DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertextB64, 'base64'),
    }));
    return Buffer.from(r.Plaintext);
}
