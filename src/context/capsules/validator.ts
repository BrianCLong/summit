// src/context/capsules/validator.ts
// Invariant validation system for IC³

import { 
  ContextCapsule, 
  InvariantValidator, 
  CapsuleValidationResult, 
  ConstraintViolation, 
  EnforcementAction,
  Invariant,
  InvariantSpec
} from './types';
import { verifyCapsuleSignature, verifyInvariantSignature } from './crypto';

export class InvariantValidatorImpl implements InvariantValidator {
  async validateCapsule(capsule: ContextCapsule): Promise<CapsuleValidationResult> {
    const violations: ConstraintViolation[] = [];
    
    // 1. Verify cryptographic signature of the capsule
    const isCapsuleSignatureValid = await verifyCapsuleSignature(capsule);
    if (!isCapsuleSignatureValid) {
      violations.push({
        invariantId: 'capsule-integrity',
        capsuleId: capsule.id,
        type: 'integrity',
        details: 'Capsule signature validation failed',
        severity: 'critical'
      });
    }
    
    // 2. Validate each invariant's signature against content
    for (const invariant of capsule.invariants) {
      const isInvariantValid = await verifyInvariantSignature(
        JSON.stringify(capsule.content), 
        invariant
      );
      
      if (!isInvariantValid) {
        violations.push({
          invariantId: invariant.id,
          capsuleId: capsule.id,
          type: 'integrity',
          details: `Invariant ${invariant.id} signature validation failed`,
          severity: 'critical'
        });
      } else {
        // 3. If signature is valid, validate the invariant specification
        const invariantViolations = await this.validateInvariant(capsule, invariant);
        violations.push(...invariantViolations);
      }
    }
    
    // 4. Check for conflicts between invariants
    const conflictViolations = await this.checkInvariantConflicts(capsule.invariants);
    violations.push(...conflictViolations);
    
    // 5. Determine enforcement recommendation based on violations
    const enforcementAction = this.determineEnforcementAction(violations);
    
    return {
      isValid: violations.length === 0,
      violations,
      enforcementRecommendation: enforcementAction,
      validationTime: new Date()
    };
  }
  
  async validateCapsuleSet(capsules: ContextCapsule[]): Promise<CapsuleValidationResult> {
    const allViolations: ConstraintViolation[] = [];
    
    for (const capsule of capsules) {
      const result = await this.validateCapsule(capsule);
      allViolations.push(...result.violations);
    }
    
    const enforcementAction = this.determineEnforcementAction(allViolations);
    
    return {
      isValid: allViolations.length === 0,
      violations: allViolations,
      enforcementRecommendation: enforcementAction,
      validationTime: new Date()
    };
  }
  
