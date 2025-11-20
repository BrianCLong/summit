/**
 * Monitoring Agent
 * Continuously monitors system health and alerts on anomalies
 */

import fetch from 'node-fetch';
import type { AgentRequest, AgentResponse, AgentHealthStatus } from '../src/types';

export interface MonitoringAgentConfig {
  gatewayUrl: string;
  apiKey: string;
  tenantId: string;
  checkIntervalMs: number;
  alertWebhook?: string;
  thresholds: {
    errorRatePercent: number;
    quotaUtilizationPercent: number;
    policyViolationsPerHour: number;
  };
}

export class MonitoringAgent {
  private intervalId?: NodeJS.Timeout;
  private alertsSent: Set<string> = new Set();

  constructor(private config: MonitoringAgentConfig) {}

  /**
   * Start monitoring
   */
  start(): void {
    console.log('🔍 Monitoring Agent: Starting continuous monitoring...');
    console.log(`   Check interval: ${this.config.checkIntervalMs / 1000}s`);
    console.log(`   Thresholds: Error rate ${this.config.thresholds.errorRatePercent}%, ` +
                `Quota ${this.config.thresholds.quotaUtilizationPercent}%, ` +
                `Violations ${this.config.thresholds.policyViolationsPerHour}/hr\n`);

    this.intervalId = setInterval(() => {
      this.runHealthCheck().catch(error => {
        console.error('❌ Health check error:', error.message);
      });
    }, this.config.checkIntervalMs);

    // Run immediately on start
    this.runHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 Monitoring Agent: Stopped');
    }
  }

  /**
   * Run health check
   */
  private async runHealthCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Running health check...`);

    try {
      // Get all agents health
      const request: AgentRequest = {
        agentId: 'monitoring-agent',
        tenantId: this.config.tenantId,
        operationMode: 'DRY_RUN', // Read-only check
        action: {
          type: 'query',
          target: 'agent_health',
          payload: { includeAll: true },
        },
      };

      const response = await this.executeRequest(request);

      if (!response.success) {
        console.error('  ✗ Health check failed:', response.error?.message);
        return;
      }

      const healthData = response.result as any;

      // Analyze health
      this.analyzeHealth(healthData.agents || []);

      console.log('  ✓ Health check completed');
    } catch (error: any) {
      console.error('  ✗ Error:', error.message);
    }
  }

  /**
   * Analyze agent health and send alerts
   */
  private analyzeHealth(agents: AgentHealthStatus[]): void {
    const issues: Array<{ severity: 'warning' | 'critical'; message: string; agentId: string }> = [];

    agents.forEach(agent => {
      // Check error rate
      if (agent.last24Hours.errorRate > this.config.thresholds.errorRatePercent) {
        issues.push({
          severity: agent.last24Hours.errorRate > this.config.thresholds.errorRatePercent * 2 ? 'critical' : 'warning',
          message: `High error rate: ${agent.last24Hours.errorRate.toFixed(1)}%`,
          agentId: agent.agentId,
        });
      }

      // Check quota utilization
      agent.quotas.forEach(quota => {
        const utilization = (quota.used / quota.limit) * 100;
        if (utilization > this.config.thresholds.quotaUtilizationPercent) {
          issues.push({
            severity: utilization > 95 ? 'critical' : 'warning',
            message: `${quota.quotaType} quota at ${utilization.toFixed(1)}%`,
            agentId: agent.agentId,
          });
        }
      });

      // Check alerts from agent
      const criticalAlerts = agent.alerts.filter(a => a.severity === 'critical' || a.severity === 'error');
      if (criticalAlerts.length > 0) {
        issues.push({
          severity: 'critical',
          message: `${criticalAlerts.length} critical alerts`,
          agentId: agent.agentId,
        });
      }

      // Check if agent is unhealthy
      if (agent.health === 'unhealthy') {
        issues.push({
          severity: 'critical',
          message: 'Agent health: unhealthy',
          agentId: agent.agentId,
        });
      }
    });

    // Report issues
    if (issues.length > 0) {
      console.log(`\n  ⚠️  Found ${issues.length} issue(s):`);

      issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : '🟡';
        console.log(`     ${icon} [${issue.agentId.substring(0, 8)}] ${issue.message}`);
      });

      // Send alerts for critical issues
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        this.sendAlerts(criticalIssues);
      }
    } else {
      console.log('  ✅ All agents healthy');
    }

    // Summary
    const healthySummary = {
      total: agents.length,
      healthy: agents.filter(a => a.health === 'healthy').length,
      degraded: agents.filter(a => a.health === 'degraded').length,
      unhealthy: agents.filter(a => a.health === 'unhealthy').length,
    };

    console.log(`\n  📊 Summary: ${healthySummary.healthy}/${healthySummary.total} healthy, ` +
                `${healthySummary.degraded} degraded, ${healthySummary.unhealthy} unhealthy`);
  }

  /**
   * Send alerts via webhook
   */
  private async sendAlerts(issues: Array<{ severity: string; message: string; agentId: string }>): Promise<void> {
    if (!this.config.alertWebhook) {
      return;
    }

    // Deduplicate alerts (don't spam same alert)
    const newIssues = issues.filter(issue => {
      const key = `${issue.agentId}:${issue.message}`;
      if (this.alertsSent.has(key)) {
        return false;
      }
      this.alertsSent.add(key);

      // Clear old alerts after 1 hour
      setTimeout(() => this.alertsSent.delete(key), 60 * 60 * 1000);

      return true;
    });

    if (newIssues.length === 0) {
      return;
    }

    try {
      await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'monitoring-agent',
          issues: newIssues,
          summary: `${newIssues.length} critical issue(s) detected`,
        }),
      });

      console.log(`  📨 Sent ${newIssues.length} alert(s) to webhook`);
    } catch (error: any) {
      console.error(`  ✗ Failed to send alerts: ${error.message}`);
    }
  }

  /**
   * Execute request through gateway
   */
  private async executeRequest<T = unknown>(request: AgentRequest): Promise<AgentResponse<T>> {
    const response = await fetch(`${this.config.gatewayUrl}/api/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gateway request failed: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed metrics for analysis
   */
  async getDetailedMetrics(agentId: string): Promise<any> {
    const request: AgentRequest = {
      agentId: 'monitoring-agent',
      tenantId: this.config.tenantId,
      operationMode: 'DRY_RUN',
      action: {
        type: 'query',
        target: 'agent_metrics',
        payload: {
          agentId,
          period: 'last_24_hours',
          includeHourly: true,
        },
      },
    };

    const response = await this.executeRequest(request);
    return response.result;
  }
}

// ============================================================================
// CLI Runner
// ============================================================================

if (require.main === module) {
  const config: MonitoringAgentConfig = {
    gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3001',
    apiKey: process.env.AGENT_API_KEY || '',
    tenantId: process.env.TENANT_ID || 'default',
    checkIntervalMs: parseInt(process.env.CHECK_INTERVAL || '60000'), // 1 minute default
    alertWebhook: process.env.ALERT_WEBHOOK,
    thresholds: {
      errorRatePercent: parseFloat(process.env.ERROR_RATE_THRESHOLD || '10'),
      quotaUtilizationPercent: parseFloat(process.env.QUOTA_THRESHOLD || '80'),
      policyViolationsPerHour: parseInt(process.env.VIOLATION_THRESHOLD || '10'),
    },
  };

  if (!config.apiKey) {
    console.error('Error: AGENT_API_KEY environment variable is required');
    process.exit(1);
  }

  const agent = new MonitoringAgent(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    agent.stop();
    process.exit(0);
  });

  // Start monitoring
  agent.start();
}

export default MonitoringAgent;
