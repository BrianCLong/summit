// Risk scoring implementation for Maestro v0.4
// Signals: LOC delta, churn, ownership, dependency centrality, coverage delta, complexity, static alerts, test fail rate

export interface RiskSignals {
  locChanged: number;
  churn30d: number;
  filesTouched: number;
  ownersTouched: number;
  depCentrality: number;
  coverageDelta: number;
  complexityDelta: number;
  staticAlerts: number;
  testFailRate: number;
}

export interface RiskAssessment {
  score: number;
  breakdown: Record<string, number>;
  signals: RiskSignals;
  recommendations: string[];
}

export class RiskScorer {
  private weights = {
    loc: 0.1,
    churn: 0.12,
    files: 0.08,
    owners: 0.08,
    dep: 0.18,
    cov: 0.14,
    cplx: 0.12,
    alerts: 0.1,
    fail: 0.08,
  };

  /**
   * Compute risk score based on multiple signals
   * Returns a value between 0.0 (low risk) and 1.0 (high risk)
   */
  async computeRiskScore(changes: any[]): Promise<number> {
    const signals = await this.extractSignals(changes);
    return this.calculateScore(signals);
  }

  /**
   * Get detailed risk assessment with breakdown
   */
  async assessRisk(changes: any[]): Promise<RiskAssessment> {
    const signals = await this.extractSignals(changes);
    const score = this.calculateScore(signals);
    const breakdown = this.calculateBreakdown(signals);
    const recommendations = this.generateRecommendations(signals, score);

    return {
      score,
      breakdown,
      signals,
      recommendations,
    };
  }

  private calculateScore(signals: RiskSignals): number {
    const clamp = (x: number) => Math.max(0, Math.min(1, x));

    const normalizedSignals = {
      loc: clamp(signals.locChanged / 800),
      churn: clamp(signals.churn30d / 2000),
      files: clamp(signals.filesTouched / 25),
      owners: clamp(signals.ownersTouched / 6),
      dep: clamp(signals.depCentrality),
      cov: clamp((0 - signals.coverageDelta) / 0.1),
      cplx: clamp((signals.complexityDelta + 1) / 2),
      alerts: clamp(signals.staticAlerts / 10),
      fail: clamp(signals.testFailRate),
    };

    const score =
      this.weights.loc * normalizedSignals.loc +
      this.weights.churn * normalizedSignals.churn +
      this.weights.files * normalizedSignals.files +
      this.weights.owners * normalizedSignals.owners +
      this.weights.dep * normalizedSignals.dep +
      this.weights.cov * normalizedSignals.cov +
      this.weights.cplx * normalizedSignals.cplx +
      this.weights.alerts * normalizedSignals.alerts +
      this.weights.fail * normalizedSignals.fail;

    return Math.round(score * 1000) / 1000; // 3 decimal places
  }

  private calculateBreakdown(signals: RiskSignals): Record<string, number> {
    const clamp = (x: number) => Math.max(0, Math.min(1, x));

    return {
      linesOfCode: this.weights.loc * clamp(signals.locChanged / 800),
      recentChurn: this.weights.churn * clamp(signals.churn30d / 2000),
      filesModified: this.weights.files * clamp(signals.filesTouched / 25),
      ownersInvolved: this.weights.owners * clamp(signals.ownersTouched / 6),
      dependencyCentrality: this.weights.dep * clamp(signals.depCentrality),
      coverageImpact:
        this.weights.cov * clamp((0 - signals.coverageDelta) / 0.1),
      complexityChange:
        this.weights.cplx * clamp((signals.complexityDelta + 1) / 2),
      staticAnalysis: this.weights.alerts * clamp(signals.staticAlerts / 10),
      testFailures: this.weights.fail * clamp(signals.testFailRate),
    };
  }

  private async extractSignals(changes: any[]): Promise<RiskSignals> {
    // In a real implementation, these would be computed from:
    // - Git history analysis
    // - Dependency graph analysis
    // - Code coverage reports
    // - Static analysis results
    // - Test failure history

    let locChanged = 0;
    let filesTouched = 0;
    const touchedOwners = new Set<string>();
    let complexityDelta = 0;
    let staticAlerts = 0;

    for (const change of changes) {
      locChanged += (change.additions || 0) + (change.deletions || 0);
      filesTouched += change.files?.length || 1;

      // Mock owner detection (would use CODEOWNERS or git blame)
      if (change.author) {
        touchedOwners.add(change.author);
      }

      // Mock complexity analysis
      complexityDelta += change.cyclomaticComplexity || 0;

      // Mock static analysis alerts
      staticAlerts += change.lintErrors || 0;
    }

    // Mock additional signals (would be computed from historical data)
    const churn30d = await this.getChurnMetrics(changes);
    const depCentrality = await this.getDependencyCentrality(changes);
    const coverageDelta = await this.getCoverageDelta(changes);
    const testFailRate = await this.getTestFailRate(changes);

    return {
      locChanged,
      churn30d,
      filesTouched,
      ownersTouched: touchedOwners.size,
      depCentrality,
      coverageDelta,
      complexityDelta,
      staticAlerts,
      testFailRate,
    };
  }

  private async getChurnMetrics(changes: any[]): Promise<number> {
    // Mock implementation - would analyze git history
    return Math.random() * 1000; // 0-1000 changes in last 30 days
  }

  private async getDependencyCentrality(changes: any[]): Promise<number> {
    // Mock implementation - would analyze dependency graph
    return Math.random(); // 0-1 centrality score
  }

  private async getCoverageDelta(changes: any[]): Promise<number> {
    // Mock implementation - would compare coverage reports
    return (Math.random() - 0.5) * 0.2; // -0.1 to +0.1 coverage change
  }

  private async getTestFailRate(changes: any[]): Promise<number> {
    // Mock implementation - would analyze test history
    return Math.random() * 0.1; // 0-10% test failure rate
  }

  private generateRecommendations(
    signals: RiskSignals,
    score: number,
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 0.8) {
      recommendations.push(
        'High risk change - consider breaking into smaller PRs',
      );
    }

    if (signals.locChanged > 500) {
      recommendations.push('Large change detected - ensure adequate testing');
    }

    if (signals.ownersTouched > 3) {
      recommendations.push(
        'Multiple code owners affected - coordinate reviews',
      );
    }

    if (signals.coverageDelta < -0.05) {
      recommendations.push('Test coverage decreased - add missing tests');
    }

    if (signals.staticAlerts > 5) {
      recommendations.push(
        'Multiple static analysis issues - address before merge',
      );
    }

    if (signals.depCentrality > 0.7) {
      recommendations.push(
        'High-impact dependencies modified - extra caution required',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Low risk change - standard review process');
    }

    return recommendations;
  }

  async getStats(): Promise<any> {
    return {
      component: 'RiskScorer',
      version: '0.4.0',
      weights: this.weights,
      // Add runtime statistics here
    };
  }
}
