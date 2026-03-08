"use strict";
/**
 * Report Generator Step Executor
 *
 * Handles attribution report generation for CTI workflows.
 *
 * @module runbooks/runtime/executors/report-executor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGeneratorStepExecutor = exports.DefaultReportGeneratorService = void 0;
const uuid_1 = require("uuid");
const base_js_1 = require("./base.js");
/**
 * Default report generator service implementation
 */
class DefaultReportGeneratorService {
    async generateAttributionReport(input) {
        const reportId = `report-${(0, uuid_1.v4)()}`;
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
    calculateConfidenceScore(input) {
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
    generateSummary(input, confidenceScore, attributedActor) {
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
    getConfidenceLevel(score) {
        if (score >= 0.85)
            return 'very high';
        if (score >= 0.7)
            return 'high';
        if (score >= 0.5)
            return 'medium';
        return 'low';
    }
}
exports.DefaultReportGeneratorService = DefaultReportGeneratorService;
/**
 * Report generator step executor for attribution reports
 */
class ReportGeneratorStepExecutor extends base_js_1.BaseStepExecutor {
    reportService;
    actionType = 'GENERATE_REPORT';
    constructor(reportService = new DefaultReportGeneratorService()) {
        super();
        this.reportService = reportService;
    }
    async execute(ctx) {
        try {
            // Gather data from previous steps
            const indicators = this.findPreviousOutput(ctx, 'indicators') ||
                this.getInput(ctx, 'indicators', []);
            const infraNodeIds = this.findPreviousOutput(ctx, 'infraNodeIds') || [];
            const campaignMatches = this.findPreviousOutput(ctx, 'campaignMatches') || [];
            // Determine residual unknowns
            const residualUnknowns = [];
            if (campaignMatches.length === 0) {
                residualUnknowns.push('No known campaigns matched; attribution remains low-confidence.');
            }
            if (infraNodeIds.length === 0) {
                residualUnknowns.push('No infrastructure relationships discovered.');
            }
            const caseId = this.getInput(ctx, 'caseId', '');
            // Generate report
            const result = await this.reportService.generateAttributionReport({
                indicators,
                infraNodeIds,
                campaignMatches,
                residualUnknowns,
                caseId: caseId || undefined,
            });
            // Create comprehensive report object
            const fullReport = {
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
                this.createCitation('CTI Analysis Engine', result.reportUrl, ctx.userId, {
                    reportId: result.reportId,
                    generatedAt: fullReport.generatedAt,
                }),
            ];
            // Create evidence
            const evidence = this.createEvidence('attribution_report', fullReport, allCitations, {
                confidenceScore: result.confidenceScore,
                qualityScore: result.confidenceScore,
                hasAttribution: !!result.attributedActor,
            });
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
            return this.success({
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
            }, {
                evidence: [evidence],
                citations: allCitations,
                proofs: [proof],
                kpis: {
                    confidenceScore: result.confidenceScore,
                    hasAttribution: result.attributedActor ? 1 : 0,
                    residualUnknownCount: residualUnknowns.length,
                    alternativeCandidateCount: fullReport.alternativeCandidates.length,
                },
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Failed to generate report');
        }
    }
    getConfidenceLevel(score) {
        if (score >= 0.85)
            return 'very_high';
        if (score >= 0.7)
            return 'high';
        if (score >= 0.5)
            return 'medium';
        return 'low';
    }
    generateRecommendations(confidenceScore, residualUnknowns) {
        const recommendations = [];
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
exports.ReportGeneratorStepExecutor = ReportGeneratorStepExecutor;