  async checkTransitiveConstraints(capsules: ContextCapsule[]): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];
    
    // This is a simplified implementation
    // In a full implementation, we would check for constraints that propagate across capsules
    for (let i = 0; i < capsules.length; i++) {
      for (let j = i + 1; j < capsules.length; j++) {
        const capsuleA = capsules[i];
        const capsuleB = capsules[j];
        
        // Check if capsuleA's invariants conflict with capsuleB's content
        for (const invariantA of capsuleA.invariants) {
          // Example: check if capsuleB's content violates invariantA
          if (await this.contentViolatesInvariant(capsuleB.content, invariantA)) {
            violations.push({
              invariantId: invariantA.id,
              capsuleId: capsuleB.id,
              type: 'conflict',
              details: `Capsule ${capsuleB.id} content violates invariant ${invariantA.id} from capsule ${capsuleA.id}`,
              severity: 'high'
            });
          }
        }
      }
    }
    
    return violations;
  }
  
  async enforceViolation(capsule: ContextCapsule, violation: ConstraintViolation): Promise<EnforcementAction> {
    // In a real system, this would implement the enforcement logic
    // For now, we'll return an appropriate action based on severity
    switch (violation.severity) {
      case 'critical':
        return 'reject';
      case 'high':
        return 'quarantine';
      case 'medium':
        return 'audit-only';
      case 'low':
        return 'approve';
      default:
        return 'approve';
    }
  }
  
  private async validateInvariant(capsule: ContextCapsule, invariant: Invariant): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];
    
    try {
      // Parse the invariant specification
      const isValidSyntax = this.validateInvariantSyntax(invariant.specification);
      if (!isValidSyntax) {
        violations.push({
          invariantId: invariant.id,
          capsuleId: capsule.id,
          type: 'syntax',
          details: `Invariant ${invariant.id} has invalid syntax: ${invariant.specification.expression}`,
          severity: 'high'
        });
        return violations;
      }
      
      // Execute the invariant validation against the capsule content
      const isSatisfied = await this.executeInvariant(capsule.content, invariant.specification);
      if (!isSatisfied) {
        violations.push({
          invariantId: invariant.id,
          capsuleId: capsule.id,
          type: 'semantic',
          details: `Invariant ${invariant.id} not satisfied by capsule content`,
          severity: 'high'
        });
      }
    } catch (error) {
      violations.push({
        invariantId: invariant.id,
        capsuleId: capsule.id,
        type: 'semantic',
        details: `Error validating invariant ${invariant.id}: ${error.message}`,
        severity: 'high'
      });
    }
    
    return violations;
  }
  
  private validateInvariantSyntax(spec: InvariantSpec): boolean {
    // This is a simplified syntax validator
    // In a full implementation, we would have a formal grammar for the invariant language
    if (!spec.language || !spec.expression) {
      return false;
    }
    
    // Basic validation - expression should be non-empty
    if (!spec.expression.trim()) {
      return false;
    }
    
    // For now, we'll accept all expressions as syntactically valid
    // In a real implementation, this would validate against the formal grammar
    return true;
  }
  
  private async executeInvariant(content: any, spec: InvariantSpec): Promise<boolean> {
    // This is a simplified implementation of invariant execution
    // In a full implementation, we would have a formal language interpreter
    
    // Example implementations for different invariant types:
    switch (spec.language) {
      case 'ic3-text-filter':
        return this.executeTextFilter(content, spec);
      case 'ic3-data-type':
        return this.executeDataTypeConstraint(content, spec);
      case 'ic3-size-limit':
        return this.executeSizeLimitConstraint(content, spec);
      case 'ic3-token-limit':
        return this.executeTokenLimitConstraint(content, spec);
      case 'ic3-content-pattern':
        return this.executeContentPatternConstraint(content, spec);
      default:
        // For unknown languages, we'll assume the invariant is satisfied
        // In a real implementation, this would be an error
        console.warn(`Unknown invariant language: ${spec.language}`);
        return true;
    }
  }
  
  private executeTextFilter(content: any, spec: InvariantSpec): boolean {
    // Example: spec.expression contains a regex pattern to match against text content
    if (content.type !== 'text') {
      return true; // Non-text content passes by default
    }
    
    const text = content.data as string;
    try {
      // Parse the spec.expression to extract the pattern
      // For this example, assume it's a simple JSON object with a pattern
      const patternSpec = JSON.parse(spec.expression);
      if (patternSpec.type === 'forbidden-words') {
        for (const word of patternSpec.words) {
          if (text.toLowerCase().includes(word.toLowerCase())) {
            return false; // Found forbidden word
          }
        }
        return true;
      } else if (patternSpec.type === 'required-patterns') {
        for (const pattern of patternSpec.patterns) {
          const regex = new RegExp(pattern, 'i');
          if (!regex.test(text)) {
            return false; // Missing required pattern
          }
        }
        return true;
      }
    } catch (e) {
      console.error(`Error executing text filter: ${e.message}`);
      return true; // Fail open
    }
    
    return true;
  }
  
  private executeDataTypeConstraint(content: any, spec: InvariantSpec): boolean {
    try {
      const constraint = JSON.parse(spec.expression);
      
      if (constraint.type === 'data-type') {
        // Check that content matches the expected type
        if (constraint.allowedTypes && !constraint.allowedTypes.includes(content.type)) {
          return false;
        }
        
        // Additional type-specific checks could go here
        return true;
      }
    } catch (e) {
      console.error(`Error executing data type constraint: ${e.message}`);
      return true; // Fail open
    }
    
    return true;
  }
  
  private executeSizeLimitConstraint(content: any, spec: InvariantSpec): boolean {
    try {
      const constraint = JSON.parse(spec.expression);
      
      if (constraint.type === 'size-limit') {
        let size = 0;
        
        if (typeof content.data === 'string') {
          size = content.data.length;
        } else if (typeof content.data === 'object') {
          size = JSON.stringify(content.data).length;
        } else if (content.data instanceof Uint8Array) {
          size = content.data.length;
        }
        
        if (size > constraint.maxSize) {
          return false;
        }
        
        return true;
      }
    } catch (e) {
      console.error(`Error executing size limit constraint: ${e.message}`);
      return true; // Fail open
    }
    
    return true;
  }
  
  private executeTokenLimitConstraint(content: any, spec: InvariantSpec): boolean {
    try {
      const constraint = JSON.parse(spec.expression);
      
      if (constraint.type === 'token-count') {
        // Simple token counting (in reality, you'd use a proper tokenizer)
        let tokenCount = 0;
        if (typeof content.data === 'string') {
          // Rough token estimation (1 token ≈ 4 characters)
          tokenCount = Math.ceil(content.data.length / 4);
        }
        
        if (tokenCount > constraint.maxTokens) {
          return false;
        }
        
        return true;
      }
    } catch (e) {
      console.error(`Error executing token limit constraint: ${e.message}`);
      return true; // Fail open
    }
    
    return true;
  }
  
  private executeContentPatternConstraint(content: any, spec: InvariantSpec): boolean {
    try {
      const constraint = JSON.parse(spec.expression);
      
      if (constraint.type === 'content-pattern') {
        if (content.type !== 'text') {
          return true; // Only applies to text content
        }
        
        const text = content.data as string;
        
        if (constraint.forbiddenPatterns) {
          for (const pattern of constraint.forbiddenPatterns) {
            const regex = new RegExp(pattern, 'gi');
            if (regex.test(text)) {
              return false; // Found forbidden pattern
            }
          }
        }
        
        if (constraint.requiredPatterns) {
          for (const pattern of constraint.requiredPatterns) {
            const regex = new RegExp(pattern, 'gi');
            if (!regex.test(text)) {
              return false; // Missing required pattern
            }
          }
        }
        
        return true;
      }
    } catch (e) {
      console.error(`Error executing content pattern constraint: ${e.message}`);
      return true; // Fail open
    }
    
    return true;
  }
  
  private async checkInvariantConflicts(invariants: Invariant[]): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];
    
    // Check for obvious conflicts between invariants
    for (let i = 0; i < invariants.length; i++) {
      for (let j = i + 1; j < invariants.length; j++) {
        const invA = invariants[i];
        const invB = invariants[j];
        
        // Check for contradictory size constraints
        if (invA.type === 'context-size' && invB.type === 'context-size') {
          try {
            const specA = JSON.parse(invA.specification.expression);
            const specB = JSON.parse(invB.specification.expression);
            
            if (specA.type === 'size-limit' && specB.type === 'size-limit') {
              // If one requires size < X and another requires size > Y where Y >= X, that's a conflict
              if (specA.maxSize && specB.minSize && specB.minSize > specA.maxSize) {
                violations.push({
                  invariantId: `${invA.id},${invB.id}`,
                  capsuleId: 'multiple', // Indicates conflict between multiple invariants
                  type: 'conflict',
                  details: `Invariants ${invA.id} and ${invB.id} conflict: max size ${specA.maxSize} vs min size ${specB.minSize}`,
                  severity: 'high'
                });
              }
            }
          } catch (e) {
            // If we can't parse the specification, skip the conflict check
          }
        }
        
        // Similar checks could be added for other conflict types
      }
    }
    
    return violations;
  }
  
  private async contentViolatesInvariant(content: any, invariant: Invariant): Promise<boolean> {
    // Check if the given content violates the specified invariant
    try {
      // For this example, we'll use the same execution logic
      return !(await this.executeInvariant(content, invariant.specification));
    } catch (e) {
      // If there's an error evaluating the invariant, assume it's not violated
      console.error(`Error evaluating invariant: ${e.message}`);
      return false;
    }
  }
  
  private determineEnforcementAction(violations: ConstraintViolation[]): EnforcementAction {
    if (violations.length === 0) {
      return 'approve';
    }
    
    // Determine the highest severity violation
    const hasCritical = violations.some(v => v.severity === 'critical');
    const hasHigh = violations.some(v => v.severity === 'high');
    const hasMedium = violations.some(v => v.severity === 'medium');
    
    if (hasCritical) {
      return 'reject';
    } else if (hasHigh) {
      return 'quarantine';
    } else if (hasMedium) {
      return 'audit-only';
    } else {
      return 'approve'; // Low severity violations may be acceptable
    }
  }
}