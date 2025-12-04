/**
 * Provenance Auditor Agent
 *
 * Audits provenance chains for completeness, integrity, and compliance.
 * Generates audit reports and identifies gaps in the decision trail.
 */

import { BaseAgent, type AgentServices } from '../Agent.js';
import type {
  AgentDescriptor,
  TaskInput,
  TaskOutput,
  ProvenanceRecord,
  UUID,
} from '../types.js';

interface ProvenanceAuditorInput {
  action: 'audit_task' | 'audit_agent' | 'audit_timerange' | 'verify_integrity';
  taskId?: UUID;
  agentId?: UUID;
  startTime?: string;
  endTime?: string;
  depth?: 'shallow' | 'deep';
}

interface ProvenanceAuditorOutput {
  auditId: UUID;
  status: 'passed' | 'failed' | 'warnings';
  summary: string;
  findings: AuditFinding[];
  statistics: AuditStatistics;
  recommendations: string[];
}

interface AuditFinding {
  type: 'gap' | 'integrity_violation' | 'policy_violation' | 'anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedRecords: UUID[];
  timestamp?: string;
}

interface AuditStatistics {
  totalRecords: number;
  recordsByType: Record<string, number>;
  timespan: { start: string; end: string };
  agentsInvolved: number;
  modelCalls: number;
  toolCalls: number;
  policyDecisions: number;
}

/**
 * ProvenanceAuditorAgent ensures the integrity and completeness of provenance records.
 */
