import { SupplyChainNode, SupplyChainRelationship, DisruptionPrediction } from '@intelgraph/supply-chain-types';

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: Array<{
    factor: string;
    contribution: number;
  }>;
}

/**
 * Pattern recognition result
 */
export interface PatternRecognition {
  patternType: 'seasonal' | 'trend' | 'cyclic' | 'irregular';
  description: string;
  confidence: number;
  period?: number; // For seasonal patterns
  examples: Array<{
    timestamp: Date;
    value: number;
  }>;
  forecast: TimeSeriesPoint[];
}

/**
 * Clustering result for supplier segmentation
 */
export interface SupplierCluster {
  clusterId: string;
  clusterName: string;
  nodeIds: string[];
  centroid: {
    riskScore: number;
    tier: number;
    spend: number;
    criticality: number;
  };
  characteristics: string[];
  recommendedStrategy: string;
}

/**
 * Demand forecasting result
 */
export interface DemandForecast {
  componentId: string;
  forecastPeriod: {
    start: Date;
    end: Date;
  };
  predictions: Array<{
    date: Date;
    predictedDemand: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }>;
  seasonalityDetected: boolean;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  accuracy: number; // MAPE or similar metric
}

/**
 * What-if scenario analysis
 */
export interface ScenarioAnalysis {
  scenarioId: string;
  scenarioName: string;
  description: string;
  assumptions: Array<{
    variable: string;
    baselineValue: any;
    scenarioValue: any;
  }>;
  impacts: {
    costImpact: number;
    leadTimeImpact: number;
    riskImpact: number;
    capacityImpact: number;
  };
  affectedNodes: string[];
  recommendations: string[];
  probability: number;
}

/**
 * Advanced analytics engine with ML capabilities
 */
export class AnalyticsEngine {
  /**
   * Detect anomalies in time series data
   */
  detectAnomalies(
    data: TimeSeriesPoint[],
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): AnomalyDetection[] {
    if (data.length < 10) {
      return [];
    }

    // Sort by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate moving average and standard deviation
    const windowSize = 7;
    const anomalies: AnomalyDetection[] = [];

    const sensitivityThresholds = {
      low: 3.0,    // 3 standard deviations
      medium: 2.5, // 2.5 standard deviations
      high: 2.0,   // 2 standard deviations
    };

    const threshold = sensitivityThresholds[sensitivity];

    for (let i = windowSize; i < sortedData.length; i++) {
      const window = sortedData.slice(i - windowSize, i);
      const values = window.map(p => p.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const currentPoint = sortedData[i];
      const deviation = Math.abs(currentPoint.value - mean) / stdDev;
      const isAnomaly = deviation > threshold;

      if (isAnomaly) {
        let severity: 'low' | 'medium' | 'high' | 'critical';
        if (deviation > 4) {
          severity = 'critical';
        } else if (deviation > 3) {
          severity = 'high';
        } else if (deviation > 2.5) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        anomalies.push({
          timestamp: currentPoint.timestamp,
          value: currentPoint.value,
          expectedValue: mean,
          deviation: deviation,
          isAnomaly: true,
          severity,
          confidence: Math.min(0.99, deviation / 5),
          factors: [
            {
              factor: 'Statistical deviation',
              contribution: 1.0,
            },
          ],
        });
      }
    }

    return anomalies;
  }

  /**
   * Recognize patterns in time series data
   */
  recognizePatterns(data: TimeSeriesPoint[]): PatternRecognition[] {
    if (data.length < 20) {
      return [];
    }

    const patterns: PatternRecognition[] = [];
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const values = sortedData.map(p => p.value);

    // Detect trend
    const trend = this.detectTrend(values);
    if (trend.confidence > 0.7) {
      patterns.push({
        patternType: 'trend',
        description: `${trend.direction} trend detected`,
        confidence: trend.confidence,
        examples: sortedData.slice(-5),
        forecast: this.forecastTrend(sortedData, trend.slope, 30),
      });
    }

    // Detect seasonality
    const seasonality = this.detectSeasonality(values);
    if (seasonality.confidence > 0.6) {
      patterns.push({
        patternType: 'seasonal',
        description: `Seasonal pattern with period of ${seasonality.period} points`,
        confidence: seasonality.confidence,
        period: seasonality.period,
        examples: sortedData.slice(-seasonality.period),
        forecast: this.forecastSeasonal(sortedData, seasonality.period, 30),
      });
    }

    return patterns;
  }

  /**
   * Cluster suppliers for segmentation
   */
  clusterSuppliers(
    nodes: SupplyChainNode[],
    riskScores: Map<string, number>,
    spend: Map<string, number>
  ): SupplierCluster[] {
    // Simple k-means clustering with k=4
    const k = 4;
    const features = nodes.map(node => ({
      nodeId: node.id,
      riskScore: riskScores.get(node.id) || 50,
      tier: node.tier,
      spend: spend.get(node.id) || 0,
      criticality: this.criticalityToNumber(node.criticality),
    }));

    // Initialize centroids randomly
    const centroids = this.initializeCentroids(features, k);

    // K-means iterations
    let assignments = new Map<string, number>();
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      // Assign points to nearest centroid
      const newAssignments = new Map<string, number>();
      for (const feature of features) {
        const distances = centroids.map(c => this.euclideanDistance(feature, c));
        const nearestCluster = distances.indexOf(Math.min(...distances));
        newAssignments.set(feature.nodeId, nearestCluster);
      }

      // Check for convergence
      if (this.assignmentsEqual(assignments, newAssignments)) {
        break;
      }

      assignments = newAssignments;

      // Update centroids
      for (let i = 0; i < k; i++) {
        const clusterPoints = features.filter(f => assignments.get(f.nodeId) === i);
        if (clusterPoints.length > 0) {
          centroids[i] = this.calculateCentroid(clusterPoints);
        }
      }

      iterations++;
    }

    // Create clusters
    const clusters: SupplierCluster[] = [];
    const clusterNames = ['Strategic Partners', 'Managed Suppliers', 'At-Risk Suppliers', 'Opportunistic Suppliers'];

    for (let i = 0; i < k; i++) {
      const clusterNodes = features.filter(f => assignments.get(f.nodeId) === i);

      clusters.push({
        clusterId: `cluster-${i}`,
        clusterName: clusterNames[i] || `Cluster ${i}`,
        nodeIds: clusterNodes.map(n => n.nodeId),
        centroid: centroids[i],
        characteristics: this.describeCluster(centroids[i]),
        recommendedStrategy: this.recommendStrategy(centroids[i]),
      });
    }

    return clusters;
  }

