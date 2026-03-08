"use strict";
/**
 * Zero-Knowledge Proof Service - Privacy-preserving credential verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKProofService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class ZKProofService {
    proofRequests = new Map();
    generatedProofs = new Map();
    async createProofRequest(name, requestedAttributes, requestedPredicates) {
        const request = {
            id: crypto_1.default.randomUUID(),
            name,
            version: '1.0',
            requestedAttributes,
            requestedPredicates,
        };
        this.proofRequests.set(request.id, request);
        return request;
    }
    async generateProof(requestId, credentials, revealedAttributeNames) {
        const request = this.proofRequests.get(requestId);
        if (!request) {
            throw new Error(`Proof request ${requestId} not found`);
        }
        const revealedAttributes = {};
        const hiddenAttributes = {};
        // Separate revealed and hidden attributes
        for (const credential of credentials) {
            for (const [key, value] of Object.entries(credential.credentialSubject)) {
                if (key === 'id') {
                    continue;
                }
                if (revealedAttributeNames.includes(key)) {
                    revealedAttributes[key] = String(value);
                }
                else {
                    hiddenAttributes[key] = String(value);
                }
            }
        }
        // Generate ZK proof (simplified - in production use proper ZK library)
        const proofData = {
            revealed: revealedAttributes,
            hiddenCommitments: this.createCommitments(hiddenAttributes),
            nonce: crypto_1.default.randomBytes(16).toString('hex'),
        };
        const proof = {
            proofId: crypto_1.default.randomUUID(),
            requestId,
            proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
            revealedAttributes,
            timestamp: new Date(),
        };
        this.generatedProofs.set(proof.proofId, proof);
        return proof;
    }
    async verifyProof(proofId, expectedAttributes) {
        const proof = this.generatedProofs.get(proofId);
        if (!proof) {
            return false;
        }
        // Verify revealed attributes match expectations
        if (expectedAttributes) {
            for (const [key, value] of Object.entries(expectedAttributes)) {
                if (proof.revealedAttributes[key] !== value) {
                    return false;
                }
            }
        }
        // Verify ZK proof structure (simplified)
        try {
            const proofData = JSON.parse(Buffer.from(proof.proof, 'base64').toString());
            if (!proofData.nonce || !proofData.hiddenCommitments) {
                return false;
            }
        }
        catch {
            return false;
        }
        proof.verified = true;
        return true;
    }
    async generateAgeProof(credential, minimumAge) {
        const birthDate = credential.credentialSubject['birthDate'];
        if (!birthDate) {
            throw new Error('Credential does not contain birthDate');
        }
        const age = this.calculateAge(new Date(birthDate));
        const meetsRequirement = age >= minimumAge;
        // Generate range proof that proves age >= minimumAge without revealing actual age
        const proofData = {
            predicate: {
                attribute: 'age',
                operator: '>=',
                value: minimumAge,
                satisfied: meetsRequirement,
            },
            commitment: crypto_1.default.createHash('sha256').update(birthDate).digest('hex'),
            nonce: crypto_1.default.randomBytes(16).toString('hex'),
        };
        const proof = {
            proofId: crypto_1.default.randomUUID(),
            requestId: 'age-verification',
            proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
            revealedAttributes: { meetsAgeRequirement: String(meetsRequirement) },
            timestamp: new Date(),
        };
        this.generatedProofs.set(proof.proofId, proof);
        return proof;
    }
    async generateMembershipProof(credential, allowedValues, attributeName) {
        const value = credential.credentialSubject[attributeName];
        const isMember = allowedValues.includes(value);
        // Generate set membership proof
        const proofData = {
            setMembership: {
                attribute: attributeName,
                setCommitment: crypto_1.default
                    .createHash('sha256')
                    .update(allowedValues.join(','))
                    .digest('hex'),
                isMember,
            },
            nonce: crypto_1.default.randomBytes(16).toString('hex'),
        };
        const proof = {
            proofId: crypto_1.default.randomUUID(),
            requestId: 'membership-verification',
            proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
            revealedAttributes: { isMember: String(isMember) },
            timestamp: new Date(),
        };
        this.generatedProofs.set(proof.proofId, proof);
        return proof;
    }
    createCommitments(attributes) {
        const commitments = {};
        for (const [key, value] of Object.entries(attributes)) {
            const salt = crypto_1.default.randomBytes(16).toString('hex');
            commitments[key] = crypto_1.default
                .createHash('sha256')
                .update(value + salt)
                .digest('hex');
        }
        return commitments;
    }
    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
}
exports.ZKProofService = ZKProofService;
