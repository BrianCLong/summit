"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateValidator = void 0;
const crypto = __importStar(require("node:crypto"));
function normalizeDn(dn) {
    return dn.trim().replace(/\s+/g, ' ').toLowerCase();
}
class CertificateValidator {
    trustAnchors = new Map();
    constructor(anchors = []) {
        anchors.forEach((anchor) => this.addTrustAnchor(anchor));
    }
    addTrustAnchor(pem) {
        const cert = new crypto.X509Certificate(pem);
        this.trustAnchors.set(normalizeDn(cert.subject), cert);
        this.trustAnchors.set(cert.fingerprint256, cert);
    }
    validate(chain = []) {
        if (!chain.length) {
            return {
                valid: this.trustAnchors.size === 0,
                errors: this.trustAnchors.size === 0 ? [] : ['No certificates supplied'],
                depth: 0,
            };
        }
        const errors = [];
        let depth = 0;
        let issuer;
        for (let i = 0; i < chain.length; i += 1) {
            const pem = chain[i];
            let cert;
            try {
                cert = new crypto.X509Certificate(pem);
            }
            catch (error) {
                errors.push(`Invalid certificate at position ${i}: ${error.message}`);
                continue;
            }
            depth += 1;
            const now = Date.now();
            if (new Date(cert.validFrom).getTime() > now) {
                errors.push(`Certificate ${cert.subject} not yet valid`);
            }
            if (new Date(cert.validTo).getTime() < now) {
                errors.push(`Certificate ${cert.subject} expired on ${cert.validTo}`);
            }
            if (i + 1 < chain.length) {
                issuer = new crypto.X509Certificate(chain[i + 1]);
            }
            else {
                const normalizedIssuer = normalizeDn(cert.issuer);
                issuer =
                    this.trustAnchors.get(normalizedIssuer) ||
                        this.trustAnchors.get(cert.fingerprint256) ||
                        undefined;
            }
            if (!issuer) {
                errors.push(`Unable to locate issuer for ${cert.subject}`);
                continue;
            }
            try {
                const verified = cert.verify(issuer.publicKey);
                if (!verified) {
                    errors.push(`Signature validation failed for ${cert.subject}`);
                }
            }
            catch (error) {
                errors.push(`Certificate verification error for ${cert.subject}: ${error.message}`);
            }
        }
        let leafSubject;
        let rootSubject;
        try {
            leafSubject = new crypto.X509Certificate(chain[0]).subject;
        }
        catch {
            leafSubject = undefined;
        }
        try {
            rootSubject = (issuer ?? new crypto.X509Certificate(chain[chain.length - 1])).subject;
        }
        catch {
            rootSubject = issuer?.subject;
        }
        return {
            valid: errors.length === 0,
            errors,
            depth,
            leafSubject,
            rootSubject,
        };
    }
}
exports.CertificateValidator = CertificateValidator;
