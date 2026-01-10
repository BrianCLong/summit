import { ContextSegment, Invariant } from '../types';

export interface CapsuleResult {
  segmentId: string;
  invariantId: string;
  valid: boolean;
  message?: string;
}

export class InvariantCapsule {
  constructor(private readonly segments: ContextSegment[]) {}

  validate(): CapsuleResult[] {
    return this.segments.flatMap((segment) =>
      segment.invariants.map((invariant) => {
        const valid = invariant.validate(segment.content);
        return {
          segmentId: segment.metadata.id,
          invariantId: invariant.id,
          valid,
          message: valid
            ? undefined
            : `Invariant ${invariant.id} failed for ${segment.metadata.id}`,
        };
      })
    );
  }

  isolateInvariantFailures(): ContextSegment[] {
    return this.segments.filter((segment) =>
      segment.invariants.some((invariant) => !invariant.validate(segment.content))
    );
  }
}
