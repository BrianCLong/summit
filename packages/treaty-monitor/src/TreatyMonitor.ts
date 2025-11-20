import {
  Treaty,
  TreatyStatus,
  TreatyCategory,
  ComplianceRecord,
  NegotiationProgress,
  Violation,
  Party,
  Amendment,
  Dispute
} from './types.js';

/**
 * TreatyMonitor
 *
 * Comprehensive monitoring and analysis of international treaties,
 * agreements, compliance, and implementation
 */
export class TreatyMonitor {
  private treaties: Map<string, Treaty> = new Map();
  private treatiesByCategory: Map<TreatyCategory, Set<string>> = new Map();
  private treatiesByParty: Map<string, Set<string>> = new Map();
  private treatiesByStatus: Map<TreatyStatus, Set<string>> = new Map();
  private negotiationProgress: Map<string, NegotiationProgress[]> = new Map();

  /**
   * Register a treaty for monitoring
   */
  registerTreaty(treaty: Treaty): void {
    this.treaties.set(treaty.id, treaty);

    // Index by categories
    for (const category of treaty.category) {
      if (!this.treatiesByCategory.has(category)) {
        this.treatiesByCategory.set(category, new Set());
      }
      this.treatiesByCategory.get(category)!.add(treaty.id);
    }

    // Index by parties
    for (const party of treaty.parties) {
      const partyKey = party.country || party.organization || '';
      if (!this.treatiesByParty.has(partyKey)) {
        this.treatiesByParty.set(partyKey, new Set());
      }
      this.treatiesByParty.get(partyKey)!.add(treaty.id);
    }

    // Index by status
    if (!this.treatiesByStatus.has(treaty.status)) {
      this.treatiesByStatus.set(treaty.status, new Set());
    }
    this.treatiesByStatus.get(treaty.status)!.add(treaty.id);
  }

  /**
   * Get treaty by ID
   */
  getTreaty(id: string): Treaty | undefined {
    return this.treaties.get(id);
  }

  /**
   * Get treaties by category
   */
  getTreatiesByCategory(category: TreatyCategory): Treaty[] {
    const treatyIds = this.treatiesByCategory.get(category) || new Set();
    return Array.from(treatyIds)
      .map(id => this.treaties.get(id))
      .filter((t): t is Treaty => t !== undefined);
  }

  /**
   * Get treaties involving a specific party
   */
  getTreatiesByParty(party: string): Treaty[] {
    const treatyIds = this.treatiesByParty.get(party) || new Set();
    return Array.from(treatyIds)
      .map(id => this.treaties.get(id))
      .filter((t): t is Treaty => t !== undefined);
  }

  /**
   * Get bilateral treaties between two parties
   */
  getBilateralTreaties(party1: string, party2: string): Treaty[] {
    const treaties1 = this.treatiesByParty.get(party1) || new Set();
    const treaties2 = this.treatiesByParty.get(party2) || new Set();

    const bilateralIds = Array.from(treaties1).filter(id => treaties2.has(id));
    return bilateralIds
      .map(id => this.treaties.get(id))
      .filter((t): t is Treaty => t !== undefined)
      .filter(t => t.parties.length === 2);
  }

  /**
   * Track negotiation progress
   */
  trackNegotiationProgress(progress: NegotiationProgress): void {
    if (!this.negotiationProgress.has(progress.treatyId)) {
      this.negotiationProgress.set(progress.treatyId, []);
    }
    this.negotiationProgress.get(progress.treatyId)!.push(progress);

    // Update treaty status if needed
    const treaty = this.treaties.get(progress.treatyId);
    if (treaty && treaty.status === TreatyStatus.UNDER_NEGOTIATION) {
      if (progress.overallProgress >= 100) {
        this.updateTreatyStatus(progress.treatyId, TreatyStatus.NEGOTIATION_COMPLETED);
      }
    }
  }

  /**
   * Update treaty status
   */
  updateTreatyStatus(treatyId: string, newStatus: TreatyStatus): void {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) return;

    // Remove from old status index
    const oldStatusSet = this.treatiesByStatus.get(treaty.status);
    if (oldStatusSet) {
      oldStatusSet.delete(treatyId);
    }

    // Update status
    treaty.status = newStatus;
    treaty.updatedAt = new Date();

