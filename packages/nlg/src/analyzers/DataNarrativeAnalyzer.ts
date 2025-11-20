/**
 * Data-to-narrative analysis and generation
 */

export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-1
  significance: 'low' | 'medium' | 'high';
  narrative: string;
  insights: string[];
}

export class DataNarrativeAnalyzer {
  /**
   * Analyze time series data and generate narrative
   */
  analyzeTrend(data: DataPoint[], metric: string): TrendAnalysis {
    if (data.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        significance: 'low',
        narrative: `Insufficient data to analyze ${metric} trend.`,
        insights: []
      };
    }

    // Sort by timestamp
    const sorted = [...data].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate trend
    const values = sorted.map(d => d.value);
    const slope = this.calculateSlope(values);
    const volatility = this.calculateVolatility(values);

    // Determine direction
    let direction: TrendAnalysis['direction'];
    if (Math.abs(slope) < 0.05) {
      direction = 'stable';
    } else if (volatility > 0.3) {
      direction = 'volatile';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Calculate strength
    const strength = Math.min(Math.abs(slope), 1);

    // Determine significance
    let significance: TrendAnalysis['significance'];
    if (strength > 0.7 || volatility > 0.5) {
      significance = 'high';
    } else if (strength > 0.3 || volatility > 0.2) {
      significance = 'medium';
    } else {
      significance = 'low';
    }

    // Generate narrative
    const narrative = this.generateTrendNarrative(
      metric,
      direction,
      strength,
      significance,
      sorted
    );

    // Generate insights
    const insights = this.generateInsights(sorted, direction, volatility);

    return {
      direction,
      strength,
      significance,
      narrative,
      insights
    };
  }

  /**
   * Calculate slope of trend line
   */
  private calculateSlope(values: number[]): number {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) =>
      sum + (val - mean) ** 2, 0
    ) / values.length;

    const stdDev = Math.sqrt(variance);
    return mean === 0 ? 0 : stdDev / mean;
  }

  /**
   * Generate trend narrative
   */
  private generateTrendNarrative(
    metric: string,
    direction: string,
    strength: number,
    significance: string,
    data: DataPoint[]
  ): string {
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last.value - first.value) / first.value) * 100;

    let narrative = `Analysis of ${metric} shows a ${significance} significance ${direction} trend`;

    if (direction === 'increasing') {
      narrative += ` with a ${change.toFixed(1)}% increase`;
    } else if (direction === 'decreasing') {
      narrative += ` with a ${Math.abs(change).toFixed(1)}% decrease`;
    } else if (direction === 'volatile') {
      narrative += ` with high volatility`;
    }

    narrative += ` over the analyzed period from ${first.timestamp.toISOString().split('T')[0]} `;
    narrative += `to ${last.timestamp.toISOString().split('T')[0]}.`;

    if (strength > 0.7) {
      narrative += ' This trend demonstrates strong momentum and warrants close attention.';
    } else if (strength > 0.3) {
      narrative += ' This moderate trend should be monitored for potential acceleration.';
    }

    return narrative;
  }

  /**
   * Generate insights from data
   */
  private generateInsights(
    data: DataPoint[],
    direction: string,
    volatility: number
  ): string[] {
    const insights: string[] = [];

    // Find peaks and valleys
    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxIdx = values.indexOf(max);
    const minIdx = values.indexOf(min);

    if (max > min * 2) {
      insights.push(
        `Peak activity observed on ${data[maxIdx].timestamp.toISOString().split('T')[0]} ` +
        `with value ${max.toFixed(2)}, significantly above baseline.`
      );
    }

    if (volatility > 0.3) {
      insights.push(
        'High volatility detected, indicating unstable or rapidly changing conditions.'
      );
    }

    // Detect recent acceleration
    if (data.length >= 4) {
      const recentValues = values.slice(-3);
      const olderValues = values.slice(0, -3);
      const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
      const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length;

      if (recentAvg > olderAvg * 1.5) {
        insights.push('Recent acceleration detected in the last few data points.');
      } else if (recentAvg < olderAvg * 0.7) {
        insights.push('Recent deceleration observed, trend may be weakening.');
      }
    }

    return insights;
  }

  /**
   * Compare multiple metrics
   */
  compareMetrics(
    metrics: Array<{ name: string; data: DataPoint[] }>
  ): string {
    const analyses = metrics.map(m => ({
      name: m.name,
      analysis: this.analyzeTrend(m.data, m.name)
    }));

    let narrative = 'Comparative analysis reveals: ';

    const increasing = analyses.filter(a => a.analysis.direction === 'increasing');
    const decreasing = analyses.filter(a => a.analysis.direction === 'decreasing');

    if (increasing.length > 0) {
      narrative += `${increasing.map(a => a.name).join(', ')} showing upward trends. `;
    }

    if (decreasing.length > 0) {
      narrative += `${decreasing.map(a => a.name).join(', ')} showing downward trends. `;
    }

    const highSig = analyses.filter(a => a.analysis.significance === 'high');
    if (highSig.length > 0) {
      narrative += `High significance trends in ${highSig.map(a => a.name).join(', ')} require immediate attention.`;
    }

    return narrative;
  }
}
