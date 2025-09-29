// Cost Guardrails Downshift Ladder - GA Cutover Sprint 26
// Automated cost management with graceful degradation

import { EventEmitter } from 'events';
import { PrometheusApi } from '@prometheus-io/client';
import { KubernetesApi, V1Deployment, V1ConfigMap } from '@kubernetes/client-node';

export interface BudgetLimits {
  infrastructure_monthly: number;
  llm_monthly: number;
  observability_monthly: number;
  storage_monthly: number;
  network_monthly: number;
  total_monthly: number;

  alert_thresholds: {
    warning: number;     // 0.80 = 80%
    critical: number;    // 0.90 = 90%
    emergency: number;   // 0.95 = 95%
  };
}

export interface DownshiftRule {
  trigger_condition: string;
  action: string;
  rate_limit?: number;
  allowed_paths?: string[];
  description: string;
  priority: number;
}

export interface CostMetrics {
  infrastructure_utilization: number;
  llm_utilization: number;
  observability_utilization: number;
  total_utilization: number;
  daily_burn_rate: number;
  forecast_monthly: number;
}

export class CostDownshiftLadder extends EventEmitter {
  private prometheus: PrometheusApi;
  private k8s: KubernetesApi;
  private budgetLimits: BudgetLimits;
  private downshiftRules: DownshiftRule[];
  private currentMode: string = 'normal';
  private activeDownshifts: Set<string> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();

    this.budgetLimits = {
      infrastructure_monthly: 18000, // $18k/month
      llm_monthly: 5000,             // $5k/month
      observability_monthly: 2000,   // $2k/month
      storage_monthly: 3000,         // $3k/month
      network_monthly: 1000,         // $1k/month
      total_monthly: 25000,          // $25k/month total

      alert_thresholds: {
        warning: 0.80,   // 80%
        critical: 0.90,  // 90%
        emergency: 0.95  // 95%
      }
    };

    this.downshiftRules = [
      {
        trigger_condition: "budget_utilization > 0.90",
        action: "throttle_non_essential",
        rate_limit: 0.7,
        description: "Throttle non-essential requests to 70%",
        priority: 1
      },
      {
        trigger_condition: "emergency_mode == true",
        action: "essential_only",
        allowed_paths: ["/health", "/metrics", "/auth", "/api/v1/auth"],
        description: "Allow only essential endpoints",
        priority: 2
      },
      {
        trigger_condition: "llm_budget_utilization > 0.85",
        action: "throttle_llm_requests",
        rate_limit: 0.5,
        description: "Throttle LLM requests to 50%",
        priority: 3
      },
      {
        trigger_condition: "infrastructure_utilization > 0.85",
        action: "reduce_replicas",
        description: "Scale down non-critical services",
        priority: 4
      },
      {
        trigger_condition: "observability_utilization > 0.85",
        action: "increase_sampling_reduction",
        description: "Increase adaptive sampling to 90% reduction",
        priority: 5
      },
      {
        trigger_condition: "total_utilization > 0.95",
        action: "emergency_mode",
        description: "Enter emergency cost management mode",
        priority: 0
      }
    ];

