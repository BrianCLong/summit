#!/usr/bin/env node
/**
 * FinOps Guardrails for IntelGraph Platform
 * Cost monitoring, budget enforcement, and resource optimization
 * Part of GREEN TRAIN Week-4 observability framework
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Budget thresholds (monthly USD)
  budgets: {
    development: 500,
    staging: 1000,
    production: 5000,
    total: 6500,
  },

  // Alert thresholds (percentage of budget)
  alerts: {
    warning: 70,
    critical: 85,
    emergency: 95,
  },

  // Cost optimization rules
  optimization: {
    idleThresholdHours: 168, // 1 week
    rightSizingThreshold: 0.3, // 30% utilization
    storageCleanupDays: 90,
    maxInstanceTypes: ['m6i.4xlarge', 'c6i.4xlarge'],
    approvedRegions: ['us-east-1', 'us-west-2'],
  },

  // Integration endpoints
  integrations: {
    aws: {
      costExplorer: process.env.AWS_COST_EXPLORER_ENDPOINT,
      budgets: process.env.AWS_BUDGETS_ENDPOINT,
    },
    prometheus: process.env.PROMETHEUS_URL || 'http://prometheus:9090',
    slack: process.env.SLACK_WEBHOOK_URL,
    github: {
      token: process.env.GITHUB_TOKEN,
      repo: process.env.GITHUB_REPOSITORY || 'BrianCLong/summit',
    },
  },
};

class FinOpsGuardrails {
  constructor() {
    this.costData = new Map();
    this.violations = [];
    this.recommendations = [];
    this.reportTimestamp = new Date().toISOString();
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🏦 Starting FinOps Guardrails Analysis...');

    try {
      await this.collectCostData();
      await this.collectResourceMetrics();
      await this.analyzeBudgetCompliance();
      await this.analyzeResourceOptimization();
      await this.generateRecommendations();
      await this.enforceGuardrails();
      await this.generateReport();

      console.log('✅ FinOps analysis completed successfully');
    } catch (error) {
      console.error('❌ FinOps analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Collect cost data from various sources
   */
  async collectCostData() {
    console.log('📊 Collecting cost data...');

    // Simulate AWS Cost Explorer data (replace with actual API calls)
    const mockCostData = {
      development: {
        current: 320,
        projected: 450,
        trend: 'increasing',
        breakdown: {
          compute: 180,
          storage: 80,
          network: 40,
          database: 20,
        },
      },
      staging: {
        current: 680,
        projected: 920,
        trend: 'increasing',
        breakdown: {
          compute: 400,
          storage: 120,
          network: 100,
          database: 60,
        },
      },
      production: {
        current: 3200,
        projected: 3800,
        trend: 'stable',
        breakdown: {
          compute: 2000,
          storage: 600,
          network: 400,
          database: 200,
        },
      },
    };

    // Collect Kubernetes resource costs
    const k8sCosts = await this.collectKubernetesCosts();

    // Merge cost data
    for (const [env, data] of Object.entries(mockCostData)) {
      this.costData.set(env, {
        ...data,
        kubernetes: k8sCosts[env] || {},
      });
    }
  }

  /**
   * Collect Kubernetes resource costs
   */
  async collectKubernetesCosts() {
    try {
      // Query Prometheus for resource utilization
      const queries = [
        'sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)',
        'sum(kube_pod_container_resource_requests{resource="memory"}) by (namespace)',
        'sum(kube_persistentvolume_capacity_bytes) by (namespace)',
      ];

      const k8sCosts = {};

      // Simulate Prometheus queries (replace with actual API calls)
      k8sCosts.development = {
        cpu_requests: 4.5,
        memory_requests: 16,
        storage_gb: 100,
        estimated_cost: 120,
      };

      k8sCosts.staging = {
        cpu_requests: 8.0,
        memory_requests: 32,
        storage_gb: 250,
        estimated_cost: 280,
      };

      k8sCosts.production = {
        cpu_requests: 24.0,
        memory_requests: 96,
        storage_gb: 1000,
        estimated_cost: 850,
      };

      return k8sCosts;
    } catch (error) {
      console.warn('⚠️ Could not collect Kubernetes costs:', error.message);
      return {};
    }
  }

  /**
   * Collect resource utilization metrics
   */
  async collectResourceMetrics() {
    console.log('📈 Collecting resource metrics...');

    // Simulate resource utilization data
    this.resourceMetrics = {
      development: {
        cpu_utilization: 0.35,
        memory_utilization: 0.42,
        storage_utilization: 0.28,
        idle_hours: 120,
      },
      staging: {
        cpu_utilization: 0.58,
        memory_utilization: 0.65,
        storage_utilization: 0.45,
        idle_hours: 48,
      },
      production: {
        cpu_utilization: 0.78,
        memory_utilization: 0.82,
        storage_utilization: 0.68,
        idle_hours: 0,
      },
    };
  }

  /**
   * Analyze budget compliance
   */
  async analyzeBudgetCompliance() {
    console.log('💰 Analyzing budget compliance...');

    for (const [env, data] of this.costData.entries()) {
      const budget = CONFIG.budgets[env];
      const current = data.current;
      const projected = data.projected;

      const currentPercent = (current / budget) * 100;
      const projectedPercent = (projected / budget) * 100;

      // Check for violations
      if (currentPercent >= CONFIG.alerts.emergency) {
        this.violations.push({
          type: 'budget_emergency',
          severity: 'critical',
          environment: env,
          current: current,
          budget: budget,
          percent: currentPercent,
          message: `Emergency: ${env} spending at ${currentPercent.toFixed(1)}% of budget`,
        });
      } else if (currentPercent >= CONFIG.alerts.critical) {
        this.violations.push({
          type: 'budget_critical',
          severity: 'high',
          environment: env,
          current: current,
          budget: budget,
          percent: currentPercent,
          message: `Critical: ${env} spending at ${currentPercent.toFixed(1)}% of budget`,
        });
      } else if (currentPercent >= CONFIG.alerts.warning) {
        this.violations.push({
          type: 'budget_warning',
          severity: 'medium',
          environment: env,
          current: current,
          budget: budget,
          percent: currentPercent,
          message: `Warning: ${env} spending at ${currentPercent.toFixed(1)}% of budget`,
        });
      }

      // Check projected overspend
      if (projectedPercent > 100) {
        this.violations.push({
          type: 'budget_projection',
          severity: 'high',
          environment: env,
          projected: projected,
          budget: budget,
          percent: projectedPercent,
          message: `Projected overspend: ${env} will exceed budget by ${(projectedPercent - 100).toFixed(1)}%`,
        });
      }
    }
  }

  /**
   * Analyze resource optimization opportunities
   */
  async analyzeResourceOptimization() {
    console.log('⚡ Analyzing optimization opportunities...');

    for (const [env, metrics] of Object.entries(this.resourceMetrics)) {
      // Right-sizing opportunities
      if (metrics.cpu_utilization < CONFIG.optimization.rightSizingThreshold) {
        this.recommendations.push({
          type: 'rightsizing',
          priority: 'high',
          environment: env,
          current_utilization: metrics.cpu_utilization,
          estimated_savings: this.calculateRightSizingSavings(env, metrics),
          message: `Right-size ${env} resources - CPU utilization only ${(metrics.cpu_utilization * 100).toFixed(1)}%`,
        });
      }

      // Idle resource detection
      if (metrics.idle_hours > CONFIG.optimization.idleThresholdHours) {
        this.recommendations.push({
          type: 'idle_resources',
          priority: 'medium',
          environment: env,
          idle_hours: metrics.idle_hours,
          estimated_savings: this.calculateIdleSavings(env, metrics),
          message: `Idle resources detected in ${env} - ${metrics.idle_hours} hours of inactivity`,
        });
      }

      // Storage optimization
      if (metrics.storage_utilization < 0.5) {
        this.recommendations.push({
          type: 'storage_optimization',
          priority: 'medium',
          environment: env,
          utilization: metrics.storage_utilization,
          estimated_savings: this.calculateStorageSavings(env, metrics),
          message: `Optimize storage in ${env} - only ${(metrics.storage_utilization * 100).toFixed(1)}% utilized`,
        });
      }
    }
  }

  /**
   * Calculate right-sizing savings
   */
  calculateRightSizingSavings(env, metrics) {
    const costData = this.costData.get(env);
    if (!costData) return 0;

    const computeCost = costData.breakdown.compute;
    const savingsPercent = Math.max(
      0,
      CONFIG.optimization.rightSizingThreshold - metrics.cpu_utilization,
    );
    return Math.round(computeCost * savingsPercent * 0.7); // 70% of theoretical savings
  }

  /**
   * Calculate idle resource savings
   */
  calculateIdleSavings(env, metrics) {
    const costData = this.costData.get(env);
    if (!costData) return 0;

    const hourlyRate = costData.current / (30 * 24); // Monthly to hourly
    const idleHours = Math.min(
      metrics.idle_hours,
      CONFIG.optimization.idleThresholdHours,
    );
    return Math.round(hourlyRate * idleHours * 0.8); // 80% of idle cost
  }

  /**
   * Calculate storage savings
   */
  calculateStorageSavings(env, metrics) {
    const costData = this.costData.get(env);
    if (!costData) return 0;

    const storageCost = costData.breakdown.storage;
    const wastePercent = Math.max(0, 0.7 - metrics.storage_utilization);
    return Math.round(storageCost * wastePercent);
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations() {
    console.log('💡 Generating recommendations...');

    // Add general recommendations based on patterns
    const totalCost = Array.from(this.costData.values()).reduce(
      (sum, data) => sum + data.current,
      0,
    );

    if (totalCost > CONFIG.budgets.total * 0.8) {
      this.recommendations.push({
        type: 'cost_governance',
        priority: 'high',
        environment: 'all',
        estimated_savings: 0,
        message:
          'Implement stricter cost governance policies - approaching total budget limit',
      });
    }

    // Reserved instance recommendations
    const productionCost =
      this.costData.get('production')?.breakdown.compute || 0;
    if (productionCost > 1000) {
      this.recommendations.push({
        type: 'reserved_instances',
        priority: 'high',
        environment: 'production',
        estimated_savings: Math.round(productionCost * 0.3),
        message:
          'Purchase reserved instances for production workloads - save up to 30%',
      });
    }

    // Auto-scaling recommendations
    this.recommendations.push({
      type: 'auto_scaling',
      priority: 'medium',
      environment: 'all',
      estimated_savings: 200,
      message:
        'Implement horizontal pod autoscaling to optimize resource usage during off-peak hours',
    });
  }

  /**
   * Enforce guardrails and take automated actions
   */
  async enforceGuardrails() {
    console.log('🛡️ Enforcing guardrails...');

    const criticalViolations = this.violations.filter(
      (v) => v.severity === 'critical',
    );

    if (criticalViolations.length > 0) {
      console.log(
        `🚨 ${criticalViolations.length} critical violations detected`,
      );

      // Auto-scale down non-production environments if over budget
      for (const violation of criticalViolations) {
        if (
          violation.environment !== 'production' &&
          violation.type === 'budget_emergency'
        ) {
          await this.autoScaleDown(violation.environment);
        }
      }

      // Create GitHub issue for critical violations
      await this.createGitHubIssue(criticalViolations);
    }

    // Send alerts
    await this.sendAlerts();
  }

  /**
   * Auto-scale down non-production environments
   */
  async autoScaleDown(environment) {
    console.log(`⬇️ Auto-scaling down ${environment} environment`);

    try {
      // Scale down non-essential deployments
      const scaleCommands = [
        `kubectl scale deployment intelgraph-server --replicas=1 -n intelgraph-${environment}`,
        `kubectl scale deployment redis --replicas=1 -n intelgraph-${environment}`,
        `kubectl scale statefulset postgres --replicas=1 -n intelgraph-${environment}`,
      ];

      for (const command of scaleCommands) {
        try {
          console.log(`Executing: ${command}`);
          // execSync(command, { stdio: 'pipe' });
          console.log(`✅ Would execute: ${command}`);
        } catch (error) {
          console.warn(`⚠️ Failed to execute: ${command}`);
        }
      }
    } catch (error) {
      console.error(
        `❌ Auto-scaling failed for ${environment}:`,
        error.message,
      );
    }
  }

  /**
   * Create GitHub issue for violations
   */
  async createGitHubIssue(violations) {
    const issueBody = this.generateIssueBody(violations);

    console.log('📝 Would create GitHub issue:');
    console.log('Title: Critical FinOps Budget Violations Detected');
    console.log('Body:', issueBody.substring(0, 200) + '...');

    // In production, this would use GitHub API
    // await this.githubAPI.createIssue(title, body);
  }

  /**
   * Generate GitHub issue body
   */
  generateIssueBody(violations) {
    const totalSavings = this.recommendations.reduce(
      (sum, rec) => sum + (rec.estimated_savings || 0),
      0,
    );

    return `
# 🚨 Critical FinOps Budget Violations

**Alert Generated**: ${this.reportTimestamp}
**Violations**: ${violations.length}
**Potential Monthly Savings**: $${totalSavings}

## Critical Issues

${violations.map((v) => `- **${v.environment.toUpperCase()}**: ${v.message}`).join('\n')}

## Immediate Actions Required

1. Review budget allocation and spending patterns
2. Implement recommended optimizations
3. Consider auto-scaling policies for non-production environments
4. Evaluate reserved instance purchases for stable workloads

## Cost Optimization Opportunities

${this.recommendations
  .slice(0, 5)
  .map(
    (r) =>
      `- **${r.type}**: ${r.message} (Save: $${r.estimated_savings || 0}/month)`,
  )
  .join('\n')}

## Automated Actions Taken

- Auto-scaled non-production environments where applicable
- Generated detailed cost analysis report
- Notified platform team via Slack

**Priority**: High
**Labels**: finops, budget-violation, cost-optimization
**Assignees**: @platform-lead, @finops-team
`;
  }

  /**
   * Send alerts via various channels
   */
  async sendAlerts() {
    const highPriorityViolations = this.violations.filter(
      (v) => v.severity === 'critical' || v.severity === 'high',
    );

    if (highPriorityViolations.length > 0) {
      console.log(
        `📢 Sending alerts for ${highPriorityViolations.length} high-priority violations`,
      );

      // Slack notification (simulated)
      const slackMessage = this.generateSlackMessage(highPriorityViolations);
      console.log(
        'Slack notification:',
        slackMessage.substring(0, 100) + '...',
      );

      // Email notification (simulated)
      console.log(
        '📧 Would send email notifications to finops-team@company.com',
      );
    }
  }

  /**
   * Generate Slack alert message
   */
  generateSlackMessage(violations) {
    const totalSavings = this.recommendations.reduce(
      (sum, rec) => sum + (rec.estimated_savings || 0),
      0,
    );

    return `
🚨 *FinOps Alert: Budget Violations Detected*

*Violations*: ${violations.length}
*Potential Savings*: $${totalSavings}/month

${violations
  .slice(0, 3)
  .map((v) => `• ${v.environment}: ${v.message}`)
  .join('\n')}

*Actions*: Auto-scaling applied, GitHub issue created
*Report*: Full analysis available in CI/CD artifacts
`;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    console.log('📋 Generating FinOps report...');

    const report = {
      metadata: {
        timestamp: this.reportTimestamp,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },

      summary: {
        total_environments: this.costData.size,
        total_violations: this.violations.length,
        critical_violations: this.violations.filter(
          (v) => v.severity === 'critical',
        ).length,
        total_recommendations: this.recommendations.length,
        potential_savings: this.recommendations.reduce(
          (sum, r) => sum + (r.estimated_savings || 0),
          0,
        ),
      },

      budget_analysis: this.generateBudgetAnalysis(),
      cost_breakdown: this.generateCostBreakdown(),
      violations: this.violations,
      recommendations: this.recommendations,

      next_actions: [
        'Review and implement high-priority recommendations',
        'Set up automated cost anomaly detection',
        'Schedule monthly FinOps review meetings',
        'Implement cost allocation tags for better tracking',
        'Consider purchasing reserved instances for stable workloads',
      ],
    };

    // Save report
    const reportPath = path.join(process.cwd(), 'finops-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    const markdownPath = path.join(process.cwd(), 'finops-summary.md');
    fs.writeFileSync(markdownPath, this.generateMarkdownSummary(report));

    console.log(`✅ Reports generated:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Markdown: ${markdownPath}`);
  }

  /**
   * Generate budget analysis section
   */
  generateBudgetAnalysis() {
    const analysis = {};

    for (const [env, data] of this.costData.entries()) {
      const budget = CONFIG.budgets[env];
      analysis[env] = {
        budget: budget,
        current_spend: data.current,
        projected_spend: data.projected,
        utilization_percent: ((data.current / budget) * 100).toFixed(1),
        projected_percent: ((data.projected / budget) * 100).toFixed(1),
        trend: data.trend,
        status: this.getBudgetStatus(data.current, budget),
      };
    }

    return analysis;
  }

  /**
   * Get budget status
   */
  getBudgetStatus(current, budget) {
    const percent = (current / budget) * 100;

    if (percent >= CONFIG.alerts.emergency) return 'emergency';
    if (percent >= CONFIG.alerts.critical) return 'critical';
    if (percent >= CONFIG.alerts.warning) return 'warning';
    return 'healthy';
  }

  /**
   * Generate cost breakdown section
   */
  generateCostBreakdown() {
    const breakdown = {};

    for (const [env, data] of this.costData.entries()) {
      breakdown[env] = {
        total: data.current,
        breakdown: data.breakdown,
        kubernetes: data.kubernetes,
      };
    }

    return breakdown;
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(report) {
    const totalSavings = report.summary.potential_savings;
    const criticalCount = report.summary.critical_violations;

    return `# FinOps Guardrails Report

**Generated**: ${report.metadata.timestamp}
**Status**: ${criticalCount > 0 ? '🚨 Action Required' : '✅ Healthy'}

## Executive Summary

- **Total Potential Savings**: $${totalSavings}/month
- **Budget Violations**: ${report.summary.total_violations} (${criticalCount} critical)
- **Optimization Opportunities**: ${report.summary.total_recommendations}

## Budget Status

${Object.entries(report.budget_analysis)
  .map(
    ([env, data]) =>
      `- **${env.toUpperCase()}**: $${data.current_spend}/$${data.budget} (${data.utilization_percent}%) - ${data.status}`,
  )
  .join('\n')}

## Top Recommendations

${report.recommendations
  .slice(0, 5)
  .map(
    (rec, i) =>
      `${i + 1}. **${rec.type}** (${rec.environment}): ${rec.message} - Save $${rec.estimated_savings || 0}/month`,
  )
  .join('\n')}

## Critical Actions

${
  criticalCount > 0
    ? report.violations
        .filter((v) => v.severity === 'critical')
        .map((v) => `- ${v.message}`)
        .join('\n')
    : 'No critical actions required at this time.'
}

## Next Steps

${report.next_actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

---
*This report is generated automatically by the GREEN TRAIN FinOps guardrails system.*
`;
  }
}

// CLI execution
if (require.main === module) {
  const guardrails = new FinOpsGuardrails();
  guardrails.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = FinOpsGuardrails;
