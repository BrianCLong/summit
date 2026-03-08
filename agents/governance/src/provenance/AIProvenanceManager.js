"use strict";
/**
 * AI Provenance Manager
 *
 * Extends SLSA/cosign provenance for AI artifacts including models,
 * prompts, chains, and outputs with cryptographic attestations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProvenanceManager = exports.AIProvenanceManager = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const DEFAULT_CONFIG = {
    enabled: true,
    signProvenance: true,
    requireSlsa3: true,
    trustedBuilders: [
        'https://github.com/intelgraph/agent-builder',
        'https://github.com/anthropic/model-registry',
    ],
    trustedSigningKeys: [],
    maxProvenanceAge: 86400 * 30, // 30 days
    attestationTypes: ['safety', 'accuracy', 'bias', 'security', 'compliance'],
};
// ============================================================================
// AI Provenance Manager
// ============================================================================
class AIProvenanceManager {
    config;
    provenanceStore;
    keyPair;
    eventListeners;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.provenanceStore = new Map();
        this.keyPair = null;
        this.eventListeners = [];
        if (this.config.signProvenance) {
            this.initializeKeys();
        }
    }
    /**
     * Initialize signing keys
     */
    initializeKeys() {
        // In production, load from secure key store
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
        this.keyPair = {
            publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        };
    }
    /**
     * Create provenance for a model
     */
    async createModelProvenance(params) {
        return this.createProvenance({
            type: 'model',
            subject: {
                name: `${params.modelName}@${params.version}`,
                digest: { sha256: params.digest },
                annotations: { modelId: params.modelId },
            },
            buildDefinition: {
                buildType: 'https://summit.intelgraph.io/model-build/v1',
                externalParameters: {
                    modelId: params.modelId,
                },
                resolvedDependencies: params.dependencies,
            },
            builder: params.builder,
            attestations: params.attestations,
        });
    }
    /**
     * Create provenance for a prompt chain
     */
    async createChainProvenance(params) {
        const chainContent = JSON.stringify({
            chainId: params.chainId,
            steps: params.steps,
            version: params.version,
        });
        return this.createProvenance({
            type: 'chain',
            subject: {
                name: `chain:${params.chainName}@${params.version}`,
                digest: {
                    sha256: this.sha256(chainContent),
                },
                annotations: { chainId: params.chainId },
            },
            buildDefinition: {
                buildType: 'https://summit.intelgraph.io/chain-definition/v1',
                externalParameters: {
                    chainId: params.chainId,
                },
                resolvedDependencies: params.steps.map((step, i) => ({
                    uri: `llm://${step.llmProvider}`,
                    digest: { sha256: step.promptHash },
                    name: `step-${i}`,
                })),
            },
            builder: 'https://summit.intelgraph.io/chain-builder',
            metadata: {
                agentId: params.agentId,
                sessionId: params.sessionId,
            },
        });
    }
    /**
     * Create provenance for an AI output
     */
    async createOutputProvenance(params) {
        return this.createProvenance({
            type: 'output',
            subject: {
                name: `output:${params.sessionId}`,
                digest: {
                    sha256: this.sha256(params.output),
                },
            },
            buildDefinition: {
                buildType: 'https://summit.intelgraph.io/ai-output/v1',
                externalParameters: {
                    modelId: params.modelId,
                    promptVersion: params.promptHash,
                    chainId: params.chainId,
                    temperature: params.temperature,
                    maxTokens: params.maxTokens,
                },
                resolvedDependencies: [
                    {
                        uri: `model://${params.modelId}`,
                        digest: { sha256: params.modelId },
                        name: 'model',
                    },
                    {
                        uri: `prompt://${params.promptHash}`,
                        digest: { sha256: params.promptHash },
                        name: 'prompt',
                    },
                ],
            },
            builder: 'https://summit.intelgraph.io/inference-engine',
            metadata: {
                agentId: params.agentId,
                sessionId: params.sessionId,
            },
        });
    }
    /**
     * Create provenance for a decision/action
     */
    async createDecisionProvenance(params) {
        const decisionContent = JSON.stringify({
            action: params.action,
            reasoning: params.reasoning,
            confidence: params.confidence,
        });
        return this.createProvenance({
            type: 'decision',
            subject: {
                name: `decision:${params.decisionId}`,
                digest: {
                    sha256: this.sha256(decisionContent),
                },
                annotations: {
                    action: params.action,
                    confidence: String(params.confidence),
                },
            },
            buildDefinition: {
                buildType: 'https://summit.intelgraph.io/ai-decision/v1',
                externalParameters: {
                    decisionId: params.decisionId,
                },
                resolvedDependencies: params.outputProvenanceIds.map((id, i) => ({
                    uri: `provenance://${id}`,
                    digest: { sha256: id },
                    name: `input-${i}`,
                })),
            },
            builder: 'https://summit.intelgraph.io/decision-engine',
            metadata: {
                agentId: params.agentId,
                sessionId: params.sessionId,
            },
            byproducts: [
                {
                    name: 'reasoning',
                    digest: { sha256: this.sha256(params.reasoning) },
                    content: params.reasoning,
                },
            ],
        });
    }
    /**
     * Create base provenance record
     */
    async createProvenance(params) {
        const id = `PROV-${Date.now()}-${node_crypto_1.default.randomUUID().substring(0, 8)}`;
        const now = new Date();
        const provenance = {
            id,
            type: params.type,
            createdAt: now,
            slsaLevel: this.determineSlsaLevel(params.builder),
            subject: params.subject,
            buildDefinition: params.buildDefinition,
            runDetails: {
                builder: {
                    id: params.builder,
                    version: { version: '1.0.0' },
                },
                metadata: {
                    invocationId: id,
                    startedOn: now.toISOString(),
                    finishedOn: now.toISOString(),
                    agentId: params.metadata?.agentId,
                    sessionId: params.metadata?.sessionId,
                },
                byproducts: params.byproducts,
            },
            attestations: [],
        };
        // Add attestations
        if (params.attestations) {
            for (const att of params.attestations) {
                const attestation = await this.createAttestation(att, provenance);
                provenance.attestations.push(attestation);
            }
        }
        // Sign provenance if enabled
        if (this.config.signProvenance && this.keyPair) {
            provenance.cosignBundle = await this.signProvenance(provenance);
        }
        // Store provenance
        this.provenanceStore.set(id, provenance);
        // Emit event
        this.emitEvent({
            id: node_crypto_1.default.randomUUID(),
            timestamp: now,
            type: 'attestation_created',
            source: 'AIProvenanceManager',
            actor: 'system',
            action: `create_${params.type}_provenance`,
            resource: id,
            outcome: 'success',
            classification: 'UNCLASSIFIED',
            details: {
                type: params.type,
                slsaLevel: provenance.slsaLevel,
                attestationCount: provenance.attestations.length,
            },
            provenance: id,
        });
        return provenance;
    }
    /**
     * Create an attestation for provenance
     */
    async createAttestation(partial, provenance) {
        const attestation = {
            type: partial.type || 'compliance',
            attestedBy: partial.attestedBy || 'system',
            attestedAt: new Date(),
            predicateType: `https://summit.intelgraph.io/attestation/${partial.type}/v1`,
            predicate: partial.predicate || {},
            signature: '',
        };
        // Sign attestation
        if (this.keyPair) {
            const data = JSON.stringify({
                type: attestation.type,
                predicateType: attestation.predicateType,
                predicate: attestation.predicate,
                subjectDigest: provenance.subject.digest.sha256,
            });
            attestation.signature = this.sign(data);
        }
        return attestation;
    }
    /**
     * Add attestation to existing provenance
     */
    async addAttestation(provenanceId, attestation) {
        const provenance = this.provenanceStore.get(provenanceId);
        if (!provenance) {
            return null;
        }
        const fullAttestation = await this.createAttestation(attestation, provenance);
        provenance.attestations.push(fullAttestation);
        // Re-sign provenance
        if (this.config.signProvenance && this.keyPair) {
            provenance.cosignBundle = await this.signProvenance(provenance);
        }
        this.provenanceStore.set(provenanceId, provenance);
        return fullAttestation;
    }
    /**
     * Sign provenance with cosign-compatible bundle
     */
    async signProvenance(provenance) {
        const payload = JSON.stringify({
            _type: 'https://in-toto.io/Statement/v0.1',
            predicateType: 'https://slsa.dev/provenance/v1',
            subject: provenance.subject,
            predicate: {
                buildDefinition: provenance.buildDefinition,
                runDetails: provenance.runDetails,
            },
        });
        const payloadBase64 = Buffer.from(payload).toString('base64');
        const signature = this.sign(payload);
        const keyId = this.keyPair
            ? node_crypto_1.default.createHash('sha256').update(this.keyPair.publicKey).digest('hex').substring(0, 16)
            : 'unknown';
        return {
            payload: payloadBase64,
            payloadType: 'application/vnd.in-toto+json',
            signatures: [
                {
                    keyid: keyId,
                    sig: signature,
                },
            ],
            verificationMaterial: {
                publicKey: this.keyPair?.publicKey,
            },
        };
    }
    /**
     * Verify provenance
     */
    async verifyProvenance(provenanceId) {
        const provenance = this.provenanceStore.get(provenanceId);
        if (!provenance) {
            return {
                valid: false,
                slsaLevel: 'SLSA_0',
                checks: [{ name: 'existence', passed: false, reason: 'Provenance not found' }],
            };
        }
        const checks = [];
        // Check age
        const age = (Date.now() - provenance.createdAt.getTime()) / 1000;
        checks.push({
            name: 'age',
            passed: age <= this.config.maxProvenanceAge,
            reason: age <= this.config.maxProvenanceAge
                ? 'Within acceptable age'
                : `Too old: ${Math.round(age / 86400)} days`,
        });
        // Check builder trust
        const builderTrusted = this.config.trustedBuilders.some((b) => provenance.runDetails.builder.id.startsWith(b));
        checks.push({
            name: 'builder_trust',
            passed: builderTrusted,
            reason: builderTrusted ? 'Builder is trusted' : 'Builder not in trusted list',
        });
        // Check signature if present
        if (provenance.cosignBundle) {
            const sigValid = await this.verifySignature(provenance.cosignBundle);
            checks.push({
                name: 'signature',
                passed: sigValid,
                reason: sigValid ? 'Valid signature' : 'Invalid signature',
            });
        }
        else {
            checks.push({
                name: 'signature',
                passed: !this.config.signProvenance,
                reason: this.config.signProvenance ? 'Missing required signature' : 'Signature not required',
            });
        }
        // Check attestations
        const hasRequiredAttestations = this.config.attestationTypes.every((type) => provenance.attestations.some((a) => a.type === type));
        checks.push({
            name: 'attestations',
            passed: hasRequiredAttestations,
            reason: hasRequiredAttestations
                ? 'All required attestations present'
                : 'Missing required attestations',
        });
        // Verify attestation signatures
        for (const attestation of provenance.attestations) {
            if (attestation.signature) {
                const data = JSON.stringify({
                    type: attestation.type,
                    predicateType: attestation.predicateType,
                    predicate: attestation.predicate,
                    subjectDigest: provenance.subject.digest.sha256,
                });
                const valid = this.verifySignatureString(attestation.signature, data);
                checks.push({
                    name: `attestation_sig_${attestation.type}`,
                    passed: valid,
                    reason: valid ? 'Valid attestation signature' : 'Invalid attestation signature',
                });
            }
        }
        const allPassed = checks.every((c) => c.passed);
        const meetsSlsa3 = allPassed && builderTrusted && provenance.cosignBundle;
        return {
            valid: allPassed,
            slsaLevel: meetsSlsa3 ? provenance.slsaLevel : 'SLSA_0',
            checks,
        };
    }
    /**
     * Verify cosign bundle signature
     */
    async verifySignature(bundle) {
        if (!bundle.verificationMaterial?.publicKey) {
            return false;
        }
        try {
            const payload = Buffer.from(bundle.payload, 'base64').toString('utf8');
            for (const sig of bundle.signatures) {
                const publicKey = node_crypto_1.default.createPublicKey(bundle.verificationMaterial.publicKey);
                const isValid = node_crypto_1.default.verify(null, Buffer.from(payload), publicKey, Buffer.from(sig.sig, 'base64'));
                if (isValid) {
                    return true;
                }
            }
        }
        catch (error) {
            console.error('Signature verification failed:', error);
        }
        return false;
    }
    /**
     * Verify signature string
     */
    verifySignatureString(signature, data) {
        if (!this.keyPair) {
            return false;
        }
        try {
            const publicKey = node_crypto_1.default.createPublicKey(this.keyPair.publicKey);
            return node_crypto_1.default.verify(null, Buffer.from(data), publicKey, Buffer.from(signature, 'base64'));
        }
        catch {
            return false;
        }
    }
    /**
     * Determine SLSA level based on builder
     */
    determineSlsaLevel(builder) {
        if (this.config.trustedBuilders.some((b) => builder.startsWith(b))) {
            return 'SLSA_3';
        }
        if (builder.includes('github.com')) {
            return 'SLSA_2';
        }
        return 'SLSA_1';
    }
    /**
     * Sign data with private key
     */
    sign(data) {
        if (!this.keyPair) {
            return '';
        }
        const privateKey = node_crypto_1.default.createPrivateKey(this.keyPair.privateKey);
        const signature = node_crypto_1.default.sign(null, Buffer.from(data), privateKey);
        return signature.toString('base64');
    }
    /**
     * Calculate SHA256 hash
     */
    sha256(data) {
        return node_crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    /**
     * Get provenance by ID
     */
    getProvenance(id) {
        return this.provenanceStore.get(id) || null;
    }
    /**
     * Get provenance chain for an output
     */
    async getProvenanceChain(provenanceId) {
        const chain = [];
        const visited = new Set();
        const traverse = (id) => {
            if (visited.has(id)) {
                return;
            }
            visited.add(id);
            const prov = this.provenanceStore.get(id);
            if (!prov) {
                return;
            }
            chain.push(prov);
            // Follow dependencies
            for (const dep of prov.buildDefinition.resolvedDependencies) {
                if (dep.uri.startsWith('provenance://')) {
                    const depId = dep.uri.replace('provenance://', '');
                    traverse(depId);
                }
            }
        };
        traverse(provenanceId);
        return chain;
    }
    /**
     * Export provenance for external verification
     */
    exportProvenance(provenanceId) {
        const prov = this.provenanceStore.get(provenanceId);
        if (!prov) {
            return null;
        }
        return JSON.stringify({
            _type: 'https://in-toto.io/Statement/v0.1',
            predicateType: 'https://slsa.dev/provenance/v1',
            subject: prov.subject,
            predicate: {
                buildDefinition: prov.buildDefinition,
                runDetails: prov.runDetails,
            },
            attestations: prov.attestations,
            dsseEnvelope: prov.cosignBundle,
        }, null, 2);
    }
    /**
     * Add event listener
     */
    onEvent(listener) {
        this.eventListeners.push(listener);
    }
    /**
     * Emit event
     */
    emitEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Event listener error:', error);
            }
        }
    }
}
exports.AIProvenanceManager = AIProvenanceManager;
// ============================================================================
// Singleton Export
// ============================================================================
exports.aiProvenanceManager = new AIProvenanceManager();
