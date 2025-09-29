import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  created_at: Date;
  created_by: string;
  
  // Model details
  model_type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection' | 'nlp' | 'computer_vision';
  framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'xgboost' | 'custom';
  algorithm: string;
  
  // Training metadata
  training_data: {
    dataset_name: string;
    dataset_version: string;
    sample_count: number;
    feature_count: number;
    data_hash: string;
    training_period: {
      start: Date;
      end: Date;
    };
  };
  
  // Performance metrics
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    auc_roc?: number;
    mse?: number;
    mae?: number;
    custom_metrics?: Record<string, number>;
  };
  
  // Model artifacts
  artifacts: {
    model_file: string;
    config_file: string;
    weights_file?: string;
    preprocessing_pipeline?: string;
    feature_schema: string;
  };
  
  // Deployment info
  deployment: {
    status: 'development' | 'staging' | 'production' | 'deprecated';
    environment?: string;
    endpoint_url?: string;
    resource_requirements: {
      cpu_cores: number;
      memory_gb: number;
      gpu_required: boolean;
      storage_gb: number;
    };
  };
  
  // Governance
  governance: {
    approval_status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
    approved_at?: Date;
    risk_assessment: 'low' | 'medium' | 'high';
    compliance_tags: string[];
    data_privacy_review: boolean;
    bias_assessment: boolean;
  };
  
  // Monitoring
  monitoring: {
    drift_detection_enabled: boolean;
    performance_monitoring: boolean;
    alert_thresholds: {
      accuracy_drop: number;
      drift_score: number;
      error_rate: number;
      latency_p95_ms: number;
    };
    last_evaluated: Date;
  };
  
  // Model card information
  model_card: {
    intended_use: string;
    limitations: string[];
    ethical_considerations: string[];
    training_data_description: string;
    evaluation_data_description: string;
    quantitative_analyses: Record<string, any>;
    failure_modes: string[];
    fairness_assessment?: Record<string, any>;
  };
}

interface ModelDeployment {
  model_id: string;
  version: string;
  environment: 'staging' | 'production' | 'canary' | 'shadow';
  deployment_id: string;
  deployed_at: Date;
  deployed_by: string;
  traffic_percentage: number;
  status: 'deploying' | 'active' | 'failed' | 'rolled_back';
  endpoint_url: string;
  health_check_url: string;
  rollback_version?: string;
}

interface DriftMonitoringResult {
  model_id: string;
  timestamp: Date;
  drift_score: number;
  drift_type: 'feature' | 'prediction' | 'concept';
  affected_features: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: 'monitor' | 'retrain' | 'rollback' | 'alert';
  details: {
    statistical_tests: Record<string, any>;
    distribution_changes: Record<string, any>;
    performance_degradation: Record<string, number>;
  };
}

/**
 * MLOps Model Registry with Governance and Drift Monitoring
 * Manages model lifecycle, deployment, and performance monitoring
 */
export class ModelRegistry extends EventEmitter {
  private models: Map<string, ModelMetadata> = new Map();
  private deployments: Map<string, ModelDeployment> = new Map();
  private driftResults: Map<string, DriftMonitoringResult[]> = new Map();
  private registryPath: string;
  private shadowEvaluationEnabled = true;

  constructor(registryPath = './models') {
    super();
    this.registryPath = registryPath;
    this.loadExistingModels();
    this.startDriftMonitoring();
  }

