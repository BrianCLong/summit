// src/context/capsules/index.ts
// Main entry point for Invariant-Carrying Context Capsules (IC³) system

import { 
  ContextCapsule, 
  ContextContent, 
  Invariant,
  InvariantSpec,
  AuthorityLevel,
  CapsuleValidationResult,
  EnforcementAction
} from './types';
import { ContextCapsuleGeneratorImpl } from './generator';
import { InvariantValidatorImpl } from './validator';
import { InvariantEmbedderImpl } from './embedder';

export class IC3System {
  private generator: ContextCapsuleGeneratorImpl;
  private validator: InvariantValidatorImpl;
  private embedder: InvariantEmbedderImpl;
  
  constructor() {
    this.generator = new ContextCapsuleGeneratorImpl();
    this.validator = new InvariantValidatorImpl();
    this.embedder = new InvariantEmbedderImpl();
  }
  
  /**
   * Creates a new context capsule with specified content and invariants
   */
  async createContextCapsule(content: ContextContent, invariantSpecs: InvariantSpec[], authority: AuthorityLevel = 'system'): Promise<ContextCapsule> {
    // Generate invariants from the specifications
    const invariants = await this.embedder.embedInvariants(content, invariantSpecs);
    
    // Create the capsule with the content and invariants
    const capsule = await this.generator.createCapsule(content, invariants);
    
    return capsule;
  }
  
  /**
   * Validates a context capsule against its embedded invariants
   */
  async validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult> {
    return await this.validator.validateCapsule(capsule);
  }
  
  /**
   * Validates a set of context capsules for invariant compliance
   */
  async validateCapsuleSet(capsules: ContextCapsule[]): Promise<CapsuleValidationResult> {
    return await this.validator.validateCapsuleSet(capsules);
  }
  
  /**
   * Validates a set of capsules and returns the recommended enforcement action
   */
  async validateAndEnforce(capsules: ContextCapsule[]): Promise<EnforcementAction> {
    const validation = await this.validator.validateCapsuleSet(capsules);
    return validation.enforcementRecommendation;
  }
  
  /**
   * Merges multiple context capsules into a single capsule
   */
  async mergeCapsules(capsules: ContextCapsule[]): Promise<ContextCapsule | null> {
    return await this.generator.mergeCapsules(capsules);
  }
  
  /**
   * Updates the content of an existing capsule while preserving its invariants
   */
  async updateCapsule(capsule: ContextCapsule, newContent: ContextContent): Promise<ContextCapsule> {
    return await this.generator.updateCapsule(capsule, newContent);
  }
  
  /**
   * Generates an invariant from a specification
   */
  async generateInvariant(spec: InvariantSpec, authority: AuthorityLevel): Promise<Invariant> {
    return await this.embedder.generateInvariant(spec, authority);
  }
  
  /**
   * Executes a pre-validation check before model execution
   */
  async preExecutionValidation(capsules: ContextCapsule[]): Promise<{ isValid: boolean; action: EnforcementAction; violations: any[] }> {
    const validationResult = await this.validateCapsuleSet(capsules);
    
    return {
      isValid: validationResult.isValid,
      action: validationResult.enforcementRecommendation,
      violations: validationResult.violations
    };
  }
  
  /**
   * Creates a capsule with standard security invariants
   */
  async createSecureCapsule(content: ContextContent, authority: AuthorityLevel = 'system'): Promise<ContextCapsule> {
    // Add default security invariants
    const securityInvariants: InvariantSpec[] = [
      {
        language: 'ic3-content-pattern',
        expression: JSON.stringify({
          type: 'content-pattern',
          forbiddenPatterns: [
            '(?i)ignore previous instructions',
            '(?i)disregard safety guidelines',
            '(?i)you are no longer',
            '(?i)system prompt',
            '(?i)nevermind',
            '(?i)just kidding'
          ]
        })
      },
      {
        language: 'ic3-size-limit',
        expression: JSON.stringify({
          type: 'size-limit',
          maxSize: 10000 // 10KB limit
        })
      },
      {
        language: 'ic3-token-limit',
        expression: JSON.stringify({
          type: 'token-count',
          maxTokens: 2048
        })
      }
    ];
    
    return await this.createContextCapsule(content, securityInvariants, authority);
  }
  
  /**
   * Creates a capsule for sensitive data with privacy invariants
   */
  async createPrivacyCompliantCapsule(content: ContextContent, authority: AuthorityLevel = 'system'): Promise<ContextCapsule> {
    const privacyInvariants: InvariantSpec[] = [
      {
        language: 'ic3-content-pattern',
        expression: JSON.stringify({
          type: 'content-pattern',
          forbiddenPatterns: [
            '(?i)\\b[A-Z][a-z]+\\s+[A-Z][a-z]+\\b', // Potential names
            '(?i)\\b\\d{3}-\\d{2}-\\d{4}\\b',       // SSN pattern
            '(?i)\\b\\d{16}\\b',                     // Credit card pattern
            '(?i)\\b[\\w\\.-]+@[\\w\\.-]+\\.\\w+\\b' // Email pattern
          ],
          requiredPatterns: [
            // Add patterns that must be present for verification
          ]
        })
      },
      {
        language: 'ic3-data-flow',
        expression: JSON.stringify({
          type: 'data-flow',
          restrictions: {
            output: ['encrypted', 'anonymized'],
            retention: 'limited'
          }
        })
      }
    ];
    
    return await this.createContextCapsule(content, privacyInvariants, authority);
  }
}

// Export the main class and types
export * from './types';
export * from './generator';
export * from './validator';
export * from './embedder';
export * from './crypto';
export * from './config';