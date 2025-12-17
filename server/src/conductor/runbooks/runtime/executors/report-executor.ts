/**
 * Report Generator Step Executor
 *
 * Handles attribution report generation for CTI workflows.
 *
 * @module runbooks/runtime/executors/report-executor
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseStepExecutor } from './base';
import {
  StepExecutorContext,
  StepExecutorResult,
  RunbookActionType,
  ReportGeneratorService,
} from '../types';

/**
 * Attribution report structure
 */
export interface AttributionReport {
  reportId: string;
  title: string;
  summary: string;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high' | 'very_high';
  attributedActor?: {
    id: string;
    name: string;
    aliases: string[];
    confidence: number;
  };
  alternativeCandidates: Array<{
    id: string;
    name: string;
    score: number;
  }>;
  evidenceSummary: {
    indicatorCount: number;
    infrastructureCount: number;
    campaignMatches: number;
    ttpMatches: number;
  };
  residualUnknowns: string[];
  recommendations: string[];
  generatedAt: string;
  reportUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Default report generator service implementation
 */
export class DefaultReportGeneratorService implements ReportGeneratorService {
  async generateAttributionReport(input: {
    indicators: string[];
    infraNodeIds: string[];
    campaignMatches: Array<{ campaignId: string; campaignName: string; score: number }>;
    residualUnknowns: string[];
    caseId?: string;
  }): Promise<{
    reportId: string;
    reportSummary: string;
    reportUrl?: string;
    confidenceScore: number;
    attributedActor?: {
      id: string;
      name: string;
      confidence: number;
    };
  }> {
    const reportId = `report-${uuidv4()}`;

    // Calculate overall confidence score
    const confidenceScore = this.calculateConfidenceScore(input);

    // Determine top attribution
    const topMatch = input.campaignMatches[0];
    const attributedActor = topMatch
      ? {
          id: topMatch.campaignId.split('-')[1] || 'unknown',
          name: topMatch.campaignName.split(' Campaign')[0] || 'Unknown Actor',
          confidence: topMatch.score,
        }
      : undefined;

    // Generate summary
    const reportSummary = this.generateSummary(input, confidenceScore, attributedActor);

    return {
      reportId,
      reportSummary,
      reportUrl: `/reports/${reportId}`,
      confidenceScore,
      attributedActor,
    };
  }

  private calculateConfidenceScore(input: {
    indicators: string[];
    infraNodeIds: string[];
    campaignMatches: Array<{ campaignId: string; campaignName: string; score: number }>;
    residualUnknowns: string[];
  }): number {
    let score = 0;

    // Indicator coverage (up to 0.25)
    score += Math.min(input.indicators.length * 0.05, 0.25);

    // Infrastructure coverage (up to 0.25)
    score += Math.min(input.infraNodeIds.length * 0.05, 0.25);

    // Campaign matches (up to 0.4)
    if (input.campaignMatches.length > 0) {
      const topScore = input.campaignMatches[0].score;
      score += topScore * 0.4;
    }

    // Penalty for unknowns (up to -0.1)
    score -= Math.min(input.residualUnknowns.length * 0.02, 0.1);

    return Math.max(0, Math.min(score, 1.0));
  }

  private generateSummary(
    input: {
      indicators: string[];
      infraNodeIds: string[];
      campaignMatches: Array<{ campaignId: string; campaignName: string; score: number }>;
      residualUnknowns: string[];
    },
    confidenceScore: number,
    attributedActor?: { id: string; name: string; confidence: number }
  ): string {
    const confidenceLevel = this.getConfidenceLevel(confidenceScore);

    if (!attributedActor) {
      return `Attribution analysis completed with ${confidenceLevel} confidence. ` +
        `Analyzed ${input.indicators.length} indicators and ${input.infraNodeIds.length} infrastructure nodes. ` +
        `No definitive attribution could be made. ` +
        `${input.residualUnknowns.length} unknowns remain to be investigated.`;
    }

    return `Attribution analysis completed with ${confidenceLevel} confidence (${(confidenceScore * 100).toFixed(1)}%). ` +
      `Based on analysis of ${input.indicators.length} indicators and ${input.infraNodeIds.length} infrastructure nodes, ` +
      `the activity is attributed to ${attributedActor.name} with ${(attributedActor.confidence * 100).toFixed(1)}% confidence. ` +
      `${input.campaignMatches.length} related campaigns were identified. ` +
      `${input.residualUnknowns.length > 0 ? `${input.residualUnknowns.length} unknowns require further investigation.` : 'All indicators were successfully attributed.'}`;
  }

  private getConfidenceLevel(score: number): string {
    if (score >= 0.85) return 'very high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
}

/**
 * Report generator step executor for attribution reports
 */
export class ReportGeneratorStepExecutor extends BaseStepExecutor {
  readonly actionType: RunbookActionType = 'GENERATE_REPORT';

  constructor(
    private readonly reportService: ReportGeneratorService = new DefaultReportGeneratorService()
  ) {
    super();
  }

