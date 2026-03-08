"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentArtifactSigner = void 0;
const node_crypto_1 = require("node:crypto");
class ConsentArtifactSigner {
    privateKeyPem;
    algorithm;
    constructor(privateKeyPem, algorithm = 'RSA-SHA256') {
        this.privateKeyPem = privateKeyPem;
        this.algorithm = algorithm;
    }
    sign(record) {
        const signer = (0, node_crypto_1.createSign)('RSA-SHA256');
        const payload = JSON.stringify(record);
        signer.update(payload);
        signer.end();
        const signature = signer.sign(this.privateKeyPem, 'base64');
        return {
            algorithm: this.algorithm,
            signature,
            payload: record
        };
    }
    static verify(artifact, publicKeyPem) {
        const verifier = (0, node_crypto_1.createVerify)('RSA-SHA256');
        verifier.update(JSON.stringify(artifact.payload));
        verifier.end();
        return verifier.verify(publicKeyPem, artifact.signature, 'base64');
    }
}
exports.ConsentArtifactSigner = ConsentArtifactSigner;