    this.initializeAPIs();
  }

  private initializeAPIs(): void {
    // Initialize Prometheus API
    this.prometheus = new PrometheusApi({
      endpoint: process.env.PROMETHEUS_URL || 'http://prometheus:9090',
      auth: process.env.PROMETHEUS_TOKEN ? {
        bearer: process.env.PROMETHEUS_TOKEN
      } : undefined
    });

    // Initialize Kubernetes API
    this.k8s = new KubernetesApi();
  }

  async startMonitoring(): Promise<void> {
    console.log('🔍 Starting cost guardrails monitoring...');

    // Initial cost check
    await this.checkCostMetrics();

    // Set up continuous monitoring (every 5 minutes)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkCostMetrics();
      } catch (error) {
        console.error('Cost monitoring error:', error);
        this.emit('monitoring_error', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.emit('monitoring_started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Cost guardrails monitoring stopped');
    this.emit('monitoring_stopped');
  }

  private async checkCostMetrics(): Promise<void> {
    const metrics = await this.getCostMetrics();

    console.log('💰 Current cost metrics:', {
      infrastructure: `${(metrics.infrastructure_utilization * 100).toFixed(1)}%`,
      llm: `${(metrics.llm_utilization * 100).toFixed(1)}%`,
      total: `${(metrics.total_utilization * 100).toFixed(1)}%`,
      mode: this.currentMode
    });

    // Check if we need to trigger downshift actions
    await this.evaluateDownshiftRules(metrics);

    // Emit metrics for monitoring
    this.emit('cost_metrics_updated', metrics);
  }

  private async getCostMetrics(): Promise<CostMetrics> {
    const queries = {
      infrastructure_utilization: 'intelgraph:budget_utilization_infrastructure',
      llm_utilization: 'intelgraph:budget_utilization_llm',
      observability_utilization: 'intelgraph:budget_utilization_observability',
      total_utilization: 'intelgraph:budget_utilization_total',
      daily_burn_rate: 'intelgraph:total_cost_usd_daily'
    };

    const results: any = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.prometheus.query({
          query,
          time: new Date()
        });

        results[key] = this.extractMetricValue(result);
      } catch (error) {
        console.warn(`Failed to query ${key}:`, error);
        results[key] = 0;
      }
    }

    return {
      infrastructure_utilization: results.infrastructure_utilization || 0,
      llm_utilization: results.llm_utilization || 0,
      observability_utilization: results.observability_utilization || 0,
      total_utilization: results.total_utilization || 0,
      daily_burn_rate: results.daily_burn_rate || 0,
      forecast_monthly: (results.daily_burn_rate || 0) * 30
    };
  }

  private extractMetricValue(result: any): number {
    if (result?.data?.result?.[0]?.value?.[1]) {
      return parseFloat(result.data.result[0].value[1]);
    }
    return 0;
  }

  private async evaluateDownshiftRules(metrics: CostMetrics): Promise<void> {
    // Sort rules by priority (0 = highest priority)
    const sortedRules = [...this.downshiftRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const shouldTrigger = this.evaluateCondition(rule.trigger_condition, metrics);

      if (shouldTrigger && !this.activeDownshifts.has(rule.action)) {
        console.log(`🚨 Triggering downshift action: ${rule.action} - ${rule.description}`);
        await this.executeDownshiftAction(rule);
        this.activeDownshifts.add(rule.action);

        this.emit('downshift_activated', {
          action: rule.action,
          rule: rule,
          metrics: metrics
        });
      } else if (!shouldTrigger && this.activeDownshifts.has(rule.action)) {
        console.log(`✅ Deactivating downshift action: ${rule.action}`);
        await this.deactivateDownshiftAction(rule);
        this.activeDownshifts.delete(rule.action);

        this.emit('downshift_deactivated', {
          action: rule.action,
          rule: rule,
          metrics: metrics
        });
      }
    }
  }

  private evaluateCondition(condition: string, metrics: CostMetrics): boolean {
    // Replace condition variables with actual values
    let evaluationString = condition
      .replace(/budget_utilization/g, metrics.total_utilization.toString())
      .replace(/infrastructure_utilization/g, metrics.infrastructure_utilization.toString())
      .replace(/llm_budget_utilization/g, metrics.llm_utilization.toString())
      .replace(/observability_utilization/g, metrics.observability_utilization.toString())
      .replace(/total_utilization/g, metrics.total_utilization.toString())
      .replace(/emergency_mode/g, (this.currentMode === 'emergency').toString());

    try {
      // Use Function constructor for safe evaluation
      return new Function('return ' + evaluationString)();
    } catch (error) {
      console.error('Error evaluating condition:', condition, error);
      return false;
    }
  }

  private async executeDownshiftAction(rule: DownshiftRule): Promise<void> {
    switch (rule.action) {
      case 'throttle_non_essential':
        await this.throttleNonEssentialRequests(rule.rate_limit || 0.7);
        break;

      case 'essential_only':
        await this.enableEssentialOnlyMode(rule.allowed_paths || []);
        break;

      case 'throttle_llm_requests':
        await this.throttleLLMRequests(rule.rate_limit || 0.5);
        break;

      case 'reduce_replicas':
        await this.scaleDownNonCriticalServices();
        break;

      case 'increase_sampling_reduction':
        await this.increaseSamplingReduction();
        break;

      case 'emergency_mode':
        await this.enterEmergencyMode();
        break;

      default:
        console.warn('Unknown downshift action:', rule.action);
    }
  }

  private async deactivateDownshiftAction(rule: DownshiftRule): Promise<void> {
    switch (rule.action) {
      case 'throttle_non_essential':
        await this.restoreNormalThrottling();
        break;

      case 'essential_only':
        await this.disableEssentialOnlyMode();
        break;

      case 'throttle_llm_requests':
        await this.restoreLLMRequests();
        break;

      case 'reduce_replicas':
        await this.restoreNormalReplicas();
        break;

      case 'increase_sampling_reduction':
        await this.restoreNormalSampling();
        break;

      case 'emergency_mode':
        await this.exitEmergencyMode();
        break;
    }
  }

  private async throttleNonEssentialRequests(rateLimit: number): Promise<void> {
    console.log(`🔧 Throttling non-essential requests to ${(rateLimit * 100).toFixed(0)}%`);

    await this.updateConfigMap('intelgraph-gateway-config', {
      'rate_limit_non_essential': rateLimit.toString(),
      'throttle_mode': 'active'
    });
  }

  private async restoreNormalThrottling(): Promise<void> {
    console.log('🔧 Restoring normal request throttling');

    await this.updateConfigMap('intelgraph-gateway-config', {
      'rate_limit_non_essential': '1.0',
      'throttle_mode': 'normal'
    });
  }

  private async enableEssentialOnlyMode(allowedPaths: string[]): Promise<void> {
    console.log('🔧 Enabling essential-only mode');

    await this.updateConfigMap('intelgraph-gateway-config', {
      'essential_only_mode': 'true',
      'allowed_paths': allowedPaths.join(',')
    });
  }

  private async disableEssentialOnlyMode(): Promise<void> {
    console.log('🔧 Disabling essential-only mode');

    await this.updateConfigMap('intelgraph-gateway-config', {
      'essential_only_mode': 'false',
      'allowed_paths': ''
    });
  }

  private async throttleLLMRequests(rateLimit: number): Promise<void> {
    console.log(`🔧 Throttling LLM requests to ${(rateLimit * 100).toFixed(0)}%`);

    await this.updateConfigMap('llm-service-config', {
      'rate_limit': rateLimit.toString(),
      'throttle_active': 'true'
    });
  }

  private async restoreLLMRequests(): Promise<void> {
    console.log('🔧 Restoring normal LLM request rate');

    await this.updateConfigMap('llm-service-config', {
      'rate_limit': '1.0',
      'throttle_active': 'false'
    });
  }

  private async scaleDownNonCriticalServices(): Promise<void> {
    console.log('🔧 Scaling down non-critical services');

    const nonCriticalServices = [
      'intelgraph-background-jobs',
      'intelgraph-analytics',
      'intelgraph-reporting'
    ];

    for (const serviceName of nonCriticalServices) {
      try {
        await this.scaleDeployment(serviceName, 1); // Scale to 1 replica
      } catch (error) {
        console.warn(`Failed to scale ${serviceName}:`, error);
      }
    }
  }

  private async restoreNormalReplicas(): Promise<void> {
    console.log('🔧 Restoring normal service replicas');

    const serviceReplicas = {
      'intelgraph-background-jobs': 3,
      'intelgraph-analytics': 2,
      'intelgraph-reporting': 2
    };

    for (const [serviceName, replicas] of Object.entries(serviceReplicas)) {
      try {
        await this.scaleDeployment(serviceName, replicas);
      } catch (error) {
        console.warn(`Failed to restore ${serviceName}:`, error);
      }
    }
  }

  private async increaseSamplingReduction(): Promise<void> {
    console.log('🔧 Increasing adaptive sampling to 90% reduction');

    await this.updateConfigMap('adaptive-sampling-config', {
      'target_reduction_percentage': '90',
      'emergency_sampling': 'true'
    });
  }

  private async restoreNormalSampling(): Promise<void> {
    console.log('🔧 Restoring normal adaptive sampling (70% reduction)');

    await this.updateConfigMap('adaptive-sampling-config', {
      'target_reduction_percentage': '70',
      'emergency_sampling': 'false'
    });
  }

  private async enterEmergencyMode(): Promise<void> {
    console.log('🚨 ENTERING EMERGENCY COST MODE');
    this.currentMode = 'emergency';

    // Activate all cost-saving measures
    await Promise.all([
      this.throttleNonEssentialRequests(0.3),
      this.throttleLLMRequests(0.2),
      this.scaleDownNonCriticalServices(),
      this.increaseSamplingReduction()
    ]);

    await this.updateConfigMap('cost-guardrails-config', {
      'emergency_mode': 'true',
      'emergency_activated_at': new Date().toISOString()
    });

    // Send emergency notifications
    this.emit('emergency_mode_activated', {
      timestamp: new Date(),
      reason: 'Budget utilization exceeded 95%'
    });
  }

  private async exitEmergencyMode(): Promise<void> {
    console.log('✅ Exiting emergency cost mode');
    this.currentMode = 'normal';

    // Gradually restore normal operations
    await this.updateConfigMap('cost-guardrails-config', {
      'emergency_mode': 'false',
      'emergency_deactivated_at': new Date().toISOString()
    });

    this.emit('emergency_mode_deactivated', {
      timestamp: new Date()
    });
  }

  private async updateConfigMap(name: string, data: Record<string, string>): Promise<void> {
    try {
      const namespace = process.env.KUBERNETES_NAMESPACE || 'intelgraph';

      // Get current ConfigMap
      const configMap = await this.k8s.readNamespacedConfigMap(name, namespace);

      // Update data
      if (!configMap.body.data) {
        configMap.body.data = {};
      }

      Object.assign(configMap.body.data, data);

      // Apply update
      await this.k8s.replaceNamespacedConfigMap(name, namespace, configMap.body);

      console.log(`✅ Updated ConfigMap ${name}`);
    } catch (error) {
      console.error(`Failed to update ConfigMap ${name}:`, error);
      throw error;
    }
  }

  private async scaleDeployment(name: string, replicas: number): Promise<void> {
    try {
      const namespace = process.env.KUBERNETES_NAMESPACE || 'intelgraph';

      // Get current deployment
      const deployment = await this.k8s.readNamespacedDeployment(name, namespace);

      // Update replica count
      if (deployment.body.spec) {
        deployment.body.spec.replicas = replicas;
      }

      // Apply update
      await this.k8s.replaceNamespacedDeployment(name, namespace, deployment.body);

      console.log(`✅ Scaled ${name} to ${replicas} replicas`);
    } catch (error) {
      console.error(`Failed to scale deployment ${name}:`, error);
      throw error;
    }
  }

  // Public methods for manual control
  async getCurrentCostStatus(): Promise<{
    metrics: CostMetrics;
    mode: string;
    activeDownshifts: string[];
    budgetLimits: BudgetLimits;
  }> {
    const metrics = await this.getCostMetrics();

    return {
      metrics,
      mode: this.currentMode,
      activeDownshifts: Array.from(this.activeDownshifts),
      budgetLimits: this.budgetLimits
    };
  }

  async forceEmergencyMode(): Promise<void> {
    console.log('🚨 Manual emergency mode activation');
    await this.enterEmergencyMode();
  }

  async forceNormalMode(): Promise<void> {
    console.log('🔄 Manual return to normal mode');

    // Deactivate all downshift actions
    for (const action of this.activeDownshifts) {
      const rule = this.downshiftRules.find(r => r.action === action);
      if (rule) {
        await this.deactivateDownshiftAction(rule);
      }
    }

    this.activeDownshifts.clear();
    this.currentMode = 'normal';

    await this.updateConfigMap('cost-guardrails-config', {
      'emergency_mode': 'false',
      'manual_override': 'true',
      'override_timestamp': new Date().toISOString()
    });
  }

  async getBudgetForecast(): Promise<{
    current_utilization: Record<string, number>;
    monthly_forecast: Record<string, number>;
    days_until_limit: Record<string, number>;
    recommendations: string[];
  }> {
    const metrics = await this.getCostMetrics();

    const currentUtilization = {
      infrastructure: metrics.infrastructure_utilization,
      llm: metrics.llm_utilization,
      observability: metrics.observability_utilization,
      total: metrics.total_utilization
    };

    const monthlyForecast = {
      infrastructure: metrics.infrastructure_utilization * this.budgetLimits.infrastructure_monthly,
      llm: metrics.llm_utilization * this.budgetLimits.llm_monthly,
      observability: metrics.observability_utilization * this.budgetLimits.observability_monthly,
      total: metrics.forecast_monthly
    };

    const daysUntilLimit = {
      infrastructure: this.budgetLimits.infrastructure_monthly / (metrics.daily_burn_rate * 0.6), // Assume 60% infra
      llm: this.budgetLimits.llm_monthly / (metrics.daily_burn_rate * 0.2), // Assume 20% LLM
      total: this.budgetLimits.total_monthly / metrics.daily_burn_rate
    };

    const recommendations: string[] = [];

    if (metrics.total_utilization > 0.8) {
      recommendations.push('Consider enabling cost optimization measures');
    }
    if (metrics.llm_utilization > 0.8) {
      recommendations.push('Review LLM usage patterns and optimize token consumption');
    }
    if (metrics.infrastructure_utilization > 0.8) {
      recommendations.push('Evaluate infrastructure scaling policies');
    }
    if (this.activeDownshifts.size > 0) {
      recommendations.push('Currently operating in cost-saving mode');
    }

    return {
      current_utilization: currentUtilization,
      monthly_forecast: monthlyForecast,
      days_until_limit: daysUntilLimit,
      recommendations
    };
  }
}

