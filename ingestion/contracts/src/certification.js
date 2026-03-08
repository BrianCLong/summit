"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationWorkflow = exports.CertificateAuthority = void 0;
const crypto_1 = require("crypto");
const specification_js_1 = require("./specification.js");
class CertificateAuthority {
    signer;
    privateKey;
    publicKey;
    constructor(signer = 'dpic-ca') {
        this.signer = signer;
        const { privateKey, publicKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }
    signContract(spec) {
        const payload = {
            contractId: spec.id,
            dataset: spec.dataset,
            version: spec.version,
            issuedAt: new Date().toISOString(),
            signedBy: this.signer
        };
        const signer = (0, crypto_1.createSign)('RSA-SHA256');
        signer.update(JSON.stringify({ contract: spec, issuedAt: payload.issuedAt }));
        payload.signature = signer.sign(this.privateKey, 'base64');
        return payload;
    }
    verify(payload, spec) {
        const verifier = (0, crypto_1.verify)('RSA-SHA256', Buffer.from(JSON.stringify({ contract: spec, issuedAt: payload.issuedAt })), this.publicKey, Buffer.from(payload.signature, 'base64'));
        return verifier;
    }
    get publicKeyPem() {
        return this.publicKey;
    }
}
exports.CertificateAuthority = CertificateAuthority;
class CertificationWorkflow {
    ca;
    constructor(ca) {
        this.ca = ca;
    }
    certify(spec) {
        const specification = new specification_js_1.ContractSpecification(spec);
        const findings = specification.validate();
        const blockingIssues = findings.filter((finding) => finding.severity === 'error');
        if (blockingIssues.length) {
            throw new Error(`contract ${spec.id} failed validation: ${blockingIssues[0].issue}`);
        }
        const signature = this.ca.signContract(spec);
        const hashedTerms = specification.hashTerms();
        const cert = {
            ...signature,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
            contractId: spec.id,
            dataset: spec.dataset,
            version: spec.version,
            signedBy: signature.signedBy,
            signature: signature.signature,
            issuedAt: signature.issuedAt
        };
        spec.termsHash = hashedTerms;
        spec.certified = true;
        spec.certifiedAt = cert.issuedAt;
        spec.signature = cert.signature;
        return { cert, findings };
    }
    enforceProductionGate(spec) {
        if (!spec.certified || !spec.signature) {
            throw new Error('production ingest blocked: contract is not certified');
        }
        const tamperHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(spec.fields)).digest('hex');
        if (tamperHash !== spec.termsHash) {
            throw new Error('production ingest blocked: contract hash mismatch');
        }
    }
}
exports.CertificationWorkflow = CertificationWorkflow;
