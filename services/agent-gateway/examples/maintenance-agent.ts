/**
 * Example Internal Agent: Maintenance Agent
 * AGENT-11: Example of an internal maintenance agent
 *
 * This agent performs routine maintenance tasks:
 * - Cleanup old agent runs
 * - Expire old approval requests
 * - Monitor agent health
 * - Generate daily reports
 */

import fetch from 'node-fetch';
import type { AgentRequest, AgentResponse } from '../src/types';

export interface MaintenanceAgentConfig {
  gatewayUrl: string;
  apiKey: string;
  tenantId: string;
  dryRun: boolean;
}

export class MaintenanceAgent {
  constructor(private config: MaintenanceAgentConfig) {}

  /**
   * Perform daily maintenance tasks
   */
  async runDailyMaintenance(): Promise<void> {
    console.log('🤖 Maintenance Agent: Starting daily maintenance...');

    try {
      // Task 1: Cleanup old runs
      await this.cleanupOldRuns();

      // Task 2: Expire old approvals
      await this.expireOldApprovals();

      // Task 3: Check agent health
      await this.checkAgentHealth();

      // Task 4: Generate report
      await this.generateDailyReport();

      console.log('✅ Maintenance Agent: Daily maintenance completed successfully');
    } catch (error: any) {
      console.error('❌ Maintenance Agent: Error during maintenance:', error);
      throw error;
    }
  }

  /**
   * Cleanup old agent runs (older than 90 days)
   */
  private async cleanupOldRuns(): Promise<void> {
    console.log('  📦 Cleaning up old agent runs...');

    const request: AgentRequest = {
      agentId: 'maintenance-agent',
      tenantId: this.config.tenantId,
      operationMode: this.config.dryRun ? 'SIMULATION' : 'ENFORCED',
      action: {
        type: 'execute',
        target: 'cleanup',
        payload: {
          function: 'cleanup_old_agent_runs',
          daysToKeep: 90,
        },
      },
    };

    const response = await this.executeRequest(request);

    if (response.success) {
      console.log(`    ✓ Cleanup completed: ${JSON.stringify(response.result)}`);
    } else {
      console.log(`    ✗ Cleanup failed: ${response.error?.message}`);
    }
  }

  /**
   * Expire old approval requests
   */
  private async expireOldApprovals(): Promise<void> {
    console.log('  ⏰ Expiring old approval requests...');

    const request: AgentRequest = {
      agentId: 'maintenance-agent',
      tenantId: this.config.tenantId,
      operationMode: this.config.dryRun ? 'SIMULATION' : 'ENFORCED',
      action: {
        type: 'execute',
        target: 'approvals',
        payload: {
          function: 'expire_old_agent_approvals',
        },
      },
    };

    const response = await this.executeRequest(request);

    if (response.success) {
      console.log(`    ✓ Expiration completed: ${JSON.stringify(response.result)}`);
    } else {
      console.log(`    ✗ Expiration failed: ${response.error?.message}`);
    }
  }

  /**
   * Check health of all agents
   */
  private async checkAgentHealth(): Promise<void> {
    console.log('  🏥 Checking agent health...');

    const request: AgentRequest = {
      agentId: 'maintenance-agent',
      tenantId: this.config.tenantId,
      operationMode: 'DRY_RUN', // Just checking, not modifying
      action: {
        type: 'query',
        target: 'agent_health',
        payload: {
          includeMetrics: true,
          includeCertificationStatus: true,
        },
      },
    };

    const response = await this.executeRequest(request);

    if (response.success) {
      console.log('    ✓ Health check completed');
      const result = response.result as any;

      // Log any unhealthy agents
      if (result?.unhealthyAgents?.length > 0) {
        console.log(`    ⚠️  Found ${result.unhealthyAgents.length} unhealthy agents:`);
        result.unhealthyAgents.forEach((agent: any) => {
          console.log(`       - ${agent.name}: ${agent.reason}`);
        });
      } else {
        console.log('    ✓ All agents are healthy');
      }

      // Log agents with expiring certifications
      if (result?.expiringCertifications?.length > 0) {
        console.log(`    ⚠️  ${result.expiringCertifications.length} agents have expiring certifications:`);
        result.expiringCertifications.forEach((agent: any) => {
          console.log(`       - ${agent.name}: expires ${agent.expiresAt}`);
        });
      }
    } else {
      console.log(`    ✗ Health check failed: ${response.error?.message}`);
    }
  }

  /**
   * Generate daily report
   */
  private async generateDailyReport(): Promise<void> {
    console.log('  📊 Generating daily report...');

    const request: AgentRequest = {
      agentId: 'maintenance-agent',
      tenantId: this.config.tenantId,
      operationMode: 'DRY_RUN',
      action: {
        type: 'query',
        target: 'agent_metrics',
        payload: {
          period: 'daily',
          includeStats: true,
        },
      },
    };

    const response = await this.executeRequest(request);

    if (response.success) {
      console.log('    ✓ Report generated');
      const result = response.result as any;

      if (result?.summary) {
        console.log('\n    📈 Daily Summary:');
        console.log(`       Total Runs: ${result.summary.totalRuns}`);
        console.log(`       Success Rate: ${result.summary.successRate}%`);
        console.log(`       Avg Duration: ${result.summary.avgDurationMs}ms`);
        console.log(`       Policy Violations: ${result.summary.policyViolations}`);
        console.log(`       High-Risk Actions: ${result.summary.highRiskActions}`);
      }
    } else {
      console.log(`    ✗ Report generation failed: ${response.error?.message}`);
    }
  }

  /**
   * Execute request through the gateway
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
   * Get agent's own information
   */
  async getAgentInfo(): Promise<any> {
    const response = await fetch(`${this.config.gatewayUrl}/api/agent/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get agent info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check quota status
   */
  async checkQuotas(): Promise<any> {
    const response = await fetch(`${this.config.gatewayUrl}/api/agent/quotas`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check quotas: ${response.statusText}`);
    }

    return response.json();
  }
}

// ============================================================================
// CLI Runner
// ============================================================================

if (require.main === module) {
  const config: MaintenanceAgentConfig = {
    gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3001',
    apiKey: process.env.AGENT_API_KEY || '',
    tenantId: process.env.TENANT_ID || 'default',
    dryRun: process.env.DRY_RUN === 'true',
  };

  if (!config.apiKey) {
    console.error('Error: AGENT_API_KEY environment variable is required');
    process.exit(1);
  }

  const agent = new MaintenanceAgent(config);

  // Run based on command
  const command = process.argv[2] || 'daily';

  (async () => {
    try {
      // Show agent info
      const info = await agent.getAgentInfo();
      console.log(`\n🤖 Running as: ${info.name} (${info.id})`);
      console.log(`   Status: ${info.status}`);
      console.log(`   Mode: ${config.dryRun ? 'DRY_RUN' : 'ENFORCED'}\n`);

      // Check quotas
      const quotas = await agent.checkQuotas();
      const dailyRuns = quotas.find((q: any) => q.quotaType === 'daily_runs');
      if (dailyRuns) {
        console.log(`   Quota: ${dailyRuns.used}/${dailyRuns.limit} daily runs\n`);
      }

      switch (command) {
        case 'daily':
          await agent.runDailyMaintenance();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          console.log('Available commands: daily');
          process.exit(1);
      }
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

export default MaintenanceAgent;
