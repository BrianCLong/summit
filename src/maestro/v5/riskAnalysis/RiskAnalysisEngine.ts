import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { Logger } from '../../utils/logger';
import { MetricsCollector } from '../../observability/MetricsCollector';
import { HistoricalDataService } from './HistoricalDataService';
import { ContextualRiskAssessor } from './ContextualRiskAssessor';
import { RiskPredictor } from './RiskPredictor';

export interface RiskAssessment {
  riskScore: number;
  confidence: number;
  factors: RiskFactor[];
  predictions: RiskPrediction[];
  recommendations: string[];
  timestamp: Date;
  deploymentId: string;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  historicalTrend?: number;
}

export interface RiskPrediction {
  scenario: string;
  probability: number;
  impact: number;
  mitigationStrategies: string[];
  timeframe: string;
}

export interface DeploymentContext {
  serviceId: string;
  version: string;
  environment: string;
  dependencies: string[];
  changeType: 'feature' | 'bugfix' | 'hotfix' | 'rollback';
  codeMetrics: CodeMetrics;
  testCoverage: number;
  previousDeployments: DeploymentHistory[];
}

export interface CodeMetrics {
  linesChanged: number;
  filesModified: number;
  complexity: number;
  duplications: number;
  securityVulnerabilities: number;
  performanceImpact: number;
}

export interface DeploymentHistory {
  id: string;
  timestamp: Date;
  success: boolean;
  rollbackTime?: number;
  errorRate?: number;
  performanceMetrics: Record<string, number>;
}

/**
 * Advanced Risk Analysis Engine for Maestro v5
 *
 * Provides ML-powered risk prediction and assessment with:
 * - Historical data analysis and trend detection
 * - Dynamic risk scoring with contextual awareness
 * - Integration with deployment pipelines and gates
 * - Real-time risk monitoring and alerting
 */