// CLI interface for cost guardrails
export class CostGuardrailsCLI {
  private costLadder: CostDownshiftLadder;

  constructor() {
    this.costLadder = new CostDownshiftLadder();
  }

  async run(args: string[]): Promise<void> {
    const command = args[0] || 'status';

    switch (command) {
      case 'start':
        await this.costLadder.startMonitoring();
        console.log('Cost guardrails monitoring started');
        break;

      case 'stop':
        this.costLadder.stopMonitoring();
        console.log('Cost guardrails monitoring stopped');
        break;

      case 'status':
        const status = await this.costLadder.getCurrentCostStatus();
        console.log(JSON.stringify(status, null, 2));
        break;

      case 'forecast':
        const forecast = await this.costLadder.getBudgetForecast();
        console.log(JSON.stringify(forecast, null, 2));
        break;

      case 'emergency':
        await this.costLadder.forceEmergencyMode();
        console.log('Emergency mode activated');
        break;

      case 'normal':
        await this.costLadder.forceNormalMode();
        console.log('Normal mode restored');
        break;

      default:
        console.error('Unknown command:', command);
        console.log('Available commands: start, stop, status, forecast, emergency, normal');
        process.exit(1);
    }
  }
}

// Export for use as module or CLI
if (require.main === module) {
  const cli = new CostGuardrailsCLI();
  cli.run(process.argv.slice(2)).catch(console.error);
}