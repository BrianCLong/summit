"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsKmsEnvelopeProvider = void 0;
exports.buildEnvelopeCiphertext = buildEnvelopeCiphertext;
const node_crypto_1 = require("node:crypto");
const rotation_js_1 = require("../rotation.js");
function decodeEnvelope(ciphertext) {
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (!parsed.dataKeyCiphertext || !parsed.iv || !parsed.authTag || !parsed.payload) {
        throw new Error('Malformed KMS envelope');
    }
    return parsed;
}
function decryptPayload(envelope, dataKey) {
    const iv = Buffer.from(envelope.iv, 'base64');
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(envelope.payload, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf-8');
}
function encryptPayload(dataKey, plaintext) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', dataKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        dataKeyCiphertext: '',
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        payload: encrypted.toString('base64'),
    };
}
function encodeEnvelope(envelope) {
    return Buffer.from(JSON.stringify(envelope), 'utf-8').toString('base64');
}
function assertKmsRef(ref) {
    if (ref.provider !== 'kms') {
        throw new Error('AWS KMS provider only supports KMS secret references');
    }
    return ref;
}
async function decryptDataKey(kms, envelope, context) {
    const response = await kms.decrypt({
        CiphertextBlob: Buffer.from(envelope.dataKeyCiphertext, 'base64'),
        EncryptionContext: context,
    });
    if (!response.Plaintext) {
        throw new Error('KMS decrypt did not return a plaintext key');
    }
    return response.Plaintext instanceof Uint8Array
        ? response.Plaintext
        : new Uint8Array(response.Plaintext);
}
function buildEnvelopeCiphertext(dataKeyCiphertext, dataKeyPlaintext, plaintext) {
    const envelope = encryptPayload(dataKeyPlaintext, plaintext);
    envelope.dataKeyCiphertext = Buffer.from(dataKeyCiphertext).toString('base64');
    return encodeEnvelope(envelope);
}
class AwsKmsEnvelopeProvider {
    name = 'aws-kms-envelope';
    kms;
    constructor(kms) {
        this.kms = kms;
    }
    supports(ref) {
        return ref.provider === 'kms';
    }
    describeRotation(ref) {
        return (0, rotation_js_1.rotationStatusForRef)(assertKmsRef(ref));
    }
    async getSecret(ref) {
        const kmsRef = assertKmsRef(ref);
        const envelope = decodeEnvelope(kmsRef.ciphertext);
        const dataKey = await decryptDataKey(this.kms, envelope, kmsRef.encryptionContext);
        const plaintext = decryptPayload(envelope, dataKey);
        return {
            provider: this.name,
            value: plaintext,
            version: kmsRef.version,
            rotation: (0, rotation_js_1.rotationStatusForRef)(kmsRef),
        };
    }
    async rotateSecret(ref) {
        const kmsRef = assertKmsRef(ref);
        const envelope = decodeEnvelope(kmsRef.ciphertext);
        const dataKey = await decryptDataKey(this.kms, envelope, kmsRef.encryptionContext);
        const plaintext = decryptPayload(envelope, dataKey);
        if (!this.kms.generateDataKey) {
            throw new Error('KMS client does not support data key generation');
        }
        const rotated = await this.kms.generateDataKey({
            KeyId: kmsRef.keyId,
            KeySpec: 'AES_256',
            EncryptionContext: kmsRef.encryptionContext,
        });
        if (!rotated.CiphertextBlob || !rotated.Plaintext) {
            throw new Error('KMS generateDataKey response is missing required fields');
        }
        const updatedCiphertext = buildEnvelopeCiphertext(rotated.CiphertextBlob, rotated.Plaintext, plaintext);
        const updatedRef = {
            ...kmsRef,
            ciphertext: updatedCiphertext,
            rotation: {
                ...(kmsRef.rotation ?? { intervalDays: 90 }),
                lastRotated: new Date().toISOString(),
            },
        };
        return {
            provider: this.name,
            value: plaintext,
            version: updatedRef.version,
            updatedRef,
            rotation: (0, rotation_js_1.rotationStatusForRef)(updatedRef),
        };
    }
}
exports.AwsKmsEnvelopeProvider = AwsKmsEnvelopeProvider;
