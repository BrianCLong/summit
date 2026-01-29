
import crypto from 'crypto';
import { Claim, VerificationResult } from './types';

/**
 * Validation strategy interface for extensible claim verification.
 */
export interface ValidationStrategy {
  id: string;
  name: string;
  canValidate(claim: Claim): boolean;
  validate(claim: Claim, context: ValidationContext): Promise<VerificationResult>;
}

/**
 * Context provided to validation strategies.
 */
export interface ValidationContext {
  allClaims: Claim[];
  externalSources?: Map<string, unknown>;
}

/**
 * ClaimValidator - Automation Turn #5 Implementation
 *
 * Performs source-independent validation of claims using multiple strategies.
 * Validation is decoupled from source trust - a claim from a "trusted" source
 * still requires independent verification.
 */
export class ClaimValidator {
  private strategies: ValidationStrategy[] = [];

  constructor() {
    // Register default validation strategies
    this.registerStrategy(new CorroborationStrategy());
    this.registerStrategy(new TemporalConsistencyStrategy());
    this.registerStrategy(new SemanticPlausibilityStrategy());
  }

  /**
   * Register a custom validation strategy.
   */
  registerStrategy(strategy: ValidationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Validate a set of claims, updating their verification history.
   * Returns claims with updated confidence scores.
   */
  async validate(claims: Claim[]): Promise<Claim[]> {
    const context: ValidationContext = {
      allClaims: claims,
    };

    const validatedClaims: Claim[] = [];

    for (const claim of claims) {
      const validatedClaim = await this.validateClaim(claim, context);
      validatedClaims.push(validatedClaim);
    }

    return validatedClaims;
  }

  private async validateClaim(claim: Claim, context: ValidationContext): Promise<Claim> {
    const verificationResults: VerificationResult[] = [];

    for (const strategy of this.strategies) {
      if (strategy.canValidate(claim)) {
        const result = await strategy.validate(claim, context);
        verificationResults.push(result);
      }
    }

    // Calculate aggregated confidence adjustment
    const totalDelta = verificationResults.reduce(
      (sum, r) => sum + r.confidenceDelta,
      0
    );
    const avgDelta = verificationResults.length > 0
      ? totalDelta / verificationResults.length
      : 0;

    // Apply confidence adjustment (bounded between 0 and 1)
    const newConfidence = Math.max(0, Math.min(1, claim.confidence + avgDelta));

    return {
      ...claim,
      confidence: newConfidence,
      verificationHistory: [
        ...(claim.verificationHistory || []),
        ...verificationResults,
      ],
    };
  }
}

/**
 * CorroborationStrategy - Validates claims by checking if multiple sources agree.
 */
class CorroborationStrategy implements ValidationStrategy {
  id = 'corroboration';
  name = 'Multi-Source Corroboration';

  canValidate(claim: Claim): boolean {
    // Can validate any claim with subject-predicate-object
    return !!(claim.subject && claim.predicate && claim.object !== undefined);
  }

  async validate(claim: Claim, context: ValidationContext): Promise<VerificationResult> {
    const timestamp = new Date().toISOString();

    // Find other claims with same subject and predicate
    const corroboratingClaims = context.allClaims.filter(
      (c) =>
        c.id !== claim.id &&
        c.subject === claim.subject &&
        c.predicate === claim.predicate &&
        c.sourceId !== claim.sourceId // Must be from different source
    );

    if (corroboratingClaims.length === 0) {
      return {
        verifierId: this.id,
        timestamp,
        status: 'uncertain',
        confidenceDelta: 0,
        evidence: ['No corroborating sources found'],
      };
    }

    // Check if values match
    const matchingClaims = corroboratingClaims.filter((c) =>
      this.objectsMatch(c.object, claim.object)
    );

    const conflictingClaims = corroboratingClaims.filter(
      (c) => !this.objectsMatch(c.object, claim.object)
    );

    if (matchingClaims.length > 0 && conflictingClaims.length === 0) {
      return {
        verifierId: this.id,
        timestamp,
        status: 'confirmed',
        confidenceDelta: 0.1 * matchingClaims.length,
        evidence: matchingClaims.map((c) => `Corroborated by ${c.sourceId}`),
      };
    }

    if (conflictingClaims.length > matchingClaims.length) {
      return {
        verifierId: this.id,
        timestamp,
        status: 'refuted',
        confidenceDelta: -0.15 * conflictingClaims.length,
        evidence: conflictingClaims.map((c) => `Contradicted by ${c.sourceId}`),
      };
    }

    return {
      verifierId: this.id,
      timestamp,
      status: 'uncertain',
      confidenceDelta: 0.05 * (matchingClaims.length - conflictingClaims.length),
      evidence: [
        `${matchingClaims.length} supporting, ${conflictingClaims.length} conflicting`,
      ],
    };
  }

