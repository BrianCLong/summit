"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmsClient = void 0;
const crypto_1 = require("crypto");
class KmsClient {
    options;
    constructor(options) {
        this.options = options;
    }
    async sign(request) {
        const key = (0, crypto_1.createPrivateKey)(this.options.privateKeyPem);
        const signature = (0, crypto_1.sign)(null, request.payload, key);
        return { signature, keyId: this.options.keyId };
    }
}
exports.KmsClient = KmsClient;
