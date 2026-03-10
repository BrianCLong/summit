/**
 * Strategy Synthesis Engine
 *
 * Generates evidence-backed recommendations with assumption ledgers.
 */

import type { InnovationGraph } from "../interfaces/innovation-graph.js";
import type { SimulationResult } from "./simulation-core.js";
import type { DiffusionEstimate } from "../interfaces/diffusion.js";
import type { AdoptionEstimate } from "../interfaces/adoption.js";

export type RecommendationType =
  | "adopt"
  | "monitor"
  | "divest"
  | "invest"
  | "migrate"
  | "double-down";

export interface StrategyRecommendation {
  id: string;
  type: RecommendationType;
  targetNode: string;
  rationale: string;
  evidence: {
    adoptionTrend: string;
    lockInStrength: string;
    competitivePosition: string;
    riskFactors: string[];
  };
  assumptions: string[];
  confidence: number;
  expectedOutcome: {
    benefit: number;
    cost: number;
    timeHorizon: number;
    roi: number;
  };
  alternatives: string[];
  risks: string[];
}

export interface AssumptionLedger {
  assumptions: Array<{
    id: string;
    statement: string;
    category: "market" | "technical" | "organizational" | "competitive";
    confidence: number;
    evidence: string[];
    sensitivity: "high" | "medium" | "low";
  }>;
  dependencies: Map<string, string[]>; // Assumption ID -> dependent recommendations
}

export interface StrategyBrief {
  executiveSummary: string;
  recommendations: StrategyRecommendation[];
  assumptionLedger: AssumptionLedger;
  keyInsights: string[];
  risks: string[];
  confidence: number;
  generatedAt: string;
}

