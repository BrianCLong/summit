"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PkiManager = void 0;
const crypto_1 = require("crypto");
function buildKeyPair() {
    const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('ec', {
        namedCurve: 'P-256',
    });
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    return {
        privateKey: privateKeyPem.toString(),
        publicKey: publicKeyPem.toString(),
        keyObject: privateKey,
    };
}
class PkiManager {
    caId;
    caPrivateKey;
    certificates = new Map();
    constructor(caSubject, caId) {
        this.caId = caId ?? `ca-${(0, crypto_1.randomUUID)()}`;
        this.caPrivateKey = buildKeyPair();
        const caCertificate = this.issueCertificateInternal(caSubject, 24 * 60, { isCa: 'true' });
        this.certificates.set(caCertificate.certificate.id, {
            ...caCertificate,
            revocationReason: undefined,
        });
    }
    listCertificates() {
        return Array.from(this.certificates.values()).map((record) => record.certificate);
    }
    issueCertificate(subject, ttlMinutes, metadata) {
        const certificate = this.issueCertificateInternal(subject, ttlMinutes, metadata);
        this.certificates.set(certificate.certificate.id, {
            ...certificate,
            revocationReason: undefined,
        });
        return certificate;
    }
    issueCertificateInternal(subject, ttlMinutes, metadata) {
        const keyPair = buildKeyPair();
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60_000);
        const certificatePayload = JSON.stringify({
            subject,
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            publicKey: keyPair.publicKey,
            issuer: this.caId,
            metadata,
        });
        const signer = (0, crypto_1.createSign)('SHA256');
        signer.update(certificatePayload);
        const signature = signer.sign(this.caPrivateKey.keyObject, 'base64');
        const certificate = {
            id: `cert-${(0, crypto_1.randomUUID)()}`,
            subject,
            issuer: this.caId,
            issuedAt: issuedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            publicKey: keyPair.publicKey,
            signature,
            metadata,
        };
        return { certificate, privateKey: keyPair.privateKey };
    }
    verifyCertificate(certificate) {
        const reasons = [];
        const verification = (0, crypto_1.createVerify)('SHA256');
        verification.update(JSON.stringify({
            subject: certificate.subject,
            issuedAt: certificate.issuedAt,
            expiresAt: certificate.expiresAt,
            publicKey: certificate.publicKey,
            issuer: certificate.issuer,
            metadata: certificate.metadata,
        }));
        const now = Date.now();
        if (new Date(certificate.expiresAt).getTime() <= now) {
            reasons.push('certificate expired');
        }
        const record = this.certificates.get(certificate.id);
        if (record?.revocationReason) {
            reasons.push(`revoked: ${record.revocationReason}`);
        }
        if (certificate.issuer !== this.caId) {
            reasons.push('unexpected issuer');
        }
        const signatureValid = verification.verify(this.caPrivateKey.publicKey, certificate.signature, 'base64');
        if (!signatureValid) {
            reasons.push('signature invalid');
        }
        return { valid: reasons.length === 0, reasons };
    }
    rotateCertificate(certId, ttlMinutes) {
        const existing = this.certificates.get(certId);
        if (!existing) {
            throw new Error(`certificate ${certId} not found`);
        }
        this.revokeCertificate(certId, 'rotated');
        return this.issueCertificate(existing.certificate.subject, ttlMinutes, {
            ...existing.certificate.metadata,
            rotatedFrom: certId,
        });
    }
    revokeCertificate(certId, reason) {
        const record = this.certificates.get(certId);
        if (!record) {
            throw new Error(`certificate ${certId} not found`);
        }
        this.certificates.set(certId, {
            ...record,
            revocationReason: reason,
        });
    }
    mutualTlsHandshake(client, server) {
        const clientVerification = this.verifyCertificate(client);
        const serverVerification = this.verifyCertificate(server);
        const reasons = [
            ...clientVerification.reasons.map((reason) => `client: ${reason}`),
            ...serverVerification.reasons.map((reason) => `server: ${reason}`),
        ];
        const allowed = clientVerification.valid && serverVerification.valid;
        if (!allowed && reasons.length === 0) {
            reasons.push('handshake failed for unknown reasons');
        }
        return {
            clientValid: clientVerification.valid,
            serverValid: serverVerification.valid,
            allowed,
            reasons,
        };
    }
    getRevocationCount() {
        return Array.from(this.certificates.values()).filter((record) => Boolean(record.revocationReason)).length;
    }
}
exports.PkiManager = PkiManager;
