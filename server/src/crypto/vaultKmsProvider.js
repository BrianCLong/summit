"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultKmsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class VaultKmsProvider {
    vaultUrl;
    token;
    constructor(vaultUrl, token) {
        this.vaultUrl = vaultUrl;
        this.token = token;
    }
    async encrypt(tenantId, plaintext, aad) {
        const path = `${this.vaultUrl}/v1/transit/encrypt/tenant-${tenantId}`;
        const res = await axios_1.default.post(path, {
            plaintext: plaintext.toString('base64'),
            context: Buffer.from(JSON.stringify(aad)).toString('base64'),
        }, { headers: { 'X-Vault-Token': this.token } });
        return {
            cipher: Buffer.from(res.data.data.ciphertext),
            meta: { v: res.data.data.key_version, aad },
        };
    }
    async decrypt(tenantId, cipher, meta, aad) {
        const path = `${this.vaultUrl}/v1/transit/decrypt/tenant-${tenantId}`;
        const res = await axios_1.default.post(path, {
            ciphertext: cipher.toString(),
            context: Buffer.from(JSON.stringify(aad)).toString('base64'),
        }, { headers: { 'X-Vault-Token': this.token } });
        return Buffer.from(res.data.data.plaintext, 'base64');
    }
}
exports.VaultKmsProvider = VaultKmsProvider;