export class StrategyEngine {
  /**
   * Generate strategy recommendations from analysis
   */
  synthesizeStrategy(
    graph: InnovationGraph,
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>,
    simulations?: SimulationResult[]
  ): StrategyBrief {
    const recommendations = this.generateRecommendations(
      graph,
      adoptionEstimates,
      diffusionEstimates
    );

    const assumptionLedger = this.buildAssumptionLedger(recommendations);

    const keyInsights = this.extractKeyInsights(
      adoptionEstimates,
      diffusionEstimates,
      recommendations
    );

    const risks = this.identifyRisks(diffusionEstimates, recommendations);

    const confidence = this.calculateOverallConfidence(
      recommendations,
      assumptionLedger
    );

    const executiveSummary = this.generateExecutiveSummary(
      recommendations,
      keyInsights,
      confidence
    );

    return {
      executiveSummary,
      recommendations,
      assumptionLedger,
      keyInsights,
      risks,
      confidence,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate recommendations for each node
   */
  private generateRecommendations(
    graph: InnovationGraph,
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>
  ): StrategyRecommendation[] {
    const recommendations: StrategyRecommendation[] = [];

    for (const node of graph.nodes) {
      const adoption = adoptionEstimates.get(node.id);
      const diffusion = diffusionEstimates.get(node.id);

      if (!adoption || !diffusion) continue;

      const rec = this.recommendForNode(node, adoption, diffusion);
      if (rec) recommendations.push(rec);
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate recommendation for a single node
   */
  private recommendForNode(
    node: any,
    adoption: AdoptionEstimate,
    diffusion: DiffusionEstimate
  ): StrategyRecommendation | null {
    let type: RecommendationType;
    let rationale: string;
    let assumptions: string[] = [];
    let risks: string[] = [];

    // Decision logic
    if (adoption.phase === "nascent" && adoption.momentum > 0.5) {
      type = "monitor";
      rationale = `${node.name} is in nascent phase with high momentum (${adoption.momentum.toFixed(2)}). Early adoption risk, but potential for early-mover advantage.`;
      assumptions.push("Technology will mature successfully");
      assumptions.push("Current momentum will be sustained");
      risks.push("Technology may not reach maturity");
      risks.push("Standards may shift");
    } else if (adoption.phase === "growth" && diffusion.lockInEffect.strength > 0.3) {
      type = "adopt";
      rationale = `${node.name} is in growth phase with moderate lock-in (${diffusion.lockInEffect.strength.toFixed(2)}). Strong adoption opportunity with established ecosystem.`;
      assumptions.push("Growth trajectory will continue");
      assumptions.push("Lock-in effects will strengthen");
      risks.push("Competition may intensify");
    } else if (adoption.phase === "mature" && diffusion.lockInEffect.strength > 0.7) {
      type = "double-down";
      rationale = `${node.name} is mature with high lock-in (${diffusion.lockInEffect.strength.toFixed(2)}). Entrenched position, high switching costs.`;
      assumptions.push("Technology will remain dominant");
      assumptions.push("No disruptive alternatives will emerge");
      risks.push("Disruptive innovation could emerge");
      risks.push("Switching costs may decrease");
    } else if (adoption.phase === "declining") {
      type = "migrate";
      rationale = `${node.name} is declining. Migration planning recommended.`;
      assumptions.push("Decline will continue");
      risks.push("Migration costs may be high");
    } else if (diffusion.vulnerabilities.replacementRisk > 0.5) {
      type = "divest";
      rationale = `${node.name} has high replacement risk (${diffusion.vulnerabilities.replacementRisk.toFixed(2)}). Low switching costs enable competition.`;
      assumptions.push("Alternatives will gain traction");
      risks.push("Divesting too early may miss value");
    } else {
      type = "monitor";
      rationale = `${node.name} warrants continued monitoring.`;
    }

    const benefit = this.estimateBenefit(type, adoption, diffusion);
    const cost = this.estimateCost(type, adoption, diffusion);
    const timeHorizon = this.estimateTimeHorizon(type, adoption.phase);

    return {
      id: `rec-${node.id}`,
      type,
      targetNode: node.id,
      rationale,
      evidence: {
        adoptionTrend: `Phase: ${adoption.phase}, Momentum: ${adoption.momentum.toFixed(2)}`,
        lockInStrength: `${diffusion.lockInEffect.strength.toFixed(2)}`,
        competitivePosition: `PageRank: ${diffusion.networkMetrics.pageRank.toFixed(3)}`,
        riskFactors: [
          `Replacement risk: ${diffusion.vulnerabilities.replacementRisk.toFixed(2)}`,
          `Switching feasibility: ${diffusion.vulnerabilities.switchingFeasibility.toFixed(2)}`
        ]
      },
      assumptions,
      confidence: Math.min(adoption.confidence, diffusion.confidence),
      expectedOutcome: {
        benefit,
        cost,
        timeHorizon,
        roi: cost > 0 ? benefit / cost : benefit
      },
      alternatives: this.identifyAlternatives(node, diffusion),
      risks
    };
  }

  /**
   * Estimate benefit of recommendation
   */
  private estimateBenefit(
    type: RecommendationType,
    adoption: AdoptionEstimate,
    diffusion: DiffusionEstimate
  ): number {
    switch (type) {
      case "adopt":
      case "double-down":
        return adoption.momentum * diffusion.lockInEffect.strength;
      case "invest":
        return adoption.momentum * 0.8;
      case "monitor":
        return 0.3;
      case "migrate":
      case "divest":
        return 1.0 - diffusion.lockInEffect.strength;
      default:
        return 0.5;
    }
  }

  /**
   * Estimate cost of recommendation
   */
  private estimateCost(
    type: RecommendationType,
    adoption: AdoptionEstimate,
    diffusion: DiffusionEstimate
  ): number {
    switch (type) {
      case "adopt":
        return 0.5 + diffusion.lockInEffect.components.switchingCost * 0.3;
      case "migrate":
      case "divest":
        return diffusion.lockInEffect.strength;
      case "double-down":
      case "invest":
        return 0.7;
      case "monitor":
        return 0.1;
      default:
        return 0.5;
    }
  }

  /**
   * Estimate time horizon in days
   */
  private estimateTimeHorizon(
    type: RecommendationType,
    phase: string
  ): number {
    const baseHorizon: Record<string, number> = {
      "nascent": 365,
      "emerging": 180,
      "growth": 90,
      "mature": 30,
      "declining": 60
    };

    return baseHorizon[phase] || 180;
  }

  /**
   * Identify alternative technologies
   */
  private identifyAlternatives(
    node: any,
    diffusion: DiffusionEstimate
  ): string[] {
    return diffusion.vulnerabilities.competitors.slice(0, 3);
  }

  /**
   * Build assumption ledger
   */
  private buildAssumptionLedger(
    recommendations: StrategyRecommendation[]
  ): AssumptionLedger {
    const assumptions: AssumptionLedger["assumptions"] = [];
    const dependencies = new Map<string, string[]>();

    let assumptionId = 0;

    for (const rec of recommendations) {
      for (const assumption of rec.assumptions) {
        const id = `assumption-${assumptionId++}`;

        assumptions.push({
          id,
          statement: assumption,
          category: this.categorizeAssumption(assumption),
          confidence: rec.confidence,
          evidence: [rec.evidence.adoptionTrend],
          sensitivity: rec.confidence < 0.5 ? "high" : rec.confidence < 0.7 ? "medium" : "low"
        });

        dependencies.set(id, [rec.id]);
      }
    }

    return { assumptions, dependencies };
  }

  /**
   * Categorize assumption
   */
  private categorizeAssumption(
    assumption: string
  ): "market" | "technical" | "organizational" | "competitive" {
    if (assumption.includes("market") || assumption.includes("adoption")) return "market";
    if (assumption.includes("technology") || assumption.includes("mature")) return "technical";
    if (assumption.includes("organization") || assumption.includes("internal")) return "organizational";
    return "competitive";
  }

  /**
   * Extract key insights
   */
  private extractKeyInsights(
    adoptionEstimates: Map<string, AdoptionEstimate>,
    diffusionEstimates: Map<string, DiffusionEstimate>,
    recommendations: StrategyRecommendation[]
  ): string[] {
    const insights: string[] = [];

    // High-momentum technologies
    const highMomentum = Array.from(adoptionEstimates.values())
      .filter(e => e.momentum > 0.5)
      .sort((a, b) => b.momentum - a.momentum);

    if (highMomentum.length > 0) {
      insights.push(`${highMomentum.length} technologies show high momentum (>0.5), indicating rapid adoption`);
    }

    // Lock-in analysis
    const highLockIn = Array.from(diffusionEstimates.values())
      .filter(e => e.lockInEffect.strength > 0.5).length;

    if (highLockIn > 0) {
      insights.push(`${highLockIn} technologies have high lock-in effects, creating switching barriers`);
    }

    // Recommendation distribution
    const recTypes = new Map<RecommendationType, number>();
    for (const rec of recommendations) {
      recTypes.set(rec.type, (recTypes.get(rec.type) || 0) + 1);
    }

    const topRecType = Array.from(recTypes.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topRecType) {
      insights.push(`Primary strategic action: ${topRecType[0]} (${topRecType[1]} recommendations)`);
    }

    return insights;
  }

  /**
   * Identify risks
   */
  private identifyRisks(
    diffusionEstimates: Map<string, DiffusionEstimate>,
    recommendations: StrategyRecommendation[]
  ): string[] {
    const risks: string[] = [];

    // High replacement risk
    const highRisk = Array.from(diffusionEstimates.values())
      .filter(e => e.vulnerabilities.replacementRisk > 0.5).length;

    if (highRisk > 0) {
      risks.push(`${highRisk} technologies face high replacement risk`);
    }

    // Low confidence recommendations
    const lowConf = recommendations.filter(r => r.confidence < 0.5).length;

    if (lowConf > 0) {
      risks.push(`${lowConf} recommendations have low confidence (<0.5)`);
    }

    return risks;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    recommendations: StrategyRecommendation[],
    assumptionLedger: AssumptionLedger
  ): number {
    if (recommendations.length === 0) return 0;

    const avgRecConf = recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length;

    const highSensitivity = assumptionLedger.assumptions.filter(a => a.sensitivity === "high").length;
    const sensitivityPenalty = Math.min(0.3, highSensitivity * 0.05);

    return Math.max(0, Math.min(1, avgRecConf - sensitivityPenalty));
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    recommendations: StrategyRecommendation[],
    keyInsights: string[],
    confidence: number
  ): string {
    const lines = [
      `Strategic analysis generated with ${(confidence * 100).toFixed(0)}% confidence.`,
      "",
      `${recommendations.length} technology recommendations produced.`,
      "",
      "Key Insights:",
      ...keyInsights.map(i => `- ${i}`),
      "",
      `Top Priority: ${recommendations[0]?.type || "N/A"} for ${recommendations[0]?.targetNode || "N/A"}`
    ];

    return lines.join("\n");
  }
}
