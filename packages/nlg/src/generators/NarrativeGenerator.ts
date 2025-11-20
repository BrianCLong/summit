/**
 * Natural language narrative generation
 */

export interface NarrativeContext {
  data: Record<string, any>;
  context: string;
  tone: 'formal' | 'informal' | 'technical' | 'executive';
  audience: string;
  purpose: string;
}

export interface GeneratedNarrative {
  text: string;
  confidence: number;
  sources: string[];
  metadata: Record<string, any>;
}

export class NarrativeGenerator {
  /**
   * Generate narrative text from data
   */
  async generateNarrative(context: NarrativeContext): Promise<GeneratedNarrative> {
    // This is a placeholder implementation
    // In production, this would integrate with LLM APIs or use advanced NLG techniques

    const { data, tone, purpose } = context;

    let narrative = '';

    // Generate opening based on purpose
    if (purpose === 'threat-assessment') {
      narrative += this.generateThreatAssessmentOpening(data);
    } else if (purpose === 'trend-analysis') {
      narrative += this.generateTrendAnalysisOpening(data);
    } else if (purpose === 'executive-summary') {
      narrative += this.generateExecutiveSummaryOpening(data);
    }

    return {
      text: narrative,
      confidence: 0.85,
      sources: data.sources || [],
      metadata: {
        generatedAt: new Date().toISOString(),
        tone,
        purpose
      }
    };
  }

  /**
   * Generate threat assessment opening
   */
  private generateThreatAssessmentOpening(data: Record<string, any>): string {
    const actor = data.threatActor || 'Unknown Actor';
    const severity = data.severity || 'moderate';

    return `This assessment evaluates the ${severity} threat posed by ${actor}. ` +
           `Based on recent intelligence, this actor demonstrates ${data.capability || 'various capabilities'} ` +
           `and has shown intent to target ${data.targets?.join(', ') || 'multiple sectors'}.`;
  }

  /**
   * Generate trend analysis opening
   */
  private generateTrendAnalysisOpening(data: Record<string, any>): string {
    const trend = data.trend || 'activity';
    const direction = data.direction || 'increasing';
    const period = data.period || 'recent';

    return `Analysis of ${period} data indicates ${direction} trends in ${trend}. ` +
           `This pattern suggests ${data.implications || 'significant developments'} ` +
           `that warrant continued monitoring.`;
  }

  /**
   * Generate executive summary opening
   */
  private generateExecutiveSummaryOpening(data: Record<string, any>): string {
    const keyPoints = data.keyPoints || [];
    const priority = data.priority || 'medium';

    let summary = `This ${priority} priority report summarizes `;

    if (keyPoints.length > 0) {
      summary += `${keyPoints.length} key findings regarding ${data.subject || 'current operations'}.`;
    } else {
      summary += `critical intelligence on ${data.subject || 'current operations'}.`;
    }

    return summary;
  }

  /**
   * Generate findings from data
   */
  async generateFindings(
    data: Record<string, any>,
    maxFindings: number = 5
  ): Promise<string[]> {
    const findings: string[] = [];

    // Extract significant data points
    if (data.events && Array.isArray(data.events)) {
      findings.push(`Analysis identified ${data.events.length} significant events during the reporting period.`);
    }

    if (data.trends && Array.isArray(data.trends)) {
      for (const trend of data.trends.slice(0, maxFindings - findings.length)) {
        findings.push(`Observed ${trend.direction || 'notable'} trend in ${trend.category || 'activity'}.`);
      }
    }

    if (data.anomalies && Array.isArray(data.anomalies)) {
      findings.push(`Detected ${data.anomalies.length} anomalous patterns requiring further investigation.`);
    }

    return findings.slice(0, maxFindings);
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(
    data: Record<string, any>,
    context: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Generate contextual recommendations
    if (data.threats && Array.isArray(data.threats) && data.threats.length > 0) {
      recommendations.push('Enhance monitoring of identified threat actors and their known infrastructure.');
      recommendations.push('Implement additional security controls to mitigate identified vulnerabilities.');
    }

    if (data.gaps && Array.isArray(data.gaps) && data.gaps.length > 0) {
      recommendations.push('Address intelligence gaps through targeted collection efforts.');
    }

    if (data.urgency === 'high') {
      recommendations.push('Prioritize immediate action on critical findings identified in this assessment.');
    }

    recommendations.push('Continue monitoring for changes in threat landscape and update assessments accordingly.');

    return recommendations;
  }

  /**
   * Generate trend description
   */
  generateTrendDescription(
    dataPoints: Array<{ date: Date; value: number }>,
    metric: string
  ): string {
    if (dataPoints.length < 2) {
      return `Insufficient data to determine ${metric} trend.`;
    }

    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const change = ((last - first) / first) * 100;

    let direction = 'remained stable';
    if (change > 10) direction = 'increased significantly';
    else if (change > 5) direction = 'increased moderately';
    else if (change < -10) direction = 'decreased significantly';
    else if (change < -5) direction = 'decreased moderately';

    return `The ${metric} has ${direction} over the reporting period, ` +
           `with a ${Math.abs(change).toFixed(1)}% change from baseline.`;
  }

  /**
   * Generate anomaly description
   */
  generateAnomalyDescription(anomaly: {
    type: string;
    severity: string;
    timestamp: Date;
    description?: string;
  }): string {
    const severity = anomaly.severity.toUpperCase();
    return `[${severity}] ${anomaly.type} anomaly detected on ${anomaly.timestamp.toISOString().split('T')[0]}. ` +
           (anomaly.description || 'Further investigation recommended.');
  }
}