export class RiskAnalysisEngine extends EventEmitter {
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private historicalDataService: HistoricalDataService;
  private contextualAssessor: ContextualRiskAssessor;
  private riskPredictor: RiskPredictor;
  private riskModel: tf.LayersModel | null = null;
  private isInitialized = false;
  private riskThresholds: Record<string, number> = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.95,
  };

  constructor(
    logger: Logger,
    metricsCollector: MetricsCollector,
    historicalDataService: HistoricalDataService,
  ) {
    super();
    this.logger = logger;
    this.metricsCollector = metricsCollector;
    this.historicalDataService = historicalDataService;
    this.contextualAssessor = new ContextualRiskAssessor(logger);
    this.riskPredictor = new RiskPredictor(logger, historicalDataService);
  }

  /**
   * Initialize the Risk Analysis Engine
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Risk Analysis Engine v5...');

      // Load or create ML model
      await this.initializeRiskModel();

      // Initialize sub-components
      await this.contextualAssessor.initialize();
      await this.riskPredictor.initialize();

      // Load historical data for training
      await this.loadHistoricalData();

      this.isInitialized = true;
      this.logger.info('Risk Analysis Engine v5 initialized successfully');

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Risk Analysis Engine:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive risk assessment for a deployment
   */
  async assessDeploymentRisk(
    context: DeploymentContext,
  ): Promise<RiskAssessment> {
    if (!this.isInitialized) {
      throw new Error('Risk Analysis Engine not initialized');
    }

    const startTime = Date.now();
    this.logger.info(
      `Assessing risk for deployment ${context.serviceId}:${context.version}`,
    );

    try {
      // Collect all risk factors
      const riskFactors = await this.collectRiskFactors(context);

      // Get contextual assessment
      const contextualRisk = await this.contextualAssessor.assess(
        context,
        riskFactors,
      );

      // Generate ML predictions
      const predictions = await this.riskPredictor.predict(
        context,
        riskFactors,
      );

      // Calculate overall risk score
      const riskScore = await this.calculateRiskScore(
        riskFactors,
        contextualRisk,
        predictions,
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        riskScore,
        riskFactors,
        predictions,
      );

      const assessment: RiskAssessment = {
        riskScore,
        confidence: this.calculateConfidence(riskFactors, predictions),
        factors: riskFactors,
        predictions,
        recommendations,
        timestamp: new Date(),
        deploymentId: `${context.serviceId}-${context.version}-${Date.now()}`,
      };

      // Record metrics
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordHistogram(
        'risk_analysis_duration_ms',
        processingTime,
      );
      this.metricsCollector.recordGauge('risk_score', riskScore);
      this.metricsCollector.incrementCounter('risk_assessments_total');

      this.logger.info(
        `Risk assessment completed for ${context.serviceId}:${context.version}`,
        {
          riskScore,
          processingTime,
          factorCount: riskFactors.length,
          predictionCount: predictions.length,
        },
      );

      this.emit('assessmentCompleted', assessment);
      return assessment;
    } catch (error) {
      this.logger.error('Risk assessment failed:', error);
      this.metricsCollector.incrementCounter('risk_assessment_errors_total');
      throw error;
    }
  }

  /**
   * Continuous risk monitoring for active deployments
   */
  async startContinuousMonitoring(
    deploymentId: string,
    context: DeploymentContext,
  ): Promise<void> {
    this.logger.info(`Starting continuous risk monitoring for ${deploymentId}`);

    const monitoringInterval = setInterval(async () => {
      try {
        const assessment = await this.assessDeploymentRisk(context);

        // Check for risk threshold violations
        if (assessment.riskScore >= this.riskThresholds.critical) {
          this.emit('criticalRisk', { deploymentId, assessment });
        } else if (assessment.riskScore >= this.riskThresholds.high) {
          this.emit('highRisk', { deploymentId, assessment });
        }

        // Update context with new data
        await this.updateDeploymentContext(deploymentId, context);
      } catch (error) {
        this.logger.error('Continuous monitoring error:', error);
      }
    }, 30000); // Monitor every 30 seconds

    // Store monitoring interval for cleanup
    this.emit('monitoringStarted', { deploymentId, monitoringInterval });
  }

  /**
   * Collect comprehensive risk factors
   */
  private async collectRiskFactors(
    context: DeploymentContext,
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Code complexity factor
    factors.push({
      name: 'code_complexity',
      weight: 0.15,
      value: Math.min(context.codeMetrics.complexity / 100, 1.0),
      impact: this.categorizeImpact(context.codeMetrics.complexity / 100),
      description: 'Code complexity based on cyclomatic complexity metrics',
      historicalTrend: await this.getHistoricalTrend(
        'complexity',
        context.serviceId,
      ),
    });

    // Change magnitude factor
    const changeMagnitude =
      (context.codeMetrics.linesChanged + context.codeMetrics.filesModified) /
      1000;
    factors.push({
      name: 'change_magnitude',
      weight: 0.2,
      value: Math.min(changeMagnitude, 1.0),
      impact: this.categorizeImpact(changeMagnitude),
      description: 'Magnitude of code changes in this deployment',
      historicalTrend: await this.getHistoricalTrend(
        'changes',
        context.serviceId,
      ),
    });

    // Test coverage factor
    const coverageRisk = 1 - context.testCoverage / 100;
    factors.push({
      name: 'test_coverage',
      weight: 0.25,
      value: coverageRisk,
      impact: this.categorizeImpact(coverageRisk),
      description: 'Risk based on test coverage percentage',
      historicalTrend: await this.getHistoricalTrend(
        'coverage',
        context.serviceId,
      ),
    });

    // Historical failure rate
    const failureRate = await this.calculateHistoricalFailureRate(context);
    factors.push({
      name: 'historical_failure_rate',
      weight: 0.3,
      value: failureRate,
      impact: this.categorizeImpact(failureRate),
      description: 'Historical deployment failure rate for this service',
      historicalTrend: await this.getHistoricalTrend(
        'failures',
        context.serviceId,
      ),
    });

    // Dependency risk
    const dependencyRisk = await this.assessDependencyRisk(
      context.dependencies,
    );
    factors.push({
      name: 'dependency_risk',
      weight: 0.1,
      value: dependencyRisk,
      impact: this.categorizeImpact(dependencyRisk),
      description: 'Risk from service dependencies and their stability',
    });

    return factors;
  }

  /**
   * Calculate overall risk score using weighted factors and ML predictions
   */
  private async calculateRiskScore(
    factors: RiskFactor[],
    contextualRisk: number,
    predictions: RiskPrediction[],
  ): Promise<number> {
    // Calculate weighted factor score
    const factorScore = factors.reduce(
      (sum, factor) => sum + factor.value * factor.weight,
      0,
    );

    // Calculate prediction-based risk
    const predictionScore =
      predictions.reduce(
        (sum, pred) => sum + pred.probability * pred.impact,
        0,
      ) / predictions.length;

    // Use ML model if available
    let mlScore = 0;
    if (this.riskModel) {
      try {
        const inputTensor = this.prepareModelInput(factors, contextualRisk);
        const prediction = this.riskModel.predict(inputTensor) as tf.Tensor;
        mlScore = await prediction.data().then((data) => data[0]);
        prediction.dispose();
        inputTensor.dispose();
      } catch (error) {
        this.logger.warn('ML model prediction failed, using fallback:', error);
      }
    }

    // Combine scores with weights
    const combinedScore =
      factorScore * 0.4 +
      contextualRisk * 0.3 +
      predictionScore * 0.2 +
      mlScore * 0.1;

    return Math.min(Math.max(combinedScore, 0), 1);
  }

  /**
   * Generate risk-specific recommendations
   */
  private async generateRecommendations(
    riskScore: number,
    factors: RiskFactor[],
    predictions: RiskPrediction[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (riskScore >= this.riskThresholds.critical) {
      recommendations.push(
        'CRITICAL: Consider postponing deployment until risk factors are addressed',
      );
      recommendations.push(
        'Implement comprehensive rollback plan before deployment',
      );
      recommendations.push('Require manual approval from senior engineer');
    } else if (riskScore >= this.riskThresholds.high) {
      recommendations.push(
        'HIGH RISK: Deploy during low-traffic hours with enhanced monitoring',
      );
      recommendations.push('Prepare automated rollback triggers');
      recommendations.push('Increase monitoring frequency post-deployment');
    } else if (riskScore >= this.riskThresholds.medium) {
      recommendations.push(
        'MEDIUM RISK: Deploy with standard monitoring and canary deployment',
      );
      recommendations.push('Monitor key metrics closely for first hour');
    }

    // Factor-specific recommendations
    factors.forEach((factor) => {
      if (factor.value > 0.7) {
        switch (factor.name) {
          case 'test_coverage':
            recommendations.push('Improve test coverage before deployment');
            break;
          case 'code_complexity':
            recommendations.push('Consider refactoring complex code sections');
            break;
          case 'change_magnitude':
            recommendations.push(
              'Consider breaking change into smaller deployments',
            );
            break;
        }
      }
    });

    // Prediction-based recommendations
    predictions.forEach((prediction) => {
      if (prediction.probability > 0.6) {
        recommendations.push(...prediction.mitigationStrategies);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Initialize or load the ML risk prediction model
   */
  private async initializeRiskModel(): Promise<void> {
    try {
      // Try to load existing model
      this.riskModel = await tf.loadLayersModel(
        'file://./models/risk-prediction/model.json',
      );
      this.logger.info('Loaded existing risk prediction model');
    } catch (error) {
      this.logger.info(
        'No existing model found, creating new risk prediction model',
      );
      await this.createRiskModel();
    }
  }

  /**
   * Create a new ML model for risk prediction
   */
  private async createRiskModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    this.riskModel = model;

    // Train with historical data if available
    await this.trainModel();
  }

  /**
   * Train the ML model with historical data
   */
  private async trainModel(): Promise<void> {
    if (!this.riskModel) return;

    try {
      const historicalData = await this.historicalDataService.getTrainingData();

      if (historicalData.length > 100) {
        const { inputs, labels } = this.prepareTrainingData(historicalData);

        await this.riskModel.fit(inputs, labels, {
          epochs: 50,
          batchSize: 32,
          validationSplit: 0.2,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              if (epoch % 10 === 0) {
                this.logger.info(
                  `Training epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`,
                );
              }
            },
          },
        });

        // Save the trained model
        await this.riskModel.save('file://./models/risk-prediction');
        this.logger.info('Risk prediction model trained and saved');
      }
    } catch (error) {
      this.logger.error('Model training failed:', error);
    }
  }

  /**
   * Prepare training data for the ML model
   */
  private prepareTrainingData(historicalData: any[]): {
    inputs: tf.Tensor;
    labels: tf.Tensor;
  } {
    const inputData: number[][] = [];
    const labelData: number[] = [];

    historicalData.forEach((record) => {
      const input = [
        record.complexity || 0,
        record.linesChanged || 0,
        record.testCoverage || 0,
        record.historicalFailureRate || 0,
        record.dependencyRisk || 0,
        record.environmentRisk || 0,
        record.timeOfDay || 0,
        record.dayOfWeek || 0,
        record.changeType === 'hotfix' ? 1 : 0,
        record.rollbackRequired ? 1 : 0,
      ];

      inputData.push(input);
      labelData.push(record.deploymentFailed ? 1 : 0);
    });

    const inputs = tf.tensor2d(inputData);
    const labels = tf.tensor2d(labelData, [labelData.length, 1]);

    return { inputs, labels };
  }

  /**
   * Prepare input data for model prediction
   */
  private prepareModelInput(
    factors: RiskFactor[],
    contextualRisk: number,
  ): tf.Tensor {
    const input = [
      factors.find((f) => f.name === 'code_complexity')?.value || 0,
      factors.find((f) => f.name === 'change_magnitude')?.value || 0,
      factors.find((f) => f.name === 'test_coverage')?.value || 0,
      factors.find((f) => f.name === 'historical_failure_rate')?.value || 0,
      factors.find((f) => f.name === 'dependency_risk')?.value || 0,
      contextualRisk,
      new Date().getHours() / 24, // Time of day
      new Date().getDay() / 7, // Day of week
      Math.random(), // Placeholder for change type
      Math.random(), // Placeholder for environment
    ];

    return tf.tensor2d([input]);
  }

  /**
   * Categorize impact level based on value
   */
  private categorizeImpact(
    value: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (value >= 0.8) return 'critical';
    if (value >= 0.6) return 'high';
    if (value >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score based on data quality and model performance
   */
  private calculateConfidence(
    factors: RiskFactor[],
    predictions: RiskPrediction[],
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on factor quality
    const factorQuality = factors.reduce((sum, factor) => {
      return sum + (factor.historicalTrend !== undefined ? 0.1 : 0);
    }, 0);

    // Increase confidence based on prediction consistency
    const predictionConsistency =
      predictions.length > 0
        ? 1 -
          (Math.max(...predictions.map((p) => p.probability)) -
            Math.min(...predictions.map((p) => p.probability)))
        : 0;

    confidence += factorQuality + predictionConsistency * 0.3;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Get historical trend for a specific metric
   */
  private async getHistoricalTrend(
    metric: string,
    serviceId: string,
  ): Promise<number> {
    try {
      return await this.historicalDataService.getTrend(metric, serviceId);
    } catch (error) {
      this.logger.warn(`Failed to get historical trend for ${metric}:`, error);
      return 0;
    }
  }

  /**
   * Calculate historical failure rate for the service
   */
  private async calculateHistoricalFailureRate(
    context: DeploymentContext,
  ): Promise<number> {
    if (!context.previousDeployments.length) return 0.5; // Default risk if no history

    const failures = context.previousDeployments.filter(
      (d) => !d.success,
    ).length;
    return failures / context.previousDeployments.length;
  }

  /**
   * Assess risk from service dependencies
   */
  private async assessDependencyRisk(dependencies: string[]): Promise<number> {
    if (!dependencies.length) return 0;

    try {
      let totalRisk = 0;
      for (const dep of dependencies) {
        const depHealth =
          await this.historicalDataService.getDependencyHealth(dep);
        totalRisk += 1 - depHealth;
      }
      return totalRisk / dependencies.length;
    } catch (error) {
      this.logger.warn('Failed to assess dependency risk:', error);
      return 0.3; // Default moderate risk
    }
  }

  /**
   * Load historical data for analysis and model training
   */
  private async loadHistoricalData(): Promise<void> {
    try {
      await this.historicalDataService.initialize();
      this.logger.info('Historical data loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load historical data:', error);
    }
  }

  /**
   * Update deployment context with fresh data
   */
  private async updateDeploymentContext(
    deploymentId: string,
    context: DeploymentContext,
  ): Promise<void> {
    try {
      // Update with real-time metrics
      const realtimeMetrics =
        await this.metricsCollector.getRealtimeMetrics(deploymentId);
      // Update context with new data (implementation depends on metrics structure)
      this.logger.debug(`Updated context for ${deploymentId}`);
    } catch (error) {
      this.logger.warn('Failed to update deployment context:', error);
    }
  }

  /**
   * Get current risk thresholds
   */
  getRiskThresholds(): Record<string, number> {
    return { ...this.riskThresholds };
  }

  /**
   * Update risk thresholds
   */
  updateRiskThresholds(thresholds: Partial<Record<string, number>>): void {
    this.riskThresholds = { ...this.riskThresholds, ...thresholds };
    this.emit('thresholdsUpdated', this.riskThresholds);
  }
}