  async execute(ctx: StepExecutorContext): Promise<StepExecutorResult> {
    try {
      // Gather data from previous steps
      const indicators =
        this.findPreviousOutput<string[]>(ctx, 'indicators') ||
        this.getInput<string[]>(ctx, 'indicators', []);

      const infraNodeIds =
        this.findPreviousOutput<string[]>(ctx, 'infraNodeIds') || [];

      const campaignMatches =
        this.findPreviousOutput<Array<{ campaignId: string; campaignName: string; score: number }>>(
          ctx,
          'campaignMatches'
        ) || [];

      // Determine residual unknowns
      const residualUnknowns: string[] = [];
      if (campaignMatches.length === 0) {
        residualUnknowns.push('No known campaigns matched; attribution remains low-confidence.');
      }
      if (infraNodeIds.length === 0) {
        residualUnknowns.push('No infrastructure relationships discovered.');
      }

      const caseId = this.getInput<string>(ctx, 'caseId', '');

      // Generate report
      const result = await this.reportService.generateAttributionReport({
        indicators,
        infraNodeIds,
        campaignMatches,
        residualUnknowns,
        caseId: caseId || undefined,
      });

      // Create comprehensive report object
      const fullReport: AttributionReport = {
        reportId: result.reportId,
        title: `CTI Attribution Report - ${new Date().toISOString().split('T')[0]}`,
        summary: result.reportSummary,
        confidenceScore: result.confidenceScore,
        confidenceLevel: this.getConfidenceLevel(result.confidenceScore),
        attributedActor: result.attributedActor
          ? {
              id: result.attributedActor.id,
              name: result.attributedActor.name,
              aliases: [],
              confidence: result.attributedActor.confidence,
            }
          : undefined,
        alternativeCandidates: campaignMatches.slice(1, 4).map((m) => ({
          id: m.campaignId,
          name: m.campaignName,
          score: m.score,
        })),
        evidenceSummary: {
          indicatorCount: indicators.length,
          infrastructureCount: infraNodeIds.length,
          campaignMatches: campaignMatches.length,
          ttpMatches: 0, // Would be calculated from campaign data
        },
        residualUnknowns,
        recommendations: this.generateRecommendations(result.confidenceScore, residualUnknowns),
        generatedAt: new Date().toISOString(),
        reportUrl: result.reportUrl,
        metadata: {
          caseId,
          executionId: ctx.executionId,
          runbookId: ctx.runbookId,
        },
      };

      // Collect all previous citations
      const allCitations = [
        this.createCitation(
          'CTI Analysis Engine',
          result.reportUrl,
          ctx.userId,
          {
            reportId: result.reportId,
            generatedAt: fullReport.generatedAt,
          }
        ),
      ];

      // Create evidence
      const evidence = this.createEvidence(
        'attribution_report',
        fullReport,
        allCitations,
        {
          confidenceScore: result.confidenceScore,
          qualityScore: result.confidenceScore,
          hasAttribution: !!result.attributedActor,
        }
      );

      // Create cryptographic proof of the report
      const proof = this.createProof({
        reportId: result.reportId,
        confidenceScore: result.confidenceScore,
        attributedActor: result.attributedActor?.name,
        timestamp: new Date().toISOString(),
        indicatorCount: indicators.length,
        infrastructureCount: infraNodeIds.length,
      });
      evidence.proofs.push(proof);

      return this.success(
        {
          reportId: result.reportId,
          reportSummary: result.reportSummary,
          reportUrl: result.reportUrl,
          confidenceScore: result.confidenceScore,
          confidenceLevel: fullReport.confidenceLevel,
          attributedActor: result.attributedActor,
          alternativeCandidates: fullReport.alternativeCandidates,
          residualUnknowns,
          recommendations: fullReport.recommendations,
          fullReport,
        },
        {
          evidence: [evidence],
          citations: allCitations,
          proofs: [proof],
          kpis: {
            confidenceScore: result.confidenceScore,
            hasAttribution: result.attributedActor ? 1 : 0,
            residualUnknownCount: residualUnknowns.length,
            alternativeCandidateCount: fullReport.alternativeCandidates.length,
          },
        }
      );
    } catch (error) {
      return this.failure(
        error instanceof Error ? error.message : 'Failed to generate report'
      );
    }
  }

  private getConfidenceLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score >= 0.85) return 'very_high';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    confidenceScore: number,
    residualUnknowns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (confidenceScore < 0.5) {
      recommendations.push('Gather additional indicators to improve attribution confidence.');
      recommendations.push('Consider manual analysis by senior CTI analysts.');
    }

    if (confidenceScore >= 0.5 && confidenceScore < 0.7) {
      recommendations.push('Review alternative candidates for potential attribution.');
      recommendations.push('Correlate with external threat intelligence feeds.');
    }

    if (confidenceScore >= 0.7) {
      recommendations.push('Consider sharing IOCs with trusted partners.');
      recommendations.push('Update detection rules based on identified TTPs.');
    }

    if (residualUnknowns.length > 0) {
      recommendations.push('Investigate residual unknowns with additional data sources.');
    }

    recommendations.push('Monitor for follow-up activity related to this campaign.');

    return recommendations;
  }
}