    // Add to new status index
    if (!this.treatiesByStatus.has(newStatus)) {
      this.treatiesByStatus.set(newStatus, new Set());
    }
    this.treatiesByStatus.get(newStatus)!.add(treatyId);
  }

  /**
   * Record treaty ratification
   */
  recordRatification(treatyId: string, party: Party): void {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) return;

    // Add to parties
    treaty.parties.push(party);

    // Update indexes
    const partyKey = party.country || party.organization || '';
    if (!this.treatiesByParty.has(partyKey)) {
      this.treatiesByParty.set(partyKey, new Set());
    }
    this.treatiesByParty.get(partyKey)!.add(treatyId);

    // Check if treaty should enter into force
    this.checkEntryIntoForce(treatyId);
  }

  /**
   * Check if treaty should enter into force based on ratifications
   */
  private checkEntryIntoForce(treatyId: string): void {
    const treaty = this.treaties.get(treatyId);
    if (!treaty || treaty.status === TreatyStatus.IN_FORCE) return;

    // This is a simplified check - real logic would be more complex
    // based on specific entry-into-force provisions
    const activeParties = treaty.parties.filter(p => p.status === 'ACTIVE');

    if (activeParties.length >= treaty.signatories.length * 0.5) {
      this.updateTreatyStatus(treatyId, TreatyStatus.IN_FORCE);
      treaty.entryIntoForceDate = new Date();
    }
  }

  /**
   * Monitor compliance for a party
   */
  assessCompliance(treatyId: string, party: string): ComplianceRecord | undefined {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) return undefined;

    // Find latest compliance record
    const complianceRecords = treaty.complianceRecords.filter(r => r.party === party);
    if (complianceRecords.length === 0) return undefined;

    return complianceRecords.sort((a, b) =>
      b.assessmentDate.getTime() - a.assessmentDate.getTime()
    )[0];
  }

  /**
   * Get all compliance violations
   */
  getViolations(treatyId?: string, party?: string): Violation[] {
    let treaties: Treaty[];

    if (treatyId) {
      const treaty = this.treaties.get(treatyId);
      treaties = treaty ? [treaty] : [];
    } else {
      treaties = Array.from(this.treaties.values());
    }

    const violations: Violation[] = [];

    for (const treaty of treaties) {
      for (const record of treaty.complianceRecords) {
        if (!party || record.party === party) {
          if (record.violations) {
            violations.push(...record.violations);
          }
        }
      }
    }

    return violations.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get treaties expiring soon
   */
  getExpiringSoon(daysAhead: number = 365): Treaty[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.treaties.values())
      .filter(t =>
        t.expiryDate &&
        t.expiryDate <= cutoffDate &&
        t.expiryDate > new Date() &&
        t.status === TreatyStatus.IN_FORCE
      )
      .sort((a, b) => {
        if (!a.expiryDate || !b.expiryDate) return 0;
        return a.expiryDate.getTime() - b.expiryDate.getTime();
      });
  }

  /**
   * Get treaties pending ratification for a party
   */
  getPendingRatifications(party: string): Treaty[] {
    return Array.from(this.treaties.values()).filter(treaty => {
      const isSigner = treaty.signatories.some(s =>
        (s.country === party || s.organization === party) && s.pending
      );
      const isParty = treaty.parties.some(p =>
        p.country === party || p.organization === party
      );

      return isSigner && !isParty;
    });
  }

  /**
   * Analyze treaty implementation status
   */
  analyzeTreatyImplementation(treatyId: string): {
    overallProgress: number;
    partiesInCompliance: number;
    partiesInViolation: number;
    criticalIssues: string[];
    recommendations: string[];
  } {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) {
      return {
        overallProgress: 0,
        partiesInCompliance: 0,
        partiesInViolation: 0,
        criticalIssues: [],
        recommendations: []
      };
    }

    const latestRecords = new Map<string, ComplianceRecord>();
    for (const record of treaty.complianceRecords) {
      const existing = latestRecords.get(record.party);
      if (!existing || existing.assessmentDate < record.assessmentDate) {
        latestRecords.set(record.party, record);
      }
    }

    let totalCompliance = 0;
    let partiesInCompliance = 0;
    let partiesInViolation = 0;
    const criticalIssues: string[] = [];

    for (const record of latestRecords.values()) {
      totalCompliance += record.overallCompliance;

      if (record.overallCompliance >= 80) {
        partiesInCompliance++;
      } else if (record.violations && record.violations.length > 0) {
        partiesInViolation++;

        for (const violation of record.violations) {
          if (violation.severity === 'SERIOUS' || violation.severity === 'GRAVE') {
            criticalIssues.push(`${record.party}: ${violation.description}`);
          }
        }
      }
    }

    const overallProgress = latestRecords.size > 0
      ? totalCompliance / latestRecords.size
      : 0;

    const recommendations: string[] = [];
    if (partiesInViolation > partiesInCompliance) {
      recommendations.push('Consider strengthening monitoring mechanisms');
      recommendations.push('Increase technical assistance to non-compliant parties');
    }
    if (criticalIssues.length > 0) {
      recommendations.push('Convene emergency session to address critical violations');
    }

    return {
      overallProgress,
      partiesInCompliance,
      partiesInViolation,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Get treaty network analysis
   */
  analyzeTreatyNetwork(party: string): {
    totalTreaties: number;
    treatiesByCategory: Record<string, number>;
    treatiesByStatus: Record<string, number>;
    bilateralPartners: { partner: string; count: number }[];
    complianceRate: number;
    pendingObligations: number;
  } {
    const treaties = this.getTreatiesByParty(party);

    const treatiesByCategory: Record<string, number> = {};
    const treatiesByStatus: Record<string, number> = {};
    const bilateralCounts = new Map<string, number>();

    for (const treaty of treaties) {
      // Count by category
      for (const category of treaty.category) {
        treatiesByCategory[category] = (treatiesByCategory[category] || 0) + 1;
      }

      // Count by status
      treatiesByStatus[treaty.status] = (treatiesByStatus[treaty.status] || 0) + 1;

      // Count bilateral partners
      if (treaty.parties.length === 2) {
        const partner = treaty.parties.find(p =>
          p.country !== party && p.organization !== party
        );
        if (partner) {
          const partnerKey = partner.country || partner.organization || '';
          bilateralCounts.set(partnerKey, (bilateralCounts.get(partnerKey) || 0) + 1);
        }
      }
    }

    const bilateralPartners = Array.from(bilateralCounts.entries())
      .map(([partner, count]) => ({ partner, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate compliance rate
    let totalCompliance = 0;
    let complianceCount = 0;

    for (const treaty of treaties) {
      const compliance = this.assessCompliance(treaty.id, party);
      if (compliance) {
        totalCompliance += compliance.overallCompliance;
        complianceCount++;
      }
    }

    const complianceRate = complianceCount > 0 ? totalCompliance / complianceCount : 0;

    // Count pending obligations
    let pendingObligations = 0;
    for (const treaty of treaties) {
      pendingObligations += treaty.keyObligations.filter(o =>
        o.status === 'PENDING' || o.status === 'IN_PROGRESS'
      ).length;
    }

    return {
      totalTreaties: treaties.length,
      treatiesByCategory,
      treatiesByStatus,
      bilateralPartners,
      complianceRate,
      pendingObligations
    };
  }

  /**
   * Detect treaty termination risks
   */
  detectTerminationRisks(): {
    treatyId: string;
    title: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    indicators: string[];
  }[] {
    const risks: {
      treatyId: string;
      title: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      indicators: string[];
    }[] = [];

    for (const treaty of this.treaties.values()) {
      if (treaty.status !== TreatyStatus.IN_FORCE) continue;

      const indicators: string[] = [];
      let riskScore = 0;

      // Check for withdrawals
      if (treaty.withdrawals && treaty.withdrawals.length > 0) {
        indicators.push(`${treaty.withdrawals.length} parties have withdrawn`);
        riskScore += treaty.withdrawals.length * 10;
      }

      // Check for serious violations
      const violations = this.getViolations(treaty.id);
      const seriousViolations = violations.filter(v =>
        v.severity === 'SERIOUS' || v.severity === 'GRAVE'
      );
      if (seriousViolations.length > 0) {
        indicators.push(`${seriousViolations.length} serious violations detected`);
        riskScore += seriousViolations.length * 5;
      }

      // Check for active disputes
      if (treaty.disputes) {
        const activeDisputes = treaty.disputes.filter(d =>
          d.status === 'PENDING' || d.status === 'IN_PROGRESS'
        );
        if (activeDisputes.length > 0) {
          indicators.push(`${activeDisputes.length} active disputes`);
          riskScore += activeDisputes.length * 3;
        }
      }

      // Check compliance rates
      const implementation = this.analyzeTreatyImplementation(treaty.id);
      if (implementation.overallProgress < 50) {
        indicators.push('Low overall implementation progress');
        riskScore += 15;
      }

      if (riskScore > 0) {
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (riskScore >= 30) riskLevel = 'CRITICAL';
        else if (riskScore >= 20) riskLevel = 'HIGH';
        else if (riskScore >= 10) riskLevel = 'MEDIUM';
        else riskLevel = 'LOW';

        risks.push({
          treatyId: treaty.id,
          title: treaty.title,
          riskLevel,
          indicators
        });
      }
    }

    return risks.sort((a, b) => {
      const levels = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return levels[b.riskLevel] - levels[a.riskLevel];
    });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTreaties: number;
    treatiesByStatus: Record<string, number>;
    treatiesByCategory: Record<string, number>;
    activeParties: Set<string>;
  } {
    const treatiesByStatus: Record<string, number> = {};
    const treatiesByCategory: Record<string, number> = {};
    const activeParties = new Set<string>();

    for (const treaty of this.treaties.values()) {
      treatiesByStatus[treaty.status] = (treatiesByStatus[treaty.status] || 0) + 1;

      for (const category of treaty.category) {
        treatiesByCategory[category] = (treatiesByCategory[category] || 0) + 1;
      }

      for (const party of treaty.parties) {
        if (party.status === 'ACTIVE') {
          activeParties.add(party.country || party.organization || '');
        }
      }
    }

    return {
      totalTreaties: this.treaties.size,
      treatiesByStatus,
      treatiesByCategory,
      activeParties
    };
  }
}
