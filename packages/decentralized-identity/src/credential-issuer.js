"use strict";
/**
 * Credential Issuer - Issue and manage verifiable credentials
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialIssuer = void 0;
const crypto_1 = __importDefault(require("crypto"));
class CredentialIssuer {
    issuedCredentials = new Map();
    async issueCredential(options) {
        const credentialId = `urn:uuid:${crypto_1.default.randomUUID()}`;
        const issuanceDate = new Date().toISOString();
        const credential = {
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'https://www.w3.org/2018/credentials/examples/v1',
            ],
            id: credentialId,
            type: ['VerifiableCredential', options.credentialType],
            issuer: options.issuerDid,
            issuanceDate,
            expirationDate: options.expirationDate?.toISOString(),
            credentialSubject: {
                id: options.subjectDid,
                ...options.claims,
            },
        };
        // Sign credential
        credential.proof = await this.createProof(credential, options.issuerDid, options.issuerPrivateKey);
        this.issuedCredentials.set(credentialId, credential);
        return credential;
    }
    async issueDataContributorCredential(issuerDid, issuerPrivateKey, subjectDid, poolId, contributionCount) {
        return this.issueCredential({
            issuerDid,
            issuerPrivateKey,
            subjectDid,
            credentialType: 'DataContributorCredential',
            claims: {
                poolId,
                contributionCount,
                contributorSince: new Date().toISOString(),
                trustLevel: this.calculateTrustLevel(contributionCount),
            },
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
    }
    async issueDataAccessCredential(issuerDid, issuerPrivateKey, subjectDid, poolIds, accessLevel) {
        return this.issueCredential({
            issuerDid,
            issuerPrivateKey,
            subjectDid,
            credentialType: 'DataAccessCredential',
            claims: {
                poolIds,
                accessLevel,
                grantedAt: new Date().toISOString(),
            },
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
    }
    async revokeCredential(credentialId) {
        return this.issuedCredentials.delete(credentialId);
    }
    async getCredential(credentialId) {
        return this.issuedCredentials.get(credentialId);
    }
    async createProof(credential, issuerDid, _privateKey) {
        const dataToSign = JSON.stringify({
            '@context': credential['@context'],
            type: credential.type,
            issuer: credential.issuer,
            issuanceDate: credential.issuanceDate,
            credentialSubject: credential.credentialSubject,
        });
        // Create signature (simplified - in production use proper JWS)
        const signature = crypto_1.default
            .createHash('sha256')
            .update(dataToSign)
            .digest('base64url');
        return {
            type: 'JsonWebSignature2020',
            created: new Date().toISOString(),
            verificationMethod: `${issuerDid}#key-1`,
            proofPurpose: 'assertionMethod',
            jws: signature,
        };
    }
    calculateTrustLevel(contributionCount) {
        if (contributionCount >= 100) {
            return 'gold';
        }
        if (contributionCount >= 50) {
            return 'silver';
        }
        if (contributionCount >= 10) {
            return 'bronze';
        }
        return 'standard';
    }
}
exports.CredentialIssuer = CredentialIssuer;
