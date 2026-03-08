"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsKmsProvider = void 0;
exports.buildProvider = buildProvider;
class AwsKmsProvider {
    keyIdOrAlias;
    constructor(keyIdOrAlias = process.env.KMS_KEY_ID ||
        'alias/conductor/stage/mrk') {
        this.keyIdOrAlias = keyIdOrAlias;
    }
    kms = new (require('@aws-sdk/client-kms').KMSClient)({
        region: process.env.AWS_REGION,
    });
    async encrypt(pt, ctx) {
        const { EncryptCommand } = require('@aws-sdk/client-kms');
        const r = await this.kms.send(new EncryptCommand({
            KeyId: this.keyIdOrAlias,
            Plaintext: pt,
            EncryptionContext: ctx,
        }));
        return Buffer.from(r.CiphertextBlob);
    }
    async decrypt(ct, ctx) {
        const { DecryptCommand } = require('@aws-sdk/client-kms');
        const r = await this.kms.send(new DecryptCommand({ CiphertextBlob: ct, EncryptionContext: ctx }));
        return Buffer.from(r.Plaintext);
    }
    async generateDataKey(ctx) {
        const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
        const r = await this.kms.send(new GenerateDataKeyCommand({
            KeyId: this.keyIdOrAlias,
            KeySpec: 'AES_256',
            EncryptionContext: ctx,
        }));
        return {
            plaintext: Buffer.from(r.Plaintext),
            ciphertext: Buffer.from(r.CiphertextBlob),
        };
    }
}
exports.AwsKmsProvider = AwsKmsProvider;
function buildProvider() {
    const backend = process.env.CRYPTO_BACKEND || 'aws-kms';
    if (backend === 'aws-kms')
        return new AwsKmsProvider();
    throw new Error(`unsupported crypto backend: ${backend}`); // gcp-kms/azure-keyvault stubs can plug here
}
