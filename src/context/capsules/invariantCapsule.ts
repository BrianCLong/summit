import { ContextSegment, ContextValidationResult, Invariant, InvariantViolation } from "../types";

/**
 * InvariantCapsule
 *
 * A logical capsule over one or more context segments and associated
 * invariants. Capsules travel with invariants to enforce them at
 * assembly and execution time.
 */
export class InvariantCapsule {
  constructor(
    public readonly id: string,
    public readonly segments: ContextSegment[],
    public readonly invariants: Invariant[]
  ) {}

  validate(): boolean {
    return this.validateWithReport().isValid;
  }

  validateWithReport(): ContextValidationResult {
    const violations: InvariantViolation[] = [];
    this.segments.forEach((segment) => {
      this.invariants.forEach((invariant) => {
        if (!invariant.validate(segment.content)) {
          violations.push({
            segmentId: segment.metadata.id,
            invariantId: invariant.id,
            description: invariant.description,
          });
        }
      });
    });
    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  withAdditionalInvariant(invariant: Invariant): InvariantCapsule {
    return new InvariantCapsule(this.id, this.segments, [...this.invariants, invariant]);
  }
}