  private objectsMatch(a: unknown, b: unknown): boolean {
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  }
}

/**
 * TemporalConsistencyStrategy - Validates claims based on temporal validity.
 */
class TemporalConsistencyStrategy implements ValidationStrategy {
  id = 'temporal-consistency';
  name = 'Temporal Consistency Check';

  canValidate(claim: Claim): boolean {
    // Only validate claims with temporal bounds
    return !!(claim.validFrom || claim.validTo);
  }

  async validate(claim: Claim, context: ValidationContext): Promise<VerificationResult> {
    const timestamp = new Date().toISOString();
    const now = new Date();
    const issues: string[] = [];

    // Check if claim is temporally valid
    if (claim.validFrom) {
      const validFromDate = new Date(claim.validFrom);
      if (validFromDate > now) {
        issues.push('Claim validity starts in the future');
      }
    }

    if (claim.validTo) {
      const validToDate = new Date(claim.validTo);
      if (validToDate < now) {
        issues.push('Claim has expired');
      }
    }

    if (claim.validFrom && claim.validTo) {
      const from = new Date(claim.validFrom);
      const to = new Date(claim.validTo);
      if (from > to) {
        issues.push('Invalid temporal range: validFrom > validTo');
      }
    }

    // Check for temporal conflicts with other claims
    const overlappingClaims = context.allClaims.filter(
      (c) =>
        c.id !== claim.id &&
        c.subject === claim.subject &&
        c.predicate === claim.predicate &&
        this.temporalOverlap(claim, c) &&
        !this.objectsMatch(c.object, claim.object)
    );

    if (overlappingClaims.length > 0) {
      issues.push(
        `Temporal conflict with ${overlappingClaims.length} claim(s)`
      );
    }

    if (issues.length === 0) {
      return {
        verifierId: this.id,
        timestamp,
        status: 'confirmed',
        confidenceDelta: 0.05,
        evidence: ['Temporal consistency verified'],
      };
    }

    const severity = issues.some((i) => i.includes('Invalid temporal range'))
      ? 'refuted'
      : 'uncertain';

    return {
      verifierId: this.id,
      timestamp,
      status: severity,
      confidenceDelta: severity === 'refuted' ? -0.2 : -0.1,
      evidence: issues,
    };
  }

  private temporalOverlap(a: Claim, b: Claim): boolean {
    const aFrom = a.validFrom ? new Date(a.validFrom) : new Date(0);
    const aTo = a.validTo ? new Date(a.validTo) : new Date('2100-01-01');
    const bFrom = b.validFrom ? new Date(b.validFrom) : new Date(0);
    const bTo = b.validTo ? new Date(b.validTo) : new Date('2100-01-01');

    return aFrom <= bTo && bFrom <= aTo;
  }

  private objectsMatch(a: unknown, b: unknown): boolean {
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  }
}

/**
 * SemanticPlausibilityStrategy - Validates claims based on semantic rules.
 */
class SemanticPlausibilityStrategy implements ValidationStrategy {
  id = 'semantic-plausibility';
  name = 'Semantic Plausibility Check';

  private readonly plausibilityRules: Map<string, (obj: unknown) => boolean> =
    new Map([
      ['hasFollowerCount', (obj) => typeof obj === 'number' && obj >= 0 && obj < 1e9],
      ['incorporatedOn', (obj) => this.isValidDate(obj) && new Date(obj as string) <= new Date()],
      ['hasStatus', (obj) => ['active', 'dissolved', 'inactive'].includes(obj as string)],
      ['hasAccount', (obj) => typeof obj === 'object' && obj !== null && 'platform' in obj],
    ]);

  canValidate(claim: Claim): boolean {
    return this.plausibilityRules.has(claim.predicate);
  }

  async validate(claim: Claim, _context: ValidationContext): Promise<VerificationResult> {
    const timestamp = new Date().toISOString();
    const rule = this.plausibilityRules.get(claim.predicate);

    if (!rule) {
      return {
        verifierId: this.id,
        timestamp,
        status: 'uncertain',
        confidenceDelta: 0,
        evidence: ['No semantic rule available'],
      };
    }

    const isPlausible = rule(claim.object);

    return {
      verifierId: this.id,
      timestamp,
      status: isPlausible ? 'confirmed' : 'refuted',
      confidenceDelta: isPlausible ? 0.02 : -0.25,
      evidence: [
        isPlausible
          ? 'Value passes semantic plausibility check'
          : 'Value fails semantic plausibility check',
      ],
    };
  }

  private isValidDate(obj: unknown): boolean {
    if (typeof obj !== 'string') return false;
    const date = new Date(obj);
    return !isNaN(date.getTime());
  }
}