export class ProvenanceAuditorAgent extends BaseAgent {
  getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'> {
    return {
      name: 'provenance-auditor-agent',
      version: '1.0.0',
      role: 'provenance_auditor',
      riskTier: 'low',
      capabilities: ['provenance_audit', 'integrity_verification', 'chain_analysis'],
      requiredTools: ['provenance_query', 'graph_query'],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.1,
        maxTokens: 4096,
      },
      expectedLatencyMs: 5000,
    };
  }

  async onTaskReceived(
    input: TaskInput<ProvenanceAuditorInput>,
    services: AgentServices
  ): Promise<TaskOutput<ProvenanceAuditorOutput>> {
    const { task, payload } = input;
    const startTime = Date.now();

    services.logger.info('Provenance audit started', { taskId: task.id, action: payload.action });

    try {
      switch (payload.action) {
        case 'audit_task':
          return await this.auditTask(task.id, payload.taskId!, payload.depth, services, startTime);
        case 'verify_integrity':
          return await this.verifyIntegrity(task.id, payload.taskId!, services, startTime);
        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }
    } catch (error) {
      return this.failure(task.id, {
        code: 'AUDIT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  private async auditTask(
    auditTaskId: UUID,
    targetTaskId: UUID,
    depth: 'shallow' | 'deep' = 'shallow',
    services: AgentServices,
    startTime: number
  ): Promise<TaskOutput<ProvenanceAuditorOutput>> {
    // Fetch provenance records
    const records = await services.provenance.query(targetTaskId);

    if (records.length === 0) {
      return this.success(auditTaskId, {
        auditId: crypto.randomUUID(),
        status: 'failed',
        summary: 'No provenance records found for task',
        findings: [{
          type: 'gap',
          severity: 'critical',
          description: 'Task has no provenance trail',
          affectedRecords: [],
        }],
        statistics: this.emptyStatistics(),
        recommendations: ['Ensure provenance logging is enabled for all agents'],
      }, { latencyMs: Date.now() - startTime });
    }

    const findings: AuditFinding[] = [];

    // Check for required record types
    findings.push(...this.checkRequiredRecords(records));

    // Check for temporal gaps
    findings.push(...this.checkTemporalContinuity(records));

    // Check parent-child relationships
    findings.push(...this.checkParentChildLinks(records));

    // Deep analysis using model
    if (depth === 'deep') {
      const modelFindings = await this.deepAnalysis(records, services);
      findings.push(...modelFindings);
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(records);

    // Determine status
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;

    let status: ProvenanceAuditorOutput['status'];
    if (criticalCount > 0) {
      status = 'failed';
    } else if (highCount > 0 || findings.length > 3) {
      status = 'warnings';
    } else {
      status = 'passed';
    }

    const recommendations = await this.generateRecommendations(findings, services);

    return this.success(auditTaskId, {
      auditId: crypto.randomUUID(),
      status,
      summary: `Audit completed: ${findings.length} findings, ${statistics.totalRecords} records analyzed`,
      findings,
      statistics,
      recommendations,
    }, {
      latencyMs: Date.now() - startTime,
      modelCallCount: depth === 'deep' ? 2 : 1,
    });
  }

  private checkRequiredRecords(records: ProvenanceRecord[]): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const types = new Set(records.map((r) => r.type));

    // Every task should have created and either completed or failed
    if (!types.has('task_created')) {
      findings.push({
        type: 'gap',
        severity: 'high',
        description: 'Missing task_created record',
        affectedRecords: [],
      });
    }

    if (!types.has('task_completed') && !types.has('task_failed')) {
      findings.push({
        type: 'gap',
        severity: 'medium',
        description: 'Task has no completion record (may still be running)',
        affectedRecords: [],
      });
    }

    return findings;
  }

  private checkTemporalContinuity(records: ProvenanceRecord[]): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const sorted = [...records].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i].timestamp).getTime() -
        new Date(sorted[i - 1].timestamp).getTime();

      // Flag gaps > 5 minutes as suspicious
      if (gap > 300000) {
        findings.push({
          type: 'gap',
          severity: 'medium',
          description: `${Math.round(gap / 60000)} minute gap in provenance trail`,
          affectedRecords: [sorted[i - 1].id, sorted[i].id],
          timestamp: sorted[i - 1].timestamp,
        });
      }
    }

    return findings;
  }

  private checkParentChildLinks(records: ProvenanceRecord[]): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const recordIds = new Set(records.map((r) => r.id));

    for (const record of records) {
      if (record.parentRecordId && !recordIds.has(record.parentRecordId)) {
        findings.push({
          type: 'integrity_violation',
          severity: 'high',
          description: 'Record references non-existent parent',
          affectedRecords: [record.id],
        });
      }
    }

    return findings;
  }

  private async deepAnalysis(
    records: ProvenanceRecord[],
    services: AgentServices
  ): Promise<AuditFinding[]> {
    const summary = records.map((r) => ({
      type: r.type,
      timestamp: r.timestamp,
      agentId: r.agentId,
    }));

    const prompt = `Analyze this provenance trail for anomalies:

${JSON.stringify(summary, null, 2)}

Look for:
1. Unusual patterns (e.g., same action repeated many times)
2. Missing expected steps
3. Suspicious timing
4. Agent behavior anomalies

Respond with JSON:
{ "findings": [{ "type": "anomaly", "severity": "high|medium|low", "description": "..." }] }

If no issues: { "findings": [] }`;

    const response = await services.model.complete(prompt, { temperature: 0.1 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return (result.findings ?? []).map((f: { severity: string; description: string }) => ({
        type: 'anomaly' as const,
        severity: f.severity as AuditFinding['severity'],
        description: f.description,
        affectedRecords: [],
      }));
    }

    return [];
  }

  private calculateStatistics(records: ProvenanceRecord[]): AuditStatistics {
    const recordsByType: Record<string, number> = {};
    const agents = new Set<string>();

    for (const record of records) {
      recordsByType[record.type] = (recordsByType[record.type] ?? 0) + 1;
      if (record.agentId) {
        agents.add(record.agentId);
      }
    }

    const timestamps = records.map((r) => new Date(r.timestamp).getTime());

    return {
      totalRecords: records.length,
      recordsByType,
      timespan: {
        start: new Date(Math.min(...timestamps)).toISOString(),
        end: new Date(Math.max(...timestamps)).toISOString(),
      },
      agentsInvolved: agents.size,
      modelCalls: recordsByType['model_call'] ?? 0,
      toolCalls: recordsByType['tool_invocation'] ?? 0,
      policyDecisions: recordsByType['policy_decision'] ?? 0,
    };
  }

  private emptyStatistics(): AuditStatistics {
    return {
      totalRecords: 0,
      recordsByType: {},
      timespan: { start: '', end: '' },
      agentsInvolved: 0,
      modelCalls: 0,
      toolCalls: 0,
      policyDecisions: 0,
    };
  }

  private async verifyIntegrity(
    auditTaskId: UUID,
    targetTaskId: UUID,
    services: AgentServices,
    startTime: number
  ): Promise<TaskOutput<ProvenanceAuditorOutput>> {
    const records = await services.provenance.query(targetTaskId);
    const findings: AuditFinding[] = [];

    // Verify payload hashes
    for (const record of records) {
      const computedHash = await this.computeHash(record.payload);
      if (computedHash !== record.payloadHash) {
        findings.push({
          type: 'integrity_violation',
          severity: 'critical',
          description: 'Payload hash mismatch - record may have been tampered with',
          affectedRecords: [record.id],
          timestamp: record.timestamp,
        });
      }
    }

    const status = findings.length === 0 ? 'passed' : 'failed';

    return this.success(auditTaskId, {
      auditId: crypto.randomUUID(),
      status,
      summary: findings.length === 0
        ? 'All records passed integrity verification'
        : `${findings.length} integrity violations detected`,
      findings,
      statistics: this.calculateStatistics(records),
      recommendations: findings.length > 0
        ? ['Investigate integrity violations immediately', 'Review access logs']
        : [],
    }, { latencyMs: Date.now() - startTime });
  }

  private async computeHash(payload: unknown): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async generateRecommendations(
    findings: AuditFinding[],
    services: AgentServices
  ): Promise<string[]> {
    if (findings.length === 0) {
      return ['Provenance trail is complete and valid'];
    }

    const prompt = `Generate 3-5 actionable recommendations for these audit findings:

${findings.map((f) => `- [${f.severity}] ${f.type}: ${f.description}`).join('\n')}

Return as JSON array of strings.`;

    const response = await services.model.complete(prompt, { maxTokens: 500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return ['Review and address identified findings'];
  }
}
