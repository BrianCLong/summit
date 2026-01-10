// src/context/capsules/generator.ts
// Context capsule generation system for IC³

import { 
  ContextCapsule, 
  ContextContent, 
  ContextCapsuleGenerator, 
  CapsuleValidationResult,
  CapsuleMetadata,
  Invariant,
  TrustTier,
  AuthorityLevel
} from './types';
import { generateCapsuleId, signCapsule } from './crypto';
import { InvariantEmbedderImpl } from './embedder';

export class ContextCapsuleGeneratorImpl implements ContextCapsuleGenerator {
  private embedder: InvariantEmbedderImpl;
  
  constructor() {
    this.embedder = new InvariantEmbedderImpl();
  }
  
  async createCapsule(content: ContextContent, invariants: Invariant[]): Promise<ContextCapsule> {
    // Generate a unique ID for the capsule
    const id = generateCapsuleId();
    
    // Create default metadata if not provided
    const metadata: CapsuleMetadata = {
      source: 'system-generated',
      trustTier: 'high',
      policyDomain: 'default',
      verificationStatus: 'pending'
    };
    
    // Create the capsule without signature first
    const capsuleWithoutSig: Omit<ContextCapsule, 'signature'> = {
      id,
      content,
      invariants,
      metadata,
      timestamp: new Date(),
      version: '1.0.0'
    };
    
    // Generate the signature
    const signature = await signCapsule(capsuleWithoutSig);
    
    // Return the completed capsule
    const capsule: ContextCapsule = {
      ...capsuleWithoutSig,
      signature
    };
    
    return capsule;
  }
  
  async validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult> {
    // In a real implementation, this would delegate to the validator
    // For this example, we'll create a valid result
    return {
      isValid: true,
      violations: [],
      enforcementRecommendation: 'approve',
      validationTime: new Date()
    };
  }
  
  async updateCapsule(capsule: ContextCapsule, newContent: ContextContent): Promise<ContextCapsule> {
    // Create a new capsule with updated content but same invariants
    const updatedCapsuleWithoutSig: Omit<ContextCapsule, 'signature'> = {
      id: capsule.id,
      content: newContent,
      invariants: capsule.invariants,
      metadata: {
        ...capsule.metadata,
        verificationStatus: 'pending' // Reset verification status
      },
      timestamp: new Date(), // Update timestamp
      version: capsule.version
    };
    
    // Generate new signature
    const signature = await signCapsule(updatedCapsuleWithoutSig);
    
    return {
      ...updatedCapsuleWithoutSig,
      signature
    };
  }
  
  async mergeCapsules(capsules: ContextCapsule[]): Promise<ContextCapsule | null> {
    if (capsules.length === 0) {
      return null;
    }
    
    if (capsules.length === 1) {
      return capsules[0];
    }
    
    // For this implementation, we'll merge the content and combine invariants
    // This is a simplified approach - in reality, merging might be more complex
    
    // Combine content (for this example, we'll concatenate text content)
    let combinedContent: ContextContent = { type: 'text', data: '' };
    
    if (capsules[0].content.type === 'text') {
      let combinedText = '';
      
      for (const capsule of capsules) {
        if (capsule.content.type === 'text') {
          if (combinedText) combinedText += '\n---\n'; // Separator
          combinedText += capsule.content.data as string;
        }
      }
      
      combinedContent = {
        type: 'text',
        data: combinedText
      };
    } else {
      // For non-text content, we might need a different approach
      // or we might decide that merging is not supported for this content type
      console.warn("Merging non-text content capsules is not fully implemented");
      combinedContent = capsules[0].content;
    }
    
    // Combine all invariants
    const combinedInvariants: Invariant[] = [];
    const seenInvariantIds = new Set<string>();
    
    for (const capsule of capsules) {
      for (const invariant of capsule.invariants) {
        if (!seenInvariantIds.has(invariant.id)) {
          combinedInvariants.push(invariant);
          seenInvariantIds.add(invariant.id);
        }
      }
    }
    
    // Set the source in metadata to indicate this is merged content
    const mergedMetadata: CapsuleMetadata = {
      source: 'merged-capsules',
      trustTier: this.calculateMergedTrustTier(capsules.map(c => c.metadata.trustTier)),
      policyDomain: capsules[0].metadata.policyDomain, // Use first policy domain for now
      verificationStatus: 'pending',
      agentIdentity: capsules[0].metadata.agentIdentity
    };
    
    // Create the merged capsule
    const mergedCapsuleWithoutSig: Omit<ContextCapsule, 'signature'> = {
      id: generateCapsuleId(),
      content: combinedContent,
      invariants: combinedInvariants,
      metadata: mergedMetadata,
      timestamp: new Date(),
      version: '1.0.0'
    };
    
    // Generate signature
    const signature = await signCapsule(mergedCapsuleWithoutSig);
    
    return {
      ...mergedCapsuleWithoutSig,
      signature
    };
  }
  
  private calculateMergedTrustTier(trustTiers: TrustTier[]): TrustTier {
    // In a real system, you might have different logic for merging trust tiers
    // For this example, we'll return the lowest trust tier of all capsules
    const trustTierOrder: TrustTier[] = ['high', 'medium', 'low', 'untrusted'];
    
    let minTierIndex = trustTierOrder.length; // Start with highest index
    
    for (const tier of trustTiers) {
      const tierIndex = trustTierOrder.indexOf(tier);
      if (tierIndex !== -1 && tierIndex < minTierIndex) {
        minTierIndex = tierIndex;
      }
    }
    
    return trustTierOrder[minTierIndex] || 'untrusted';
  }
}