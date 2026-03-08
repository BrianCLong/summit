"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seal = seal;
exports.open = open;
const index_1 = require("./index");
const crypto_1 = require("crypto");
const kp = (0, index_1.buildProvider)();
async function seal(tenant, plaintext, purpose = 'vault') {
    const ctx = { tenant, env: process.env.ENV || 'stage', purpose };
    const { plaintext: dek, ciphertext: edek } = await kp.generateDataKey(ctx);
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', dek, iv);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    dek.fill(0);
    return { edek, iv, tag, ct, ctx };
}
async function open(tenant, blob) {
    const dek = await kp.decrypt(blob.edek, blob.ctx);
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', dek, blob.iv);
    decipher.setAuthTag(blob.tag);
    const pt = Buffer.concat([decipher.update(blob.ct), decipher.final()]);
    dek.fill(0);
    return pt;
}
