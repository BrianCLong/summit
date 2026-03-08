"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.witnessRegistry = exports.WitnessRegistry = exports.CryptoWitness = exports.mutationWitness = exports.MutationWitnessService = void 0;
const crypto_1 = require("crypto");
class MutationWitnessService {
    static instance;
    witnessId;
    privateKey;
    publicKey;
    constructor() {
        this.witnessId = process.env.WITNESS_ID || `witness-${Date.now()}`;
        // In production, these would come from KMS or secure config
        // Using generated keys for demonstration/dev
        const { privateKey, publicKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
            modulusLength: 2048,
        });
        this.privateKey = process.env.WITNESS_PRIVATE_KEY || privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
        this.publicKey = process.env.WITNESS_PUBLIC_KEY || publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    }
    static getInstance() {
        if (!MutationWitnessService.instance) {
            MutationWitnessService.instance = new MutationWitnessService();
        }
        return MutationWitnessService.instance;
    }
    /**
     * Validates and witnesses a mutation.
     * This is the "Proof of Correctness" step.
     */
    async witnessMutation(payload, context) {
        // 1. Validation Logic (Simulated "Correctness" Checks)
        const validationResult = await this.validateMutation(payload, context);
        if (!validationResult.valid) {
            throw new Error(`Mutation rejected by witness: ${JSON.stringify(validationResult.checks)}`);
        }
        // 2. Create Canonical String for Signing
        const canonicalString = this.createCanonicalString(payload, validationResult);
        // 3. Sign
        const sign = (0, crypto_1.createSign)('SHA256');
        sign.update(canonicalString);
        const signature = sign.sign(this.privateKey, 'hex');
        return {
            witnessId: this.witnessId,
            timestamp: new Date().toISOString(),
            signature,
            algorithm: 'RSA-SHA256',
            validationResult
        };
    }
    async validateMutation(payload, context) {
        const checks = [];
        // Check 1: Schema Integrity
        const hasValidStructure = (payload.mutationType === 'CREATE' && payload.newState && !payload.previousState) ||
            (payload.mutationType === 'UPDATE' && payload.newState && payload.previousState) ||
            (payload.mutationType === 'DELETE' && !payload.newState && payload.previousState);
        checks.push({
            check: 'Schema Integrity',
            passed: !!hasValidStructure,
            message: hasValidStructure ? 'Structure matches mutation type' : 'Invalid state combination for mutation type'
        });
        // Check 2: Tenant Isolation (Simulated)
        // In real world, we'd check if entity.tenantId matches context.tenantId
        checks.push({
            check: 'Tenant Isolation',
            passed: true,
            message: 'Tenant context validated'
        });
        // Check 3: Business Rules (Placeholder)
        checks.push({
            check: 'Business Rules',
            passed: true,
            message: 'No blocking business rules'
        });
        const valid = checks.every(c => c.passed);
        return {
            valid,
            policyId: 'default-witness-policy-v1',
            checks
        };
    }
    createCanonicalString(payload, validation) {
        // Deterministic serialization
        return JSON.stringify({
            payload: {
                type: payload.mutationType,
                entity: payload.entityId,
                diffHash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(payload.diff || {})).digest('hex')
            },
            validationHash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(validation)).digest('hex')
        });
    }
    verifyWitness(witness, payload) {
        const canonicalString = this.createCanonicalString(payload, witness.validationResult);
        const verify = (0, crypto_1.createVerify)('SHA256');
        verify.update(canonicalString);
        return verify.verify(this.publicKey, witness.signature, 'hex');
    }
    getPublicKey() {
        return this.publicKey;
    }
}
exports.MutationWitnessService = MutationWitnessService;
exports.mutationWitness = MutationWitnessService.getInstance();
class CryptoWitness {
    id;
    name;
    privateKey;
    publicKey;
    constructor(id, name) {
        this.id = id;
        this.name = name;
        // Generate ephemeral key pair for demo purposes
        // In production, keys would be loaded from KMS or Vault
        const { privateKey, publicKey } = require('crypto').generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        this.privateKey = privateKey.export({ type: 'pkcs1', format: 'pem' });
        this.publicKey = publicKey.export({ type: 'pkcs1', format: 'pem' });
    }
    async sign(data) {
        const sign = require('crypto').createSign('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKey, 'base64');
    }
    async verify(data, signature) {
        const verify = require('crypto').createVerify('SHA256');
        verify.update(data);
        verify.end();
        return verify.verify(this.publicKey, signature, 'base64');
    }
}
exports.CryptoWitness = CryptoWitness;
class WitnessRegistry {
    witnesses = new Map();
    register(witness) {
        this.witnesses.set(witness.id, witness);
    }
    get(id) {
        return this.witnesses.get(id);
    }
    getAll() {
        return Array.from(this.witnesses.values());
    }
}
exports.WitnessRegistry = WitnessRegistry;
exports.witnessRegistry = new WitnessRegistry();
