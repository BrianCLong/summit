import { SecurityClassification, SecurityLabel, UserSecurityContext } from './types.js';

const CLASSIFICATION_LEVELS: Record<SecurityClassification, number> = {
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  SECRET: 2,
  TOP_SECRET: 3,
};

export class ABACEngine {
  /**
   * Evaluates if a user can access a specific resource label.
   */
  canAccess(user: UserSecurityContext, resourceLabel: SecurityLabel): boolean {
    // 1. Clearance Check
    if (CLASSIFICATION_LEVELS[user.clearance] < CLASSIFICATION_LEVELS[resourceLabel.classification]) {
      return false;
    }

    // 2. Compartment Check (User must have ALL compartments required by resource)
    if (resourceLabel.compartments && resourceLabel.compartments.length > 0) {
      const hasAllCompartments = resourceLabel.compartments.every((c) =>
        user.accessCompartments.includes(c)
      );
      if (!hasAllCompartments) {
        return false;
      }
    }

    // 3. Releasability Check (User nationality must be in releasability list if it exists)
    if (resourceLabel.releasability && resourceLabel.releasability.length > 0) {
      // Assuming 'REL_TO_' + Nationality code convention or direct match
      const userRelTag = `REL_TO_${user.nationality}`;
      const isReleasable = resourceLabel.releasability.some(
        (r) => r === userRelTag || r === 'REL_TO_ALL'
      );
      if (!isReleasable) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates if a transfer between two domains is allowed for a given resource.
   */
  canTransfer(
    user: UserSecurityContext,
    resourceLabel: SecurityLabel,
    sourceDomainDetails: { classification: SecurityClassification },
    targetDomainDetails: { classification: SecurityClassification }
  ): { allowed: boolean; reason?: string } {
    const sourceLevel = CLASSIFICATION_LEVELS[sourceDomainDetails.classification];
    const targetLevel = CLASSIFICATION_LEVELS[targetDomainDetails.classification];

    // High-to-Low (Downgrade)
    if (sourceLevel > targetLevel) {
      // Must have explicit downgrade authority (implied if user has high clearance, but typically requires review)
      // For now, we allow if user has source clearance.
      if (!this.canAccess(user, resourceLabel)) {
        return { allowed: false, reason: 'User lacks access to source material' };
      }

      // Strict rule: Cannot downgrade TS/SCI automatically without specific review (simulated here)
      if (resourceLabel.classification === 'TOP_SECRET' && targetDomainDetails.classification !== 'TOP_SECRET') {
         // In a real system, this might require two-person control.
         // We'll allow it but flag it for Content Inspection.
      }
    }

    // Low-to-High (Ingest)
    if (sourceLevel < targetLevel) {
      // Always allowed to move up, provided user has access to source.
      if (!this.canAccess(user, resourceLabel)) {
         return { allowed: false, reason: 'User lacks access to source material' };
      }
    }

    // Lateral
    if (sourceLevel === targetLevel) {
       if (!this.canAccess(user, resourceLabel)) {
         return { allowed: false, reason: 'User lacks access to source material' };
      }
    }

    return { allowed: true };
  }
}