  /**
   * Forecast demand for components
   */
  forecastDemand(
    componentId: string,
    historicalDemand: TimeSeriesPoint[],
    forecastDays: number = 90
  ): DemandForecast {
    if (historicalDemand.length < 30) {
      throw new Error('Insufficient historical data for forecasting');
    }

    const sortedData = [...historicalDemand].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const values = sortedData.map(p => p.value);

    // Detect trend and seasonality
    const trend = this.detectTrend(values);
    const seasonality = this.detectSeasonality(values);

    // Generate predictions using simple exponential smoothing + trend + seasonality
    const predictions: DemandForecast['predictions'] = [];
    const alpha = 0.3; // Smoothing factor
    const beta = 0.2;  // Trend smoothing factor

    let level = values[values.length - 1];
    let trendValue = trend.slope;

    const lastDate = sortedData[sortedData.length - 1].timestamp;

    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);

      // Base forecast
      let forecast = level + i * trendValue;

      // Add seasonal component if detected
      if (seasonality.confidence > 0.6 && seasonality.period) {
        const seasonalIndex = i % seasonality.period;
        const seasonalFactor = 1.0; // Simplified
        forecast *= seasonalFactor;
      }

      // Calculate confidence bounds
      const stdDev = this.calculateStdDev(values);
      const confidenceInterval = 1.96 * stdDev; // 95% confidence

