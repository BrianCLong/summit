import { VoiceProvenance } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export class VoiceProvenanceLedger {
  private static instance: VoiceProvenanceLedger;

  private constructor() {}

  public static getInstance(): VoiceProvenanceLedger {
    if (!VoiceProvenanceLedger.instance) {
      VoiceProvenanceLedger.instance = new VoiceProvenanceLedger();
    }
    return VoiceProvenanceLedger.instance;
  }

  public async checkPolicy(tenantId: string, voiceId?: string, text?: string): Promise<{ allowed: boolean; reason?: string }> {
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

  public generateManifest(
    modelId: string,
    prompt: string,
    referenceAudio?: Buffer,
    policyResults: { allowed: boolean; reason?: string }[] = []
  ): VoiceProvenance {
    const timestamp = new Date().toISOString();
    const manifestId = uuidv4();
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

  private hash(input: string | Buffer): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