  /**
   * Register new model with comprehensive metadata
   */
  async registerModel(metadata: Partial<ModelMetadata>): Promise<ModelMetadata> {
    const modelId = metadata.id || this.generateModelId(metadata.name!, metadata.version!);
    
    const fullMetadata: ModelMetadata = {
      id: modelId,
      name: metadata.name!,
      version: metadata.version!,
      description: metadata.description || '',
      created_at: new Date(),
      created_by: metadata.created_by || 'system',
      model_type: metadata.model_type!,
      framework: metadata.framework!,
      algorithm: metadata.algorithm || 'unknown',
      
      training_data: {
        dataset_name: metadata.training_data?.dataset_name || 'unknown',
        dataset_version: metadata.training_data?.dataset_version || '1.0',
        sample_count: metadata.training_data?.sample_count || 0,
        feature_count: metadata.training_data?.feature_count || 0,
        data_hash: metadata.training_data?.data_hash || this.generateDataHash({}),
        training_period: metadata.training_data?.training_period || {
          start: new Date(),
          end: new Date()
        }
      },
      
      performance: metadata.performance || {},
      artifacts: metadata.artifacts!,
      
      deployment: {
        status: 'development',
        resource_requirements: metadata.deployment?.resource_requirements || {
          cpu_cores: 2,
          memory_gb: 4,
          gpu_required: false,
          storage_gb: 10
        }
      },
      
      governance: {
        approval_status: 'pending',
        risk_assessment: 'medium',
        compliance_tags: metadata.governance?.compliance_tags || [],
        data_privacy_review: false,
        bias_assessment: false
      },
      
      monitoring: {
        drift_detection_enabled: true,
        performance_monitoring: true,
        alert_thresholds: {
          accuracy_drop: 0.05,
          drift_score: 0.3,
          error_rate: 0.1,
          latency_p95_ms: 1000
        },
        last_evaluated: new Date()
      },
      
      model_card: metadata.model_card || {
        intended_use: 'Intelligence analysis support',
        limitations: ['Requires human oversight', 'Performance may vary with data quality'],
        ethical_considerations: ['Potential for bias in training data', 'Privacy implications'],
        training_data_description: 'Historical investigation data',
        evaluation_data_description: 'Held-out test set from recent investigations',
        quantitative_analyses: {},
        failure_modes: ['High false positive rate in edge cases', 'Degraded performance on new threat types']
      }
    };

    // Validate model artifacts
    await this.validateModelArtifacts(fullMetadata);
    
    // Store model metadata
    this.models.set(modelId, fullMetadata);
    await this.persistModel(fullMetadata);
    
    // Emit registration event
    this.emit('model_registered', {
      model_id: modelId,
      name: fullMetadata.name,
      version: fullMetadata.version,
      timestamp: new Date()
    });

    console.log(`Registered model: ${fullMetadata.name} v${fullMetadata.version} (${modelId})`);
    
    return fullMetadata;
  }

  /**
   * Deploy model with shadow/canary/production strategies
   */
  async deployModel(
    modelId: string,
    environment: 'staging' | 'production' | 'canary' | 'shadow',
    options: {
      traffic_percentage?: number;
      deployed_by: string;
      rollback_version?: string;
    }
  ): Promise<ModelDeployment> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Check governance approval for production
    if (environment === 'production' && model.governance.approval_status !== 'approved') {
      throw new Error(`Model ${modelId} not approved for production deployment`);
    }

    const deploymentId = this.generateDeploymentId();
    const deployment: ModelDeployment = {
      model_id: modelId,
      version: model.version,
      environment,
      deployment_id: deploymentId,
      deployed_at: new Date(),
      deployed_by: options.deployed_by,
      traffic_percentage: options.traffic_percentage || (environment === 'shadow' ? 0 : 100),
      status: 'deploying',
      endpoint_url: `https://api.intelgraph.com/models/${deploymentId}/predict`,
      health_check_url: `https://api.intelgraph.com/models/${deploymentId}/health`,
      rollback_version: options.rollback_version
    };

    // Store deployment
    this.deployments.set(deploymentId, deployment);

    // Simulate deployment process
    setTimeout(async () => {
      deployment.status = 'active';
      model.deployment.status = environment === 'production' ? 'production' : 'staging';
      model.deployment.endpoint_url = deployment.endpoint_url;

      this.emit('model_deployed', {
        model_id: modelId,
        deployment_id: deploymentId,
        environment,
        status: 'active'
      });

      // Start shadow evaluation if enabled
      if (environment === 'shadow' && this.shadowEvaluationEnabled) {
        await this.startShadowEvaluation(modelId, deploymentId);
      }

    }, 5000);