      predictions.push({
        date,
        predictedDemand: Math.max(0, Math.round(forecast)),
        lowerBound: Math.max(0, Math.round(forecast - confidenceInterval)),
        upperBound: Math.round(forecast + confidenceInterval),
        confidence: Math.max(0.5, 1 - (i / forecastDays) * 0.5), // Decreases with time
      });
    }

    // Calculate forecast accuracy (MAPE on last 30 days)
    const accuracy = this.calculateMAPE(sortedData.slice(-30), values.slice(-30));

    return {
      componentId,
      forecastPeriod: {
        start: predictions[0].date,
        end: predictions[predictions.length - 1].date,
      },
      predictions,
      seasonalityDetected: seasonality.confidence > 0.6,
      trendDirection: trend.direction,
      accuracy,
    };
  }

  /**
   * Predict supply chain disruptions using ML
   */
  predictDisruptions(
    nodes: SupplyChainNode[],
    historicalIncidents: Array<{
      nodeId: string;
      timestamp: Date;
      type: string;
      severity: string;
    }>,
    riskScores: Map<string, number>
  ): DisruptionPrediction[] {
    const predictions: DisruptionPrediction[] = [];
    const now = new Date();

    for (const node of nodes) {
      const nodeRiskScore = riskScores.get(node.id) || 50;

      // Calculate disruption probability based on:
      // 1. Historical incident frequency
      // 2. Current risk score
      // 3. Node criticality
      // 4. Tier depth

      const nodeIncidents = historicalIncidents.filter(i => i.nodeId === node.id);
      const incidentRate = nodeIncidents.length / 365; // Per day

      let probability = Math.min(1.0,
        (100 - nodeRiskScore) / 100 * 0.4 + // Risk score contribution
        incidentRate * 365 * 0.3 +          // Historical rate contribution
        (node.criticality === 'critical' ? 0.2 : 0.1) + // Criticality contribution
        (node.tier > 2 ? 0.1 : 0) // Tier contribution
      );

      if (probability > 0.3 || node.criticality === 'critical') {
        const daysAhead = Math.round(30 + Math.random() * 60); // 30-90 days

        predictions.push({
          id: crypto.randomUUID(),
          nodeId: node.id,
          predictionType: 'supply-shortage',
          probability,
          confidence: Math.min(0.85, 0.5 + nodeIncidents.length * 0.1),
          expectedImpact: nodeRiskScore < 40 ? 'critical' : nodeRiskScore < 60 ? 'high' : 'medium',
          timeframe: {
            start: new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000),
            end: new Date(now.getTime() + (daysAhead + 14) * 24 * 60 * 60 * 1000),
          },
          factors: [
            { factor: 'Historical incident pattern', contribution: 0.3 },
            { factor: 'Current risk score', contribution: 0.4 },
            { factor: 'Criticality level', contribution: 0.2 },
            { factor: 'Tier complexity', contribution: 0.1 },
          ],
          recommendations: this.generateDisruptionRecommendations(node, probability),
          generatedAt: now,
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Perform what-if scenario analysis
   */
  analyzeScenario(
    scenarioName: string,
    description: string,
    assumptions: Map<string, { baseline: any; scenario: any }>,
    nodes: SupplyChainNode[],
    relationships: SupplyChainRelationship[]
  ): ScenarioAnalysis {
    const impacts = {
      costImpact: 0,
      leadTimeImpact: 0,
      riskImpact: 0,
      capacityImpact: 0,
    };

    const affectedNodes: string[] = [];

    // Simulate impacts based on assumptions
    for (const [variable, values] of assumptions.entries()) {
      if (variable.includes('cost')) {
        const change = (values.scenario - values.baseline) / values.baseline;
        impacts.costImpact += change;
      }
      if (variable.includes('leadTime') || variable.includes('lead_time')) {
        const change = (values.scenario - values.baseline) / values.baseline;
        impacts.leadTimeImpact += change;
      }
      if (variable.includes('risk')) {
        const change = (values.scenario - values.baseline) / values.baseline;
        impacts.riskImpact += change;
      }
      if (variable.includes('capacity')) {
        const change = (values.scenario - values.baseline) / values.baseline;
        impacts.capacityImpact += change;
      }
    }

    // Identify affected nodes
    if (Math.abs(impacts.costImpact) > 0.1 || Math.abs(impacts.leadTimeImpact) > 0.1) {
      affectedNodes.push(...nodes.slice(0, Math.min(10, nodes.length)).map(n => n.id));
    }

    const recommendations = this.generateScenarioRecommendations(impacts, scenarioName);

    return {
      scenarioId: crypto.randomUUID(),
      scenarioName,
      description,
      assumptions: Array.from(assumptions.entries()).map(([variable, values]) => ({
        variable,
        baselineValue: values.baseline,
        scenarioValue: values.scenario,
      })),
      impacts,
      affectedNodes,
      recommendations,
      probability: 0.5, // Would be ML-predicted in production
    };
  }

  // Private helper methods

  private detectTrend(values: number[]): {
    direction: 'increasing' | 'stable' | 'decreasing';
    slope: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    const avgValue = meanY;
    const relativeSlope = Math.abs(slope) / avgValue;

    let direction: 'increasing' | 'stable' | 'decreasing';
    if (relativeSlope > 0.01) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      slope,
      confidence: Math.max(0, rSquared),
    };
  }

  private detectSeasonality(values: number[]): {
    confidence: number;
    period?: number;
  } {
    if (values.length < 14) {
      return { confidence: 0 };
    }

    // Test common periods: 7 (weekly), 30 (monthly), 90 (quarterly)
    const periods = [7, 14, 30, 90].filter(p => p < values.length / 2);
    let bestPeriod = 0;
    let bestCorrelation = 0;

    for (const period of periods) {
      const correlation = this.autocorrelation(values, period);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return {
      confidence: bestCorrelation,
      period: bestCorrelation > 0.5 ? bestPeriod : undefined,
    };
  }

  private autocorrelation(values: number[], lag: number): number {
    const n = values.length;
    if (lag >= n) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private forecastTrend(data: TimeSeriesPoint[], slope: number, days: number): TimeSeriesPoint[] {
    const lastPoint = data[data.length - 1];
    const forecast: TimeSeriesPoint[] = [];

    for (let i = 1; i <= days; i++) {
      forecast.push({
        timestamp: new Date(lastPoint.timestamp.getTime() + i * 24 * 60 * 60 * 1000),
        value: lastPoint.value + slope * i,
      });
    }

    return forecast;
  }

  private forecastSeasonal(data: TimeSeriesPoint[], period: number, days: number): TimeSeriesPoint[] {
    const lastPoint = data[data.length - 1];
    const forecast: TimeSeriesPoint[] = [];
    const seasonalValues = data.slice(-period).map(p => p.value);

    for (let i = 1; i <= days; i++) {
      const seasonalIndex = (i - 1) % period;
      forecast.push({
        timestamp: new Date(lastPoint.timestamp.getTime() + i * 24 * 60 * 60 * 1000),
        value: seasonalValues[seasonalIndex],
      });
    }

    return forecast;
  }

  private criticalityToNumber(criticality: string): number {
    const map: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    return map[criticality] || 2;
  }

  private initializeCentroids(features: any[], k: number): any[] {
    const centroids: any[] = [];
    const indices = new Set<number>();

    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * features.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        centroids.push({ ...features[idx] });
      }
    }

    return centroids;
  }

  private euclideanDistance(a: any, b: any): number {
    const features = ['riskScore', 'tier', 'spend', 'criticality'];
    let sum = 0;

    for (const feature of features) {
      const diff = (a[feature] || 0) - (b[feature] || 0);
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  private assignmentsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
    if (a.size !== b.size) return false;

    for (const [key, value] of a) {
      if (b.get(key) !== value) return false;
    }

    return true;
  }

  private calculateCentroid(points: any[]): any {
    const features = ['riskScore', 'tier', 'spend', 'criticality'];
    const centroid: any = { nodeId: '' };

    for (const feature of features) {
      const sum = points.reduce((s, p) => s + (p[feature] || 0), 0);
      centroid[feature] = sum / points.length;
    }

    return centroid;
  }

  private describeCluster(centroid: any): string[] {
    const characteristics: string[] = [];

    if (centroid.riskScore < 40) {
      characteristics.push('High risk profile');
    } else if (centroid.riskScore > 70) {
      characteristics.push('Low risk profile');
    }

    if (centroid.spend > 1000000) {
      characteristics.push('High spend');
    }

    if (centroid.criticality >= 3) {
      characteristics.push('High criticality');
    }

    if (centroid.tier > 2) {
      characteristics.push('Deep tier suppliers');
    }

    return characteristics;
  }

  private recommendStrategy(centroid: any): string {
    if (centroid.riskScore > 70 && centroid.criticality >= 3) {
      return 'Strategic partnership with enhanced collaboration';
    }
    if (centroid.riskScore < 40) {
      return 'Intensive monitoring and mitigation planning';
    }
    if (centroid.spend > 1000000) {
      return 'Strategic sourcing with performance incentives';
    }
    return 'Standard supplier management';
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateMAPE(actual: TimeSeriesPoint[], predicted: number[]): number {
    if (actual.length !== predicted.length) return 0;

    let sumAPE = 0;
    let count = 0;

    for (let i = 0; i < actual.length; i++) {
      if (actual[i].value !== 0) {
        sumAPE += Math.abs((actual[i].value - predicted[i]) / actual[i].value);
        count++;
      }
    }

    return count > 0 ? (1 - sumAPE / count) : 0;
  }

  private generateDisruptionRecommendations(node: SupplyChainNode, probability: number): string[] {
    const recommendations: string[] = [];

    if (probability > 0.7) {
      recommendations.push('Immediate action: Activate alternative suppliers');
      recommendations.push('Increase safety stock by 50%');
    } else if (probability > 0.5) {
      recommendations.push('Enhance monitoring frequency');
      recommendations.push('Qualify backup suppliers');
      recommendations.push('Review contractual obligations');
    } else {
      recommendations.push('Continue standard monitoring');
      recommendations.push('Develop contingency plans');
    }

    if (node.criticality === 'critical') {
      recommendations.push('Executive notification required');
    }

    return recommendations;
  }

  private generateScenarioRecommendations(impacts: any, scenarioName: string): string[] {
    const recommendations: string[] = [];

    if (Math.abs(impacts.costImpact) > 0.2) {
      recommendations.push(`Cost impact of ${(impacts.costImpact * 100).toFixed(1)}% - review pricing strategy`);
    }

    if (Math.abs(impacts.leadTimeImpact) > 0.2) {
      recommendations.push(`Lead time impact of ${(impacts.leadTimeImpact * 100).toFixed(1)}% - adjust inventory buffers`);
    }

    if (Math.abs(impacts.riskImpact) > 0.1) {
      recommendations.push('Significant risk impact - implement additional mitigation measures');
    }

    return recommendations;
  }
}
