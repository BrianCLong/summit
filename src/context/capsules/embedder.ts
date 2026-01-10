// src/context/capsules/embedder.ts
// Invariant embedding system for IC³

import { 
  Invariant, 
  InvariantSpec, 
  InvariantEmbedder, 
  InvariantCompatibilityResult, 
  InvariantConflict,
  AuthorityLevel,
  InvariantType,
  ContextContent
} from './types';
import { generateInvariantId, hashContent, signInvariant } from './crypto';

export class InvariantEmbedderImpl implements InvariantEmbedder {
  async embedInvariants(content: ContextContent, specs: InvariantSpec[]): Promise<Invariant[]> {
    const invariants: Invariant[] = [];
    
    for (const spec of specs) {
      // We'll use a default authority level for this example
      const invariant = await this.generateInvariant(spec, 'system');
      invariants.push(invariant);
    }
    
    return invariants;
  }
  
  async validateInvariantBinding(capsule: any): Promise<boolean> {
    // This would validate the binding between invariants and content
    // For this implementation, we'll assume validation happens in the validator
    return true;
  }
  
  async checkInvariantCompatibility(invariants: Invariant[]): Promise<InvariantCompatibilityResult> {
    const conflicts: InvariantConflict[] = [];
    const warnings: string[] = [];
    
    // Check for conflicts between invariants
    for (let i = 0; i < invariants.length; i++) {
      for (let j = i + 1; j < invariants.length; j++) {
        const invA = invariants[i];
        const invB = invariants[j];
        
        const conflict = this.detectConflict(invA, invB);
        if (conflict) {
          conflicts.push(conflict);
        }
        
        const warning = this.detectWarning(invA, invB);
        if (warning) {
          warnings.push(warning);
        }
      }
    }
    
    return {
      isCompatible: conflicts.length === 0,
      conflicts,
      warnings
    };
  }
  
  async generateInvariant(spec: InvariantSpec, authority: AuthorityLevel): Promise<Invariant> {
    const id = generateInvariantId();
    
    // Determine the type based on the specification
    let type: InvariantType = 'content-class'; // Default type
    
    // Try to infer the type from the spec
    if (spec.expression.includes('size-limit')) {
      type = 'context-size';
    } else if (spec.expression.includes('token-count')) {
      type = 'token-limit';
    } else if (spec.expression.includes('data-flow')) {
      type = 'data-flow';
    } else if (spec.expression.includes('reasoning-step')) {
      type = 'reasoning-step';
    } else if (spec.expression.includes('output-format')) {
      type = 'output-format';
    } else if (spec.expression.includes('content-class')) {
      type = 'content-class';
    } else if (spec.expression.includes('authority-scope')) {
      type = 'authority-scope';
    } else if (spec.expression.includes('temporal')) {
      type = 'temporal';
    } else if (spec.expression.includes('sensitive-data')) {
      type = 'sensitive-data';
    } else if (spec.expression.includes('source-verification')) {
      type = 'source-verification';
    } else if (spec.expression.includes('privacy-compliance')) {
      type = 'privacy-compliance';
    } else if (spec.expression.includes('content-provenance')) {
      type = 'content-provenance';
    }
    
    // For this example, we'll create a signature based on the content and spec
    // In a real implementation, the signature would be created when binding to actual content
    const signature = await hashContent(JSON.stringify({
      spec,
      authority,
      timestamp: Date.now()
    }));
    
    const invariant: Invariant = {
      id,
      type,
      specification: spec,
      signature,
      authority,
      createdAt: new Date(),
      active: true
    };
    
    return invariant;
  }
  
  private detectConflict(invA: Invariant, invB: Invariant): InvariantConflict | null {
    // Check for obvious conflicts between invariants
    try {
      // Parse the specifications to check for conflicts
      const specA = JSON.parse(invA.specification.expression);
      const specB = JSON.parse(invB.specification.expression);
      
      // Check for contradictory size limits
      if (invA.type === 'context-size' && invB.type === 'context-size') {
        if (specA.type === 'size-limit' && specB.type === 'size-limit') {
          // If one requires size < X and another requires size > Y where Y >= X, that's a conflict
          if (specA.maxSize && specB.minSize && specB.minSize > specA.maxSize) {
            return {
              invariantA: invA.id,
              invariantB: invB.id,
              conflictType: 'size-limit-contradiction',
              details: `Invariant ${invA.id} (max size ${specA.maxSize}) conflicts with ${invB.id} (min size ${specB.minSize})`
            };
          }
        }
      }
      
      // Check for contradictory token limits
      if (invA.type === 'token-limit' && invB.type === 'token-limit') {
        if (specA.type === 'token-count' && specB.type === 'token-count') {
          if (specA.maxTokens && specB.minTokens && specB.minTokens > specA.maxTokens) {
            return {
              invariantA: invA.id,
              invariantB: invB.id,
              conflictType: 'token-limit-contradiction',
              details: `Invariant ${invA.id} (max tokens ${specA.maxTokens}) conflicts with ${invB.id} (min tokens ${specB.minTokens})`
            };
          }
        }
      }
      
      // Check for contradictory content patterns
      if (invA.type === 'content-class' && invB.type === 'content-class') {
        if (specA.type === 'content-pattern' && specB.type === 'content-pattern') {
          // Check for forbidden patterns that conflict with required patterns
          if (specA.forbiddenPatterns && specB.requiredPatterns) {
            for (const forbidden of specA.forbiddenPatterns) {
              for (const required of specB.requiredPatterns) {
                if (forbidden === required) {
                  return {
                    invariantA: invA.id,
                    invariantB: invB.id,
                    conflictType: 'content-pattern-contradiction',
                    details: `Invariant ${invA.id} forbids pattern "${forbidden}" while ${invB.id} requires it`
                  };
                }
              }
            }
          }
        }
      }
      
      // Additional conflict checks could be added here
      
    } catch (e) {
      // If we can't parse the specifications, we can't detect conflicts
      console.error(`Error parsing invariant specifications for conflict detection: ${e.message}`);
    }
    
    return null;
  }
  
  private detectWarning(invA: Invariant, invB: Invariant): string | null {
    // Check for potential issues that are not outright conflicts
    try {
      const specA = JSON.parse(invA.specification.expression);
      const specB = JSON.parse(invB.specification.expression);
      
      // Check for redundant invariants
      if (invA.type === invB.type) {
        if (JSON.stringify(specA) === JSON.stringify(specB)) {
          return `Redundant invariants: ${invA.id} and ${invB.id} have identical specifications`;
        }
      }
      
      // Check for overlapping constraints that might be inefficient
      if (invA.type === 'context-size' && invB.type === 'context-size') {
        if (specA.type === 'size-limit' && specB.type === 'size-limit') {
          if (specA.maxSize && specB.maxSize && specA.maxSize > specB.maxSize) {
            return `Invariant ${invB.id} has stricter size limit (${specB.maxSize}) than ${invA.id} (${specA.maxSize}), making the looser constraint redundant`;
          }
        }
      }
      
    } catch (e) {
      // If we can't parse the specifications, we can't detect warnings
      console.error(`Error parsing invariant specifications for warning detection: ${e.message}`);
    }
    
    return null;
  }
}