    console.log(`Deploying model ${modelId} to ${environment} (${deploymentId})`);
    return deployment;
  }

  /**
   * Start shadow evaluation for A/B testing
   */
  private async startShadowEvaluation(modelId: string, deploymentId: string): Promise<void> {
    const evaluationInterval = 60 * 1000; // 1 minute
    
    const evaluate = async () => {
      try {
        // Simulate shadow evaluation
        const mockResults = {
          timestamp: new Date(),
          shadow_accuracy: 0.85 + Math.random() * 0.1,
          production_accuracy: 0.82 + Math.random() * 0.1,
          shadow_latency: 150 + Math.random() * 100,
          production_latency: 120 + Math.random() * 80,
          sample_size: 100,
          statistical_significance: Math.random() > 0.3
        };

        // Check if shadow model outperforms production
        if (mockResults.shadow_accuracy > mockResults.production_accuracy + 0.03) {
          this.emit('shadow_evaluation_success', {
            model_id: modelId,
            deployment_id: deploymentId,
            improvement: mockResults.shadow_accuracy - mockResults.production_accuracy,
            results: mockResults
          });
        }

        // Store evaluation results
        await this.storeShadowResults(modelId, mockResults);

      } catch (error) {
        console.error(`Shadow evaluation failed for ${modelId}:`, error);
      }
    };

    // Run initial evaluation
    await evaluate();
    
    // Schedule periodic evaluations
    const intervalId = setInterval(evaluate, evaluationInterval);
    
    // Stop after 24 hours
    setTimeout(() => {
      clearInterval(intervalId);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Monitor model drift and performance degradation
   */
  async monitorDrift(modelId: string, recentData: any[]): Promise<DriftMonitoringResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Simulate drift detection analysis
    const driftScore = Math.random() * 0.6; // 0-0.6 range
    const affectedFeatures = this.selectRandomFeatures(['user_behavior', 'network_patterns', 'threat_indicators']);
    
    const driftResult: DriftMonitoringResult = {
      model_id: modelId,
      timestamp: new Date(),
      drift_score: driftScore,
      drift_type: driftScore > 0.4 ? 'concept' : 'feature',
      affected_features: affectedFeatures,
      severity: this.calculateDriftSeverity(driftScore),
      recommended_action: this.recommendDriftAction(driftScore),
      details: {
        statistical_tests: {
          ks_test_pvalue: Math.random(),
          psi_score: driftScore,
          wasserstein_distance: driftScore * 2
        },
        distribution_changes: {
          mean_shift: Math.random() * 0.2,
          variance_change: Math.random() * 0.3,
          skewness_change: Math.random() * 0.15
        },
        performance_degradation: {
          accuracy_drop: driftScore > 0.3 ? driftScore * 0.1 : 0,
          precision_drop: driftScore > 0.3 ? driftScore * 0.08 : 0,
          recall_drop: driftScore > 0.3 ? driftScore * 0.09 : 0
        }
      }
    };

    // Store drift result
    if (!this.driftResults.has(modelId)) {
      this.driftResults.set(modelId, []);
    }
    this.driftResults.get(modelId)!.push(driftResult);

    // Keep only last 100 results per model
    const results = this.driftResults.get(modelId)!;
    if (results.length > 100) {
      results.splice(0, results.length - 100);
    }

    // Update model monitoring timestamp
    model.monitoring.last_evaluated = new Date();

    // Emit drift alert if significant
    if (driftResult.severity === 'high' || driftResult.severity === 'critical') {
      this.emit('drift_alert', {
        model_id: modelId,
        drift_score: driftScore,
        severity: driftResult.severity,
        recommended_action: driftResult.recommended_action,
        affected_features: affectedFeatures
      });
    }

    console.log(`Drift monitoring for ${modelId}: ${driftScore.toFixed(3)} (${driftResult.severity})`);
    return driftResult;
  }

  /**
   * Approve model for production deployment
   */
  async approveModel(
    modelId: string,
    approver: string,
    notes?: string
  ): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    model.governance.approval_status = 'approved';
    model.governance.approved_by = approver;
    model.governance.approved_at = new Date();

    await this.persistModel(model);

    this.emit('model_approved', {
      model_id: modelId,
      approved_by: approver,
      notes,
      timestamp: new Date()
    });

    console.log(`Model ${modelId} approved by ${approver}`);
  }

  /**
   * Rollback model deployment
   */
  async rollbackDeployment(
    deploymentId: string,
    rollbackBy: string,
    reason: string
  ): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const model = this.models.get(deployment.model_id);
    if (!model) {
      throw new Error(`Model ${deployment.model_id} not found`);
    }

    // Update deployment status
    deployment.status = 'rolled_back';
    
    // Restore previous version if specified
    if (deployment.rollback_version) {
      model.deployment.status = 'staging'; // Demote from production
    }

    this.emit('model_rollback', {
      model_id: deployment.model_id,
      deployment_id: deploymentId,
      rolled_back_by: rollbackBy,
      reason,
      timestamp: new Date()
    });

    console.log(`Rolled back deployment ${deploymentId}: ${reason}`);
  }

  /**
   * Get model registry status and statistics
   */
  getRegistryStatus(): {
    total_models: number;
    models_by_status: Record<string, number>;
    models_by_framework: Record<string, number>;
    active_deployments: number;
    models_with_drift_alerts: number;
    pending_approvals: number;
    shadow_evaluations_running: number;
  } {
    const models = Array.from(this.models.values());
    const deployments = Array.from(this.deployments.values());

    const statusCounts = models.reduce((acc, model) => {
      acc[model.deployment.status] = (acc[model.deployment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const frameworkCounts = models.reduce((acc, model) => {
      acc[model.framework] = (acc[model.framework] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const driftAlerts = Array.from(this.driftResults.values())
      .flat()
      .filter(result => result.severity === 'high' || result.severity === 'critical')
      .length;

    const shadowEvaluations = deployments.filter(d => 
      d.environment === 'shadow' && d.status === 'active'
    ).length;

    return {
      total_models: models.length,
      models_by_status: statusCounts,
      models_by_framework: frameworkCounts,
      active_deployments: deployments.filter(d => d.status === 'active').length,
      models_with_drift_alerts: driftAlerts,
      pending_approvals: models.filter(m => m.governance.approval_status === 'pending').length,
      shadow_evaluations_running: shadowEvaluations
    };
  }

  /**
   * Generate model performance report
   */
  generateModelReport(modelId: string): {
    metadata: ModelMetadata;
    deployment_history: ModelDeployment[];
    drift_analysis: DriftMonitoringResult[];
    performance_trends: any;
    recommendations: string[];
  } {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const deploymentHistory = Array.from(this.deployments.values())
      .filter(d => d.model_id === modelId);

    const driftAnalysis = this.driftResults.get(modelId) || [];
    
    const recommendations: string[] = [];
    
    // Analyze recent drift
    const recentDrift = driftAnalysis.slice(-5);
    const avgDriftScore = recentDrift.reduce((sum, r) => sum + r.drift_score, 0) / recentDrift.length;
    
    if (avgDriftScore > 0.3) {
      recommendations.push('Model showing significant drift - consider retraining');
    }
    
    if (model.governance.approval_status === 'pending') {
      recommendations.push('Model pending approval for production deployment');
    }
    
    if (!model.governance.bias_assessment) {
      recommendations.push('Bias assessment recommended before production use');
    }

    const performanceTrends = {
      drift_trend: recentDrift.map(r => ({ timestamp: r.timestamp, score: r.drift_score })),
      deployment_count: deploymentHistory.length,
      average_drift: avgDriftScore,
      last_evaluation: model.monitoring.last_evaluated
    };

    return {
      metadata: model,
      deployment_history: deploymentHistory,
      drift_analysis: driftAnalysis,
      performance_trends: performanceTrends,
      recommendations
    };
  }

  /**
   * Utility methods
   */
  private generateModelId(name: string, version: string): string {
    const content = `${name}-${version}-${Date.now()}`;
    return createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateDataHash(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
  }

  private async validateModelArtifacts(metadata: ModelMetadata): Promise<void> {
    // In production, this would validate that model files exist and are valid
    console.log(`Validating artifacts for model ${metadata.id}`);
  }

  private async persistModel(metadata: ModelMetadata): Promise<void> {
    const filePath = join(this.registryPath, `${metadata.id}.json`);
    writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  }

  private loadExistingModels(): void {
    // In production, this would load models from persistent storage
    console.log('Loading existing models from registry');
  }

  private async storeShadowResults(modelId: string, results: any): Promise<void> {
    // Store shadow evaluation results for comparison
    console.log(`Stored shadow evaluation results for ${modelId}`);
  }

  private startDriftMonitoring(): void {
    // Start periodic drift monitoring for all active models
    setInterval(async () => {
      const activeModels = Array.from(this.models.values())
        .filter(m => m.deployment.status === 'production' && m.monitoring.drift_detection_enabled);

      for (const model of activeModels) {
        try {
          // Simulate monitoring with mock data
          await this.monitorDrift(model.id, []);
        } catch (error) {
          console.error(`Drift monitoring failed for ${model.id}:`, error);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private calculateDriftSeverity(driftScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (driftScore > 0.5) return 'critical';
    if (driftScore > 0.3) return 'high';
    if (driftScore > 0.15) return 'medium';
    return 'low';
  }

  private recommendDriftAction(driftScore: number): 'monitor' | 'retrain' | 'rollback' | 'alert' {
    if (driftScore > 0.4) return 'rollback';
    if (driftScore > 0.25) return 'retrain';
    if (driftScore > 0.15) return 'alert';
    return 'monitor';
  }

  private selectRandomFeatures(features: string[]): string[] {
    const count = Math.floor(Math.random() * features.length) + 1;
    return features.sort(() => 0.5 - Math.random()).slice(0, count);
  }
}

export { ModelRegistry, ModelMetadata, ModelDeployment, DriftMonitoringResult };