import { ContextSegment, Invariant } from "../types";

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
    return this.segments.every((segment) =>
      this.invariants.every((invariant) => invariant.validate(segment.content))
    );
  }

  withAdditionalInvariant(invariant: Invariant): InvariantCapsule {
    return new InvariantCapsule(this.id, this.segments, [...this.invariants, invariant]);
  }
}
