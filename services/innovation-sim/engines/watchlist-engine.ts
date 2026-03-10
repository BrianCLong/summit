/**
 * Watchlist and Briefing Engine
 *
 * Generates stakeholder-specific views and automated reports.
 */

import type { StrategyRecommendation } from "./strategy-engine.js";
import type { AdoptionEstimate } from "../interfaces/adoption.js";
import type { DiffusionEstimate } from "../interfaces/diffusion.js";

export type StakeholderRole =
  | "executive"
  | "technical_lead"
  | "product_manager"
  | "analyst"
  | "investor";

export interface WatchlistItem {
  nodeId: string;
  nodeName: string;
  alertLevel: "critical" | "warning" | "info";
  reason: string;
  metrics: {
    currentValue: number;
    threshold: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  lastUpdated: string;
}

export interface Briefing {
  stakeholder: StakeholderRole;
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
    priority: "high" | "medium" | "low";
  }>;
  watchlist: WatchlistItem[];
  recommendations: StrategyRecommendation[];
  charts?: any[];
  generatedAt: string;
}

export class WatchlistEngine {
  /**
   * Generate briefing for stakeholder
   */
  generateBriefing(
    stakeholder: StakeholderRole,
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>,
    recommendations: StrategyRecommendation[]
  ): Briefing {
    const watchlist = this.buildWatchlist(adoptionEstimates, diffusionEstimates);
    const sections = this.buildSections(stakeholder, adoptionEstimates, diffusionEstimates, recommendations);
    const summary = this.generateSummary(stakeholder, watchlist, recommendations);

    return {
      stakeholder,
      title: this.getTitleForRole(stakeholder),
      summary,
      sections,
      watchlist,
      recommendations: this.filterRecommendations(stakeholder, recommendations),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Build watchlist from estimates
   */
  private buildWatchlist(
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>
  ): WatchlistItem[] {
    const items: WatchlistItem[] = [];

    for (const [nodeId, adoption] of adoptionEstimates.entries()) {
      const diffusion = diffusionEstimates.get(nodeId);
      if (!diffusion) continue;

      // Alert on high momentum + low lock-in (opportunity)
      if (adoption.momentum > 0.5 && diffusion.lockInEffect.strength < 0.3) {
        items.push({
          nodeId,
          nodeName: nodeId,
          alertLevel: "info",
          reason: "High momentum with low lock-in - early adoption opportunity",
          metrics: {
            currentValue: adoption.momentum,
            threshold: 0.5,
            trend: "increasing"
          },
          lastUpdated: new Date().toISOString()
        });
      }

      // Alert on high replacement risk (threat)
      if (diffusion.vulnerabilities.replacementRisk > 0.5) {
        items.push({
          nodeId,
          nodeName: nodeId,
          alertLevel: "warning",
          reason: "High replacement risk detected",
          metrics: {
            currentValue: diffusion.vulnerabilities.replacementRisk,
            threshold: 0.5,
            trend: "increasing"
          },
          lastUpdated: new Date().toISOString()
        });
      }

      // Alert on declining phase (action needed)
      if (adoption.phase === "declining") {
        items.push({
          nodeId,
          nodeName: nodeId,
          alertLevel: "critical",
          reason: "Technology in declining phase - migration recommended",
          metrics: {
            currentValue: adoption.adoptionRate,
            threshold: 0.85,
            trend: "decreasing"
          },
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return items.sort((a, b) => {
      const priority = { critical: 0, warning: 1, info: 2 };
      return priority[a.alertLevel] - priority[b.alertLevel];
    });
  }

  /**
   * Build sections for stakeholder
   */
  private buildSections(
    stakeholder: StakeholderRole,
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>,
    recommendations: StrategyRecommendation[]
  ): Briefing["sections"] {
    const sections: Briefing["sections"] = [];

    switch (stakeholder) {
      case "executive":
        sections.push({
          heading: "Strategic Overview",
          content: this.generateStrategicOverview(recommendations),
          priority: "high"
        });
        sections.push({
          heading: "Key Risks",
          content: this.generateRiskSummary(diffusionEstimates),
          priority: "high"
        });
        break;

      case "technical_lead":
        sections.push({
          heading: "Technology Landscape",
          content: this.generateTechLandscape(adoptionEstimates),
          priority: "high"
        });
        sections.push({
          heading: "Adoption Trends",
          content: this.generateAdoptionTrends(adoptionEstimates),
          priority: "medium"
        });
        break;

      case "product_manager":
        sections.push({
          heading: "Market Position",
          content: this.generateMarketPosition(diffusionEstimates),
          priority: "high"
        });
        sections.push({
          heading: "Competitive Dynamics",
          content: this.generateCompetitiveDynamics(diffusionEstimates),
          priority: "high"
        });
        break;

      case "analyst":
        sections.push({
          heading: "Detailed Analytics",
          content: this.generateDetailedAnalytics(adoptionEstimates, diffusionEstimates),
          priority: "high"
        });
        break;

      case "investor":
        sections.push({
          heading: "Investment Outlook",
          content: this.generateInvestmentOutlook(recommendations),
          priority: "high"
        });
        break;
    }

    return sections;
  }

  private getTitleForRole(role: StakeholderRole): string {
    const titles: Record<StakeholderRole, string> = {
      executive: "Executive Technology Strategy Brief",
      technical_lead: "Technical Leadership Report",
      product_manager: "Product Strategy Briefing",
      analyst: "Innovation Analysis Report",
      investor: "Technology Investment Brief"
    };
    return titles[role];
  }

  private filterRecommendations(
    stakeholder: StakeholderRole,
    recommendations: StrategyRecommendation[]
  ): StrategyRecommendation[] {
    // Limit recommendations based on role
    const limits: Record<StakeholderRole, number> = {
      executive: 5,
      technical_lead: 10,
      product_manager: 8,
      analyst: 20,
      investor: 5
    };

    return recommendations.slice(0, limits[stakeholder]);
  }

  private generateSummary(
    stakeholder: StakeholderRole,
    watchlist: WatchlistItem[],
    recommendations: StrategyRecommendation[]
  ): string {
    const critical = watchlist.filter(w => w.alertLevel === "critical").length;
    const warnings = watchlist.filter(w => w.alertLevel === "warning").length;

    return `${recommendations.length} strategic recommendations generated. ${critical} critical alerts, ${warnings} warnings. Tailored for ${stakeholder} perspective.`;
  }

  private generateStrategicOverview(recommendations: StrategyRecommendation[]): string {
    return `${recommendations.length} technology recommendations across adopt, monitor, divest, invest, and migrate strategies.`;
  }

  private generateRiskSummary(diffusionEstimates: Map<string, DiffusionEstimate>): string {
    const highRisk = Array.from(diffusionEstimates.values())
      .filter(e => e.vulnerabilities.replacementRisk > 0.5).length;
    return `${highRisk} technologies identified with elevated replacement risk.`;
  }

  private generateTechLandscape(adoptionEstimates: Map<string, AdoptionEstimate>): string {
    const byPhase = new Map<string, number>();
    for (const est of adoptionEstimates.values()) {
      byPhase.set(est.phase, (byPhase.get(est.phase) || 0) + 1);
    }
    return `Phase distribution: ${Array.from(byPhase.entries()).map(([k, v]) => `${k}=${v}`).join(", ")}`;
  }

  private generateAdoptionTrends(adoptionEstimates: Map<string, AdoptionEstimate>): string {
    const avgMomentum = Array.from(adoptionEstimates.values())
      .reduce((sum, e) => sum + e.momentum, 0) / adoptionEstimates.size;
    return `Average momentum: ${avgMomentum.toFixed(3)}`;
  }

  private generateMarketPosition(diffusionEstimates: Map<string, DiffusionEstimate>): string {
    const avgLockIn = Array.from(diffusionEstimates.values())
      .reduce((sum, e) => sum + e.lockInEffect.strength, 0) / diffusionEstimates.size;
    return `Average lock-in strength: ${avgLockIn.toFixed(3)}`;
  }

  private generateCompetitiveDynamics(diffusionEstimates: Map<string, DiffusionEstimate>): string {
    return `Competitive analysis across ${diffusionEstimates.size} technologies`;
  }

  private generateDetailedAnalytics(
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>
  ): string {
    return `Comprehensive analytics for ${adoptionEstimates.size} nodes with full diffusion modeling`;
  }

  private generateInvestmentOutlook(recommendations: StrategyRecommendation[]): string {
    const investRecs = recommendations.filter(r => r.type === "invest" || r.type === "adopt");
    return `${investRecs.length} investment opportunities identified`;
  }
}
