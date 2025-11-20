/**
 * Data Quality Agent
 * Validates and improves data quality in the knowledge graph
 */

import fetch from 'node-fetch';
import type { AgentRequest, AgentResponse } from '../src/types';

export interface DataQualityConfig {
  gatewayUrl: string;
  apiKey: string;
  tenantId: string;
  rules: DataQualityRule[];
  autoFix: boolean;
  reportOnly: boolean;
}

export interface DataQualityRule {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (entity: any) => boolean;
  fix?: (entity: any) => any;
}

export class DataQualityAgent {
  constructor(private config: DataQualityConfig) {}

  /**
   * Run data quality check
   */
  async runQualityCheck(): Promise<DataQualityReport> {
    console.log('🔎 Data Quality Agent: Running quality checks...\n');

    const report: DataQualityReport = {
      timestamp: new Date(),
      totalEntities: 0,
      issuesFound: [],
      issuesFixed: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    try {
      // Fetch entities to check
      const entities = await this.fetchEntities();
      report.totalEntities = entities.length;

      console.log(`  Checking ${entities.length} entities against ${this.config.rules.length} rules...\n`);

      // Run each rule
      for (const rule of this.config.rules) {
        console.log(`  📋 Rule: ${rule.name}`);

        const violations = entities.filter(entity => !rule.check(entity));

        if (violations.length > 0) {
          console.log(`     ⚠️  Found ${violations.length} violation(s)`);

          violations.forEach(entity => {
            const issue: DataQualityIssue = {
              entityId: entity.id,
              entityType: entity.type,
              rule: rule.name,
              severity: rule.severity,
              description: rule.description,
              canAutoFix: !!rule.fix,
            };

            report.issuesFound.push(issue);
            report.summary[rule.severity]++;

            // Auto-fix if enabled
            if (this.config.autoFix && rule.fix && !this.config.reportOnly) {
              try {
                const fixed = rule.fix(entity);
                this.applyFix(entity.id, fixed);
                report.issuesFixed.push(issue);
                console.log(`     ✓ Auto-fixed: ${entity.id}`);
              } catch (error: any) {
                console.log(`     ✗ Fix failed: ${error.message}`);
              }
            }
          });
        } else {
          console.log(`     ✓ No violations`);
        }
      }

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 Data Quality Summary');
      console.log('='.repeat(60));
      console.log(`Total Entities Checked: ${report.totalEntities}`);
      console.log(`Issues Found: ${report.issuesFound.length}`);
      console.log(`  🔴 Critical: ${report.summary.critical}`);
      console.log(`  🟠 High: ${report.summary.high}`);
      console.log(`  🟡 Medium: ${report.summary.medium}`);
      console.log(`  🟢 Low: ${report.summary.low}`);

      if (this.config.autoFix) {
        console.log(`Issues Fixed: ${report.issuesFixed.length}`);
      }
      console.log('='.repeat(60) + '\n');

      return report;
    } catch (error: any) {
      console.error('❌ Quality check failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch entities to check
   */
  private async fetchEntities(): Promise<any[]> {
    const request: AgentRequest = {
      agentId: 'data-quality-agent',
      tenantId: this.config.tenantId,
      operationMode: 'DRY_RUN',
      action: {
        type: 'query',
        target: 'entities',
        payload: {
          limit: 1000,
          includeMetadata: true,
        },
      },
    };

    const response = await this.executeRequest(request);

    if (!response.success) {
      throw new Error(`Failed to fetch entities: ${response.error?.message}`);
    }

    return (response.result as any).entities || [];
  }

  /**
   * Apply fix to entity
   */
  private async applyFix(entityId: string, updates: any): Promise<void> {
    const request: AgentRequest = {
      agentId: 'data-quality-agent',
      tenantId: this.config.tenantId,
      operationMode: this.config.reportOnly ? 'SIMULATION' : 'ENFORCED',
      action: {
        type: 'write',
        target: `entities/${entityId}`,
        payload: updates,
      },
    };

    const response = await this.executeRequest(request);

    if (!response.success) {
      throw new Error(`Failed to apply fix: ${response.error?.message}`);
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
   * Generate quality report
   */
  async generateReport(report: DataQualityReport): Promise<string> {
    const lines: string[] = [];

    lines.push('# Data Quality Report');
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push('');
    lines.push('## Summary');
    lines.push(`- Total Entities: ${report.totalEntities}`);
    lines.push(`- Issues Found: ${report.issuesFound.length}`);
    lines.push(`  - Critical: ${report.summary.critical}`);
    lines.push(`  - High: ${report.summary.high}`);
    lines.push(`  - Medium: ${report.summary.medium}`);
    lines.push(`  - Low: ${report.summary.low}`);
    lines.push('');

    if (report.issuesFixed.length > 0) {
      lines.push(`- Issues Fixed: ${report.issuesFixed.length}`);
      lines.push('');
    }

    lines.push('## Issues');
    lines.push('');

    // Group by severity
    const bySeverity = {
      critical: report.issuesFound.filter(i => i.severity === 'critical'),
      high: report.issuesFound.filter(i => i.severity === 'high'),
      medium: report.issuesFound.filter(i => i.severity === 'medium'),
      low: report.issuesFound.filter(i => i.severity === 'low'),
    };

    for (const [severity, issues] of Object.entries(bySeverity)) {
      if (issues.length > 0) {
        lines.push(`### ${severity.toUpperCase()} (${issues.length})`);
        lines.push('');

        issues.forEach(issue => {
          lines.push(`- **${issue.rule}**: ${issue.description}`);
          lines.push(`  - Entity: ${issue.entityId} (${issue.entityType})`);
          if (issue.canAutoFix) {
            lines.push(`  - Auto-fix: Available`);
          }
          lines.push('');
        });
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Pre-defined Quality Rules
// ============================================================================

export const DEFAULT_QUALITY_RULES: DataQualityRule[] = [
  {
    name: 'Missing Required Fields',
    description: 'Entity is missing required fields',
    severity: 'high',
    check: (entity) => {
      return entity.name && entity.type && entity.id;
    },
  },
  {
    name: 'Empty String Fields',
    description: 'Entity has empty string fields',
    severity: 'medium',
    check: (entity) => {
      const stringFields = Object.values(entity).filter(v => typeof v === 'string');
      return !stringFields.some(v => v.trim() === '');
    },
    fix: (entity) => {
      const fixed = { ...entity };
      Object.keys(fixed).forEach(key => {
        if (typeof fixed[key] === 'string' && fixed[key].trim() === '') {
          delete fixed[key];
        }
      });
      return fixed;
    },
  },
  {
    name: 'Duplicate Data',
    description: 'Entity may have duplicate properties',
    severity: 'low',
    check: (entity) => {
      const values = Object.values(entity);
      return values.length === new Set(values).size;
    },
  },
  {
    name: 'Invalid Email Format',
    description: 'Email field has invalid format',
    severity: 'medium',
    check: (entity) => {
      if (!entity.email) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(entity.email);
    },
  },
  {
    name: 'Missing Metadata',
    description: 'Entity is missing important metadata fields',
    severity: 'low',
    check: (entity) => {
      return entity.createdAt && entity.updatedAt;
    },
  },
  {
    name: 'Stale Data',
    description: 'Entity has not been updated recently',
    severity: 'low',
    check: (entity) => {
      if (!entity.updatedAt) return false;
      const daysSinceUpdate = (Date.now() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate < 90; // Less than 90 days
    },
  },
];

// ============================================================================
// Types
// ============================================================================

interface DataQualityReport {
  timestamp: Date;
  totalEntities: number;
  issuesFound: DataQualityIssue[];
  issuesFixed: DataQualityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DataQualityIssue {
  entityId: string;
  entityType: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  canAutoFix: boolean;
}

// ============================================================================
// CLI Runner
// ============================================================================

if (require.main === module) {
  const config: DataQualityConfig = {
    gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3001',
    apiKey: process.env.AGENT_API_KEY || '',
    tenantId: process.env.TENANT_ID || 'default',
    rules: DEFAULT_QUALITY_RULES,
    autoFix: process.env.AUTO_FIX === 'true',
    reportOnly: process.env.REPORT_ONLY === 'true',
  };

  if (!config.apiKey) {
    console.error('Error: AGENT_API_KEY environment variable is required');
    process.exit(1);
  }

  const agent = new DataQualityAgent(config);

  (async () => {
    try {
      const report = await agent.runQualityCheck();

      // Save report if requested
      if (process.env.SAVE_REPORT) {
        const fs = require('fs');
        const markdown = await agent.generateReport(report);
        const filename = `data-quality-report-${Date.now()}.md`;
        fs.writeFileSync(filename, markdown);
        console.log(`\n📄 Report saved to: ${filename}`);
      }

      // Exit with error code if critical issues found
      if (report.summary.critical > 0) {
        console.error('\n❌ Critical data quality issues found');
        process.exit(1);
      }
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

export default DataQualityAgent;
