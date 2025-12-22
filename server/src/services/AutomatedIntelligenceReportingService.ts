// @ts-nocheck
import { IntelligenceAnalysisService } from './IntelligenceAnalysisService.js';

interface ThreatPriority {
  id: string;
  name: string;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  justification: string;
}

interface IntelligenceBriefing {
  date: string;
  executiveSummary: string;
  topThreats: ThreatPriority[];
  strategicWarning: any;
  gaps: string[];
  recommendations: string[];
  htmlContent: string;
}

/**
 * AutomatedIntelligenceReportingService
 *
 * Generates automated intelligence products (briefings, priority lists).
 * Corresponds to "Intelligence Analysis Automation".
 */
export class AutomatedIntelligenceReportingService {
  private analysisService: IntelligenceAnalysisService;

  constructor() {
    this.analysisService = new IntelligenceAnalysisService();
  }

  /**
   * Generates a Daily Intelligence Briefing.
   * Aggregates threats, warnings, and gaps into a consumable format.
   */
  async generateDailyBriefing(data: {
    strategicWarning: any;
    recentThreats: any[];
    keyInsights?: string[];
  }): Promise<IntelligenceBriefing> {

    // 1. Prioritize Threats
    const topThreats = this.prioritizeThreats(data.recentThreats);

    // 2. Identify Gaps (using IntelligenceAnalysisService)
    // We check a broad topic like 'Current Global Threats'
    const gapAnalysis = await this.analysisService.generateGapAnalysis('Current Global Threats');
    const gaps = gapAnalysis.identifiedGaps;

    // 3. Draft Executive Summary (Template-based for now)
    const summary = `
      Daily Intelligence Briefing for ${new Date().toLocaleDateString()}.
      Strategic Warning Level is ${data.strategicWarning.level} (${data.strategicWarning.score}/100).
      identified ${topThreats.length} high-priority threats requiring attention.
    `;

    // 4. Generate Recommendations
    const recommendations = [
      ...gapAnalysis.recommendations,
      ...topThreats.filter(t => t.severity === 'CRITICAL').map(t => `Immediate mitigation required for ${t.name}`)
    ];

    // 5. Generate HTML Content
    const htmlContent = `
      <h1>Daily Intelligence Briefing</h1>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <div style="background-color: ${this.getColorForLevel(data.strategicWarning.level)}; padding: 10px; border-radius: 5px;">
        <h2>Strategic Warning Level: ${data.strategicWarning.level}</h2>
        <ul>
          ${data.strategicWarning.indicators.map((i: string) => `<li>${i}</li>`).join('')}
        </ul>
      </div>

      <h3>Top Threats</h3>
      <table>
        <tr><th>Threat</th><th>Severity</th><th>Score</th><th>Justification</th></tr>
        ${topThreats.map(t => `
          <tr>
            <td>${t.name}</td>
            <td style="color: ${this.getColorForSeverity(t.severity)}">${t.severity}</td>
            <td>${t.score}</td>
            <td>${t.justification}</td>
          </tr>
        `).join('')}
      </table>

      <h3>Intelligence Gaps</h3>
      <ul>
        ${gaps.map(g => `<li>${g}</li>`).join('')}
      </ul>
    `;

    return {
      date: new Date().toISOString(),
      executiveSummary: summary.trim(),
      topThreats,
      strategicWarning: data.strategicWarning,
      gaps,
      recommendations,
      htmlContent
    };
  }

  /**
   * Prioritizes threats based on a scoring algorithm.
   * "Threat prioritization scoring (CVSS + context)"
   */
  prioritizeThreats(threats: any[]): ThreatPriority[] {
    return threats.map(threat => {
      let score = 0;
      const factors = [];

      // Base CVSS or Severity
      if (threat.cvss) score += threat.cvss * 10;
      else if (threat.severity === 'high') score += 80;
      else if (threat.severity === 'medium') score += 50;
      else score += 20;

      // Contextual Boosting (Simulated)
      // e.g., if threat targets our sector
      if (threat.targetSector === 'our-sector' || threat.tags?.includes('relevant')) {
        score += 20;
        factors.push('Targeting relevant sector');
      }

      // Recency
      const daysOld = (Date.now() - new Date(threat.detectedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 1) {
        score += 10;
        factors.push('Newly detected');
      }

      // Cap at 100
      score = Math.min(100, score);

      let severity: ThreatPriority['severity'] = 'LOW';
      if (score >= 90) severity = 'CRITICAL';
      else if (score >= 70) severity = 'HIGH';
      else if (score >= 40) severity = 'MEDIUM';

      return {
        id: threat.id,
        name: threat.name || threat.title || 'Unknown Threat',
        score,
        severity,
        justification: factors.join(', ') || 'Standard severity assessment'
      };
    }).sort((a, b) => b.score - a.score);
  }

  private getColorForLevel(level: string) {
    switch (level) {
      case 'CRITICAL': return '#ffcccc';
      case 'HIGH': return '#ffe6cc';
      case 'MEDIUM': return '#ffffcc';
      default: return '#e6ffcc';
    }
  }

  private getColorForSeverity(severity: string) {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'goldenrod';
      default: return 'green';
    }
  }
}
