"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceProvenanceLedger = void 0;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
class VoiceProvenanceLedger {
    static instance;
    constructor() { }
    static getInstance() {
        if (!VoiceProvenanceLedger.instance) {
            VoiceProvenanceLedger.instance = new VoiceProvenanceLedger();
        }
        return VoiceProvenanceLedger.instance;
    }
    async checkPolicy(tenantId, voiceId, text) {
        // Mock policy check
        // In production, this would query a policy engine or graph
        if (voiceId?.startsWith('banned_')) {
            return { allowed: false, reason: 'Voice ID is on the ban list' };
        }
        // Simulate checking text for prohibited content
        if (text?.includes('simulate_harmful_content')) {
            return { allowed: false, reason: 'Content flagged by safety policy' };
        }
        return { allowed: true };
    }
    generateManifest(modelId, prompt, referenceAudio, policyResults = []) {
        const timestamp = new Date().toISOString();
        const manifestId = (0, uuid_1.v4)();
        const modelHash = this.hash(modelId); // In reality, this would be a hash of weights/version
        const promptHash = this.hash(prompt);
        const referenceAudioHash = referenceAudio ? this.hash(referenceAudio) : undefined;
        // Convert simple policy results to provenance format
        const policyDecisions = policyResults.map(r => ({
            allowed: r.allowed,
            policy_id: 'mock-policy-v1',
            reason: r.reason
        }));
        // Sign the manifest (Mock signature)
        const signaturePayload = `${manifestId}:${modelHash}:${promptHash}:${timestamp}`;
        const signature = `signed_${this.hash(signaturePayload)}`;
        return {
            manifest_id: manifestId,
            model_id: modelId,
            model_hash: modelHash,
            prompt_hash: promptHash,
            reference_audio_hash: referenceAudioHash,
            timestamp,
            policy_decisions: policyDecisions,
            watermark_detected: false, // Default
            signature
        };
    }
    hash(input) {
        return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
    }
}
exports.VoiceProvenanceLedger = VoiceProvenanceLedger;
