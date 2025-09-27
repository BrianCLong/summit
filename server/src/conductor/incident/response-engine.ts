// Automated Incident Response Engine
// Provides orchestrated response to security and operational incidents

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { prometheusConductorMetrics } from '../observability/prometheus';
import { conductorResilienceManager } from '../resilience/circuit-breaker';
import Redis from 'ioredis';

export interface IncidentContext {
  id: string;
  type: 'security' | 'performance' | 'availability' | 'capacity' | 'compliance';
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  source: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: number;
  correlationId?: string;
}

export interface ResponseAction {
  id: string;
  name: string;
  type: 'isolate' | 'throttle' | 'failover' | 'scale' | 'notify' | 'collect' | 'remediate';
  priority: number;
  timeout: number;
  condition?: (context: IncidentContext) => boolean;
  execute: (context: IncidentContext) => Promise<ActionResult>;
  rollback?: (context: IncidentContext) => Promise<void>;
}

export interface ActionResult {
  success: bool;
  message: string;
  evidence?: any;
  nextActions?: string[];
}

export interface PlaybookDefinition {
  name: string;
  triggers: {
    incidentTypes: string[];
    severityLevels: string[];
    sourcePatterns: string[];
    customConditions?: (context: IncidentContext) => boolean;
  };
  actions: ResponseAction[];
  escalation: {
    timeoutMinutes: number;
    escalationTargets: string[];
    escalationMessage: string;
  };
  containment: {
    autoIsolate: boolean;
    isolationScope: 'user' | 'service' | 'region' | 'system';
    isolationDuration: number;
  };
  evidence: {
    collectLogs: boolean;
    collectMetrics: boolean;
    collectTraces: boolean;
    snapshotSystem: boolean;
  };
}

export interface IncidentRecord {
  id: string;
  context: IncidentContext;
  playbook?: string;
  timeline: Array<{
    timestamp: number;
    event: string;
    action?: string;
    result?: ActionResult;
    actor: 'system' | 'human';
  }>;
  status: 'active' | 'contained' | 'resolved' | 'escalated';
  resolution?: {
    timestamp: number;
    summary: string;
    rootCause: string;
    preventionMeasures: string[];
  };
  evidence: Record<string, any>;
}

export class IncidentResponseEngine extends EventEmitter {
  private playbooks = new Map<string, PlaybookDefinition>();
  private activeIncidents = new Map<string, IncidentRecord>();
  private redis: Redis;
  private responseTimeout = 300000; // 5 minutes

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    this.loadBuiltinPlaybooks();
    this.startCleanupJob();
  }

  /**
   * Register incident and trigger automated response
   */
  async handleIncident(context: IncidentContext): Promise<string> {
    const incidentId = context.id;

    // Create incident record
    const incident: IncidentRecord = {
      id: incidentId,
      context,
      timeline: [
        {
          timestamp: Date.now(),
          event: 'incident_created',
          actor: 'system',
        },
      ],
      status: 'active',
      evidence: {},
    };

    this.activeIncidents.set(incidentId, incident);

    // Find matching playbook
    const playbook = this.findMatchingPlaybook(context);
    if (playbook) {
      incident.playbook = playbook.name;
      this.addTimelineEvent(incident, 'playbook_selected', { playbook: playbook.name });
    }

    // Persist incident
    await this.persistIncident(incident);

    // Start response process
    this.executeResponsePlaybook(incident, playbook);

    // Emit incident event
    this.emit('incident:created', incident);

    return incidentId;
  }

  /**
   * Execute response playbook for incident
   */
  private async executeResponsePlaybook(
    incident: IncidentRecord,
    playbook?: PlaybookDefinition,
  ): Promise<void> {
    if (!playbook) {
      // No playbook found, use default containment
      await this.executeDefaultResponse(incident);
      return;
    }

    this.addTimelineEvent(incident, 'playbook_execution_started');

    try {
      // Immediate containment if required
      if (playbook.containment.autoIsolate) {
        await this.executeContainment(incident, playbook);
      }

      // Evidence collection
      if (playbook.evidence.collectLogs || playbook.evidence.collectMetrics) {
        await this.collectEvidence(incident, playbook);
      }

      // Execute response actions
      const actions = playbook.actions.sort((a, b) => a.priority - b.priority);

      for (const action of actions) {
        if (action.condition && !action.condition(incident.context)) {
          continue;
        }

        await this.executeAction(incident, action);
      }

      // Set up escalation timer
      this.scheduleEscalation(incident, playbook);
    } catch (error) {
      this.addTimelineEvent(incident, 'playbook_execution_failed', { error: error.message });
      await this.escalateIncident(incident, `Playbook execution failed: ${error.message}`);
    }
  }

  /**
   * Execute containment actions
   */
  private async executeContainment(
    incident: IncidentRecord,
    playbook: PlaybookDefinition,
  ): Promise<void> {
    const { isolationScope, isolationDuration } = playbook.containment;

    this.addTimelineEvent(incident, 'containment_initiated', { scope: isolationScope });

    try {
      switch (isolationScope) {
        case 'user':
          await this.isolateUser(incident);
          break;
        case 'service':
          await this.isolateService(incident);
          break;
        case 'region':
          await this.isolateRegion(incident);
          break;
        case 'system':
          await this.isolateSystem(incident);
          break;
      }

      // Schedule containment removal
      setTimeout(() => {
        this.removeContainment(incident);
      }, isolationDuration);

      incident.status = 'contained';
      this.addTimelineEvent(incident, 'containment_successful');
    } catch (error) {
      this.addTimelineEvent(incident, 'containment_failed', { error: error.message });
    }
  }

  /**
   * Collect incident evidence
   */
  private async collectEvidence(
    incident: IncidentRecord,
    playbook: PlaybookDefinition,
  ): Promise<void> {
    this.addTimelineEvent(incident, 'evidence_collection_started');

    try {
      const evidence: Record<string, any> = {};

      if (playbook.evidence.collectLogs) {
        evidence.logs = await this.collectLogs(incident);
      }

      if (playbook.evidence.collectMetrics) {
        evidence.metrics = await this.collectMetrics(incident);
      }

      if (playbook.evidence.collectTraces) {
        evidence.traces = await this.collectTraces(incident);
      }

      if (playbook.evidence.snapshotSystem) {
        evidence.systemSnapshot = await this.createSystemSnapshot(incident);
      }

      incident.evidence = { ...incident.evidence, ...evidence };
      this.addTimelineEvent(incident, 'evidence_collected', { types: Object.keys(evidence) });
    } catch (error) {
      this.addTimelineEvent(incident, 'evidence_collection_failed', { error: error.message });
    }
  }

  /**
   * Execute individual response action
   */
  private async executeAction(incident: IncidentRecord, action: ResponseAction): Promise<void> {
    this.addTimelineEvent(incident, 'action_started', { action: action.name });

    try {
      const result = await Promise.race([
        action.execute(incident.context),
        new Promise<ActionResult>((_, reject) =>
          setTimeout(() => reject(new Error('Action timeout')), action.timeout),
        ),
      ]);

      this.addTimelineEvent(incident, 'action_completed', {
        action: action.name,
        result: result.message,
        success: result.success,
      });

      // Execute follow-up actions if specified
      if (result.nextActions) {
        for (const nextActionId of result.nextActions) {
          const nextAction = this.findActionById(nextActionId);
          if (nextAction) {
            await this.executeAction(incident, nextAction);
          }
        }
      }

      // Record metrics
      prometheusConductorMetrics.recordSecurityEvent('incident_action_executed', result.success);
    } catch (error) {
      this.addTimelineEvent(incident, 'action_failed', {
        action: action.name,
        error: error.message,
      });

      // Attempt rollback if available
      if (action.rollback) {
        try {
          await action.rollback(incident.context);
          this.addTimelineEvent(incident, 'action_rolledback', { action: action.name });
        } catch (rollbackError) {
          this.addTimelineEvent(incident, 'rollback_failed', {
            action: action.name,
            error: rollbackError.message,
          });
        }
      }
    }
  }

  /**
   * User isolation actions
   */
  private async isolateUser(incident: IncidentRecord): Promise<void> {
    const userId = incident.context.metadata.userId;
    if (!userId) return;

    // Revoke user tokens
    await this.redis.setex(
      `isolated_user:${userId}`,
      3600,
      JSON.stringify({
        reason: incident.context.title,
        timestamp: Date.now(),
      }),
    );

    // Force logout
    await this.redis.publish(
      'user_isolation',
      JSON.stringify({
        userId,
        action: 'isolate',
        incidentId: incident.id,
      }),
    );
  }

  /**
   * Service isolation actions
   */
  private async isolateService(incident: IncidentRecord): Promise<void> {
    const serviceName = incident.context.metadata.service;
    if (!serviceName) return;

    // Open circuit breaker for service
    const circuitBreaker = conductorResilienceManager['circuitBreakers'].get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.forceState('OPEN');
    }

    // Update service routing
    await this.redis.setex(
      `isolated_service:${serviceName}`,
      1800,
      JSON.stringify({
        reason: incident.context.title,
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * System-wide isolation
   */
  private async isolateSystem(incident: IncidentRecord): Promise<void> {
    // Enable maintenance mode
    await this.redis.setex(
      'system_maintenance',
      3600,
      JSON.stringify({
        reason: incident.context.title,
        incidentId: incident.id,
        timestamp: Date.now(),
      }),
    );

    // Notify all services
    await this.redis.publish(
      'system_isolation',
      JSON.stringify({
        action: 'maintenance_mode',
        incidentId: incident.id,
      }),
    );
  }

  /**
   * Load built-in response playbooks
   */
  private loadBuiltinPlaybooks(): void {
    // Security breach playbook
    this.registerPlaybook({
      name: 'security_breach',
      triggers: {
        incidentTypes: ['security'],
        severityLevels: ['P0', 'P1'],
        sourcePatterns: ['threat_detection', 'auth_failure', 'data_exfiltration'],
      },
      actions: [
        {
          id: 'isolate_user',
          name: 'Isolate Compromised User',
          type: 'isolate',
          priority: 1,
          timeout: 30000,
          execute: async (context) => {
            if (context.metadata.userId) {
              await this.redis.setex(`compromised_user:${context.metadata.userId}`, 3600, '1');
              return { success: true, message: 'User isolated' };
            }
            return { success: false, message: 'No user to isolate' };
          },
        },
        {
          id: 'collect_forensics',
          name: 'Collect Forensic Evidence',
          type: 'collect',
          priority: 2,
          timeout: 60000,
          execute: async (context) => {
            const evidence = await this.collectSecurityLogs(context);
            return { success: true, message: 'Forensics collected', evidence };
          },
        },
        {
          id: 'notify_security_team',
          name: 'Alert Security Team',
          type: 'notify',
          priority: 3,
          timeout: 10000,
          execute: async (context) => {
            await this.sendSecurityAlert(context);
            return { success: true, message: 'Security team notified' };
          },
        },
      ],
      escalation: {
        timeoutMinutes: 15,
        escalationTargets: ['security-team@company.com', 'ciso@company.com'],
        escalationMessage: 'Critical security incident requires immediate attention',
      },
      containment: {
        autoIsolate: true,
        isolationScope: 'user',
        isolationDuration: 3600000, // 1 hour
      },
      evidence: {
        collectLogs: true,
        collectMetrics: true,
        collectTraces: true,
        snapshotSystem: true,
      },
    });

    // Service degradation playbook
    this.registerPlaybook({
      name: 'service_degradation',
      triggers: {
        incidentTypes: ['performance', 'availability'],
        severityLevels: ['P1', 'P2'],
        sourcePatterns: ['circuit_breaker', 'latency_spike', 'error_rate'],
      },
      actions: [
        {
          id: 'enable_circuit_breaker',
          name: 'Enable Circuit Breaker',
          type: 'throttle',
          priority: 1,
          timeout: 10000,
          execute: async (context) => {
            const service = context.metadata.service;
            if (service) {
              conductorResilienceManager.resetAllCircuits();
              return { success: true, message: 'Circuit breaker enabled' };
            }
            return { success: false, message: 'No service identified' };
          },
        },
        {
          id: 'scale_resources',
          name: 'Auto-scale Resources',
          type: 'scale',
          priority: 2,
          timeout: 120000,
          execute: async (context) => {
            // Implement auto-scaling logic
            return { success: true, message: 'Resources scaled' };
          },
        },
      ],
      escalation: {
        timeoutMinutes: 30,
        escalationTargets: ['devops-team@company.com'],
        escalationMessage: 'Service degradation incident needs attention',
      },
      containment: {
        autoIsolate: false,
        isolationScope: 'service',
        isolationDuration: 1800000, // 30 minutes
      },
      evidence: {
        collectLogs: true,
        collectMetrics: true,
        collectTraces: false,
        snapshotSystem: false,
      },
    });
  }

  /**
   * Find matching playbook for incident
   */
  private findMatchingPlaybook(context: IncidentContext): PlaybookDefinition | undefined {
    for (const playbook of this.playbooks.values()) {
      if (this.playbookMatches(playbook, context)) {
        return playbook;
      }
    }
    return undefined;
  }

  /**
   * Check if playbook matches incident context
   */
  private playbookMatches(playbook: PlaybookDefinition, context: IncidentContext): boolean {
    const { triggers } = playbook;

    // Check incident type
    if (!triggers.incidentTypes.includes(context.type)) {
      return false;
    }

    // Check severity
    if (!triggers.severityLevels.includes(context.severity)) {
      return false;
    }

    // Check source patterns
    const sourceMatches = triggers.sourcePatterns.some((pattern) =>
      context.source.includes(pattern),
    );
    if (!sourceMatches) {
      return false;
    }

    // Check custom conditions
    if (triggers.customConditions && !triggers.customConditions(context)) {
      return false;
    }

    return true;
  }

  /**
   * Register custom playbook
   */
  registerPlaybook(playbook: PlaybookDefinition): void {
    this.playbooks.set(playbook.name, playbook);
  }

  /**
   * Helper methods for evidence collection
   */
  private async collectLogs(incident: IncidentRecord): Promise<any> {
    const { context } = incident;
    const forensicConfig = this.getForensicMetadata(context);
    const lookbackMinutes = this.getPositiveInteger(forensicConfig.lookbackMinutes, 60);
    const windowStart = Date.now() - lookbackMinutes * 60000;
    const sources = this.normalizeStringArray(forensicConfig.logSources, [
      'application',
      'security',
      'infrastructure',
      'network',
      'audit',
    ]);

    const collectorMap = this.normalizeCollectorMap(forensicConfig.collectors?.logs);
    const inlineLogs = this.isPlainObject(forensicConfig.inlineLogs)
      ? (forensicConfig.inlineLogs as Record<string, any>)
      : {};
    const metadataLogs = this.isPlainObject(context.metadata?.logs)
      ? (context.metadata?.logs as Record<string, any>)
      : {};

    const bundles: Array<{
      source: string;
      transport: string;
      count: number;
      sample: any[];
      error?: string;
    }> = [];

    let totalEntries = 0;

    for (const source of sources) {
      const collector = collectorMap[source];
      const fallback = inlineLogs[source] ?? metadataLogs[source];
      const { entries, type, error } = await this.collectFromCollector(
        collector,
        `forensics:${source}:logs`,
        windowStart,
        fallback,
      );

      totalEntries += entries.length;

      bundles.push({
        source,
        transport: type,
        count: entries.length,
        sample: entries.slice(0, Math.min(entries.length, 5)),
        error,
      });
    }

    const sourcesWithData = bundles
      .filter((bundle) => bundle.count > 0)
      .map((bundle) => bundle.source);
    const missingSources = bundles
      .filter((bundle) => bundle.count === 0)
      .map((bundle) => bundle.source);

    return {
      collectedAt: Date.now(),
      lookbackMinutes,
      windowStart,
      totalEntries,
      bundles,
      summary: {
        sourcesWithData,
        missingSources,
      },
    };
  }

  private async collectMetrics(incident: IncidentRecord): Promise<any> {
    const { context } = incident;
    const forensicConfig = this.getForensicMetadata(context);
    const lookbackMinutes = this.getPositiveInteger(forensicConfig.lookbackMinutes, 60);
    const windowStart = Date.now() - lookbackMinutes * 60000;
    const sources = this.normalizeStringArray(forensicConfig.metricSources, [
      'system',
      'application',
      'security',
      'business',
    ]);

    const collectorMap = this.normalizeCollectorMap(forensicConfig.collectors?.metrics);
    const inlineMetrics = this.isPlainObject(forensicConfig.inlineMetrics)
      ? (forensicConfig.inlineMetrics as Record<string, any>)
      : {};
    const metadataMetrics = this.isPlainObject(context.metadata?.metrics)
      ? (context.metadata?.metrics as Record<string, any>)
      : {};

    const metrics: Record<string, any> = {};
    const bundles: Array<{ source: string; transport: string; count: number; error?: string }> = [];

    for (const source of sources) {
      const collector = collectorMap[source];
      const fallback = inlineMetrics[source] ?? metadataMetrics[source];
      const { entries, type, error } = await this.collectFromCollector(
        collector,
        `forensics:${source}:metrics`,
        windowStart,
        fallback,
      );

      const normalized = entries.map((entry) => this.attachMetricContext(entry, source));
      metrics[source] = {
        datapoints: normalized,
        summary: this.summarizeNumericSeries(normalized),
        transport: type,
        error,
      };

      bundles.push({
        source,
        transport: type,
        count: normalized.length,
        error,
      });
    }

    return {
      collectedAt: Date.now(),
      lookbackMinutes,
      windowStart,
      metrics,
      summary: {
        totalDatapoints: Object.values(metrics).reduce(
          (sum, value: any) => sum + (value.datapoints?.length ?? 0),
          0,
        ),
        sources: bundles,
      },
    };
  }

  private async collectTraces(incident: IncidentRecord): Promise<any> {
    const { context } = incident;
    const forensicConfig = this.getForensicMetadata(context);
    const lookbackMinutes = this.getPositiveInteger(forensicConfig.lookbackMinutes, 60);
    const windowStart = Date.now() - lookbackMinutes * 60000;
    const sources = this.normalizeStringArray(forensicConfig.traceSources, [
      'http',
      'database',
      'queue',
      'external',
    ]);

    const collectorMap = this.normalizeCollectorMap(forensicConfig.collectors?.traces);
    const inlineTraces = this.isPlainObject(forensicConfig.inlineTraces)
      ? (forensicConfig.inlineTraces as Record<string, any>)
      : {};
    const metadataTraces = this.isPlainObject(context.metadata?.traces)
      ? (context.metadata?.traces as Record<string, any>)
      : {};

    const traces: Record<string, any> = {};
    const bundles: Array<{ source: string; transport: string; count: number; error?: string }> = [];

    for (const source of sources) {
      const collector = collectorMap[source];
      const fallback = inlineTraces[source] ?? metadataTraces[source];
      const { entries, type, error } = await this.collectFromCollector(
        collector,
        `forensics:${source}:traces`,
        windowStart,
        fallback,
      );

      const normalized = entries.map((entry) => this.attachTraceContext(entry, source));
      traces[source] = {
        spans: normalized,
        summary: this.summarizeTraces(normalized),
        transport: type,
        error,
      };

      bundles.push({
        source,
        transport: type,
        count: normalized.length,
        error,
      });
    }

    return {
      collectedAt: Date.now(),
      lookbackMinutes,
      windowStart,
      traces,
      summary: {
        totalSpans: Object.values(traces).reduce(
          (sum, value: any) => sum + (value.spans?.length ?? 0),
          0,
        ),
        sources: bundles,
      },
    };
  }

  private async createSystemSnapshot(incident: IncidentRecord): Promise<any> {
    return {
      services: await conductorResilienceManager.getResilienceStatus(),
      timestamp: Date.now(),
    };
  }

  private async collectSecurityLogs(context: IncidentContext): Promise<any> {
    const forensicConfig = this.getForensicMetadata(context);
    const lookbackMinutes = this.getPositiveInteger(forensicConfig.lookbackMinutes, 60);
    const windowStart = Date.now() - lookbackMinutes * 60000;

    const sources = this.normalizeStringArray(forensicConfig.securitySources, [
      'authentication',
      'endpoint',
      'network',
      'cloud',
      'application',
    ]);

    const collectorMap = this.normalizeCollectorMap(forensicConfig.collectors?.security);
    const inlineSecurity = this.isPlainObject(forensicConfig.inlineSecurityLogs)
      ? (forensicConfig.inlineSecurityLogs as Record<string, any>)
      : {};
    const metadataSecurity = this.isPlainObject(context.metadata?.securityLogs)
      ? (context.metadata?.securityLogs as Record<string, any>)
      : {};

    const categories: Record<string, any> = {};
    const summary = {
      totalEntries: 0,
      bySource: {} as Record<string, number>,
      criticalFindings: [] as Array<{
        source: string;
        indicator: any;
        severity: string;
        timestamp: number;
      }>,
    };

    for (const source of sources) {
      const collector = collectorMap[source];
      const fallback = inlineSecurity[source] ?? metadataSecurity[source];
      const { entries, type, error } = await this.collectFromCollector(
        collector,
        `forensics:${source}:security`,
        windowStart,
        fallback,
      );

      const normalized = entries.map((entry) => {
        const enriched = this.attachContextToEntry(entry, context, source);
        const severity = this.normalizeSeverity(
          enriched.severity ?? enriched.level ?? enriched.priority ?? enriched.risk,
        );
        return {
          ...enriched,
          severity,
        };
      });

      summary.totalEntries += normalized.length;
      summary.bySource[source] = normalized.length;

      const critical = normalized.filter((item) => ['CRITICAL', 'HIGH'].includes(item.severity));
      if (critical.length) {
        summary.criticalFindings.push(
          ...critical.slice(0, 5).map((item) => ({
            source,
            indicator: item.indicator ?? item.event ?? item.id ?? item.message ?? 'unknown',
            severity: item.severity,
            timestamp:
              typeof item.timestamp === 'number'
                ? item.timestamp
                : new Date(item.timestamp).getTime() || Date.now(),
          })),
        );
      }

      categories[source] = {
        transport: type,
        count: normalized.length,
        sample: normalized.slice(0, Math.min(normalized.length, 10)),
        error,
      };
    }

    return {
      collectedAt: Date.now(),
      lookbackMinutes,
      windowStart,
      categories,
      summary,
    };
  }

  private getForensicMetadata(context: IncidentContext): Record<string, any> {
    const metadata = context.metadata;
    if (metadata && typeof metadata === 'object' && metadata.forensics && typeof metadata.forensics === 'object') {
      return metadata.forensics as Record<string, any>;
    }
    return {};
  }

  private normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item.length > 0),
        ),
      );
    }
    return fallback;
  }

  private normalizeCollectorMap(value: unknown): Record<string, any> {
    if (this.isPlainObject(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private isPlainObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getPositiveInteger(value: unknown, defaultValue: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return defaultValue;
  }

  private async collectFromCollector(
    collector: any,
    defaultKey: string,
    windowStart: number,
    fallback?: unknown,
  ): Promise<{ entries: any[]; type: string; error?: string }> {
    const limit =
      typeof collector?.limit === 'number' && Number.isFinite(collector.limit) && collector.limit > 0
        ? Math.floor(collector.limit)
        : undefined;
    const timestampField =
      typeof collector?.timestampField === 'string' ? collector.timestampField : undefined;
    const fields =
      Array.isArray(collector?.fields) &&
      collector.fields.every((field: unknown) => typeof field === 'string')
        ? (collector.fields as string[])
        : undefined;

    try {
      if (collector?.type === 'redis') {
        const key = typeof collector.key === 'string' ? collector.key : defaultKey;
        const rangeEnd = limit ? limit - 1 : -1;
        const rawEntries = await this.redis.lrange(key, 0, rangeEnd);
        let parsed = rawEntries
          .map((entry) => this.safeJsonParse(entry) ?? { raw: entry })
          .filter((entry) => entry !== undefined);
        parsed = this.applyEntryWindow(parsed, timestampField, windowStart);
        parsed = this.projectEntries(parsed, fields);
        if (limit) {
          parsed = parsed.slice(0, limit);
        }
        return { entries: parsed, type: 'redis' };
      }

      if (collector?.type === 'file') {
        const path = typeof collector.path === 'string' ? collector.path : undefined;
        if (!path) {
          throw new Error('File collector is missing path');
        }
        const content = await fs.readFile(path, 'utf8');
        const parsedContent = this.safeJsonParse(content) ?? [];
        const parsedEntries = Array.isArray(parsedContent)
          ? parsedContent
          : this.ensureArray(parsedContent);
        let normalized = this.applyEntryWindow(parsedEntries, timestampField, windowStart);
        normalized = this.projectEntries(normalized, fields);
        if (limit) {
          normalized = normalized.slice(0, limit);
        }
        return { entries: normalized, type: 'file' };
      }

      if (collector?.type === 'http' && typeof collector.url === 'string') {
        const fetchImpl: typeof fetch | undefined = (globalThis as any).fetch;
        if (!fetchImpl) {
          throw new Error('HTTP collector requested but fetch is unavailable in this environment');
        }

        const response = await fetchImpl(collector.url, {
          method: collector.method || 'GET',
          headers: collector.headers || {},
          body:
            collector.method && collector.method !== 'GET' && collector.payload
              ? JSON.stringify(collector.payload)
              : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP collector responded with status ${response.status}`);
        }

        const payload = await response.json();
        const records = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.records)
          ? payload.records
          : Array.isArray(payload?.items)
          ? payload.items
          : this.ensureArray(payload);

        let normalized = this.applyEntryWindow(records, timestampField, windowStart);
        normalized = this.projectEntries(normalized, fields);
        if (limit) {
          normalized = normalized.slice(0, limit);
        }
        return { entries: normalized, type: 'http' };
      }

      if (collector?.type === 'inline' || collector?.type === 'static') {
        const entries = this.ensureArray(collector.data ?? collector.entries);
        let normalized = this.applyEntryWindow(entries, timestampField, windowStart);
        normalized = this.projectEntries(normalized, fields);
        if (limit) {
          normalized = normalized.slice(0, limit);
        }
        return { entries: normalized, type: collector.type };
      }
    } catch (error) {
      const fallbackEntries = this.applyEntryWindow(
        this.ensureArray(fallback),
        timestampField,
        windowStart,
      );
      return {
        entries: limit ? fallbackEntries.slice(0, limit) : fallbackEntries,
        type: collector?.type ?? 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const fallbackEntries = this.applyEntryWindow(
      this.ensureArray(fallback),
      timestampField,
      windowStart,
    );
    const projected = this.projectEntries(fallbackEntries, fields);
    return {
      entries: limit ? projected.slice(0, limit) : projected,
      type: projected.length ? 'fallback' : 'none',
    };
  }

  private safeJsonParse<T = any>(value: string): T | undefined {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }

  private ensureArray(value: unknown): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null) {
      return [];
    }
    return [value];
  }

  private applyEntryWindow(entries: any[], timestampField: string | undefined, windowStart: number): any[] {
    if (!entries?.length) {
      return [];
    }

    return entries.filter((entry) => {
      if (!entry || typeof entry !== 'object') {
        return true;
      }

      const rawTimestamp =
        (timestampField && entry[timestampField]) ?? entry.timestamp ?? entry.time ?? entry.ts;

      if (!rawTimestamp) {
        return true;
      }

      const value =
        typeof rawTimestamp === 'number'
          ? rawTimestamp
          : new Date(rawTimestamp as string).getTime();

      if (!Number.isFinite(value)) {
        return true;
      }

      return value >= windowStart;
    });
  }

  private projectEntries(entries: any[], fields?: string[]): any[] {
    if (!fields?.length) {
      return entries;
    }

    return entries.map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return entry;
      }

      const projected: Record<string, any> = {};
      for (const field of fields) {
        if (field in entry) {
          projected[field] = entry[field];
        }
      }
      return projected;
    });
  }

  private attachMetricContext(entry: any, source: string): any {
    if (!this.isPlainObject(entry)) {
      if (typeof entry === 'number') {
        return { value: entry, source, timestamp: Date.now() };
      }
      return { data: entry, source, timestamp: Date.now() };
    }

    return {
      ...entry,
      source: entry.source ?? source,
      timestamp: entry.timestamp ?? entry.time ?? Date.now(),
    };
  }

  private summarizeNumericSeries(entries: any[]): Record<string, any> {
    const values = entries
      .map((entry) => {
        if (entry && typeof entry.value === 'number' && Number.isFinite(entry.value)) {
          return entry.value;
        }
        if (typeof entry === 'number' && Number.isFinite(entry)) {
          return entry;
        }
        return undefined;
      })
      .filter((value): value is number => value !== undefined);

    const summary: Record<string, any> = { count: entries.length };

    if (values.length) {
      const total = values.reduce((sum, value) => sum + value, 0);
      summary.min = Math.min(...values);
      summary.max = Math.max(...values);
      summary.avg = Number((total / values.length).toFixed(2));
      summary.latest = values[values.length - 1];
    }

    return summary;
  }

  private attachTraceContext(entry: any, source: string): any {
    if (!this.isPlainObject(entry)) {
      return {
        spanId: typeof entry === 'string' ? entry : undefined,
        source,
        timestamp: Date.now(),
      };
    }

    return {
      ...entry,
      source: entry.source ?? source,
      spanId:
        entry.spanId ??
        entry.id ??
        entry.traceId ??
        `${source}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: entry.timestamp ?? entry.startTime ?? Date.now(),
      duration: entry.duration ?? entry.latency ?? entry.elapsed,
    };
  }

  private summarizeTraces(entries: any[]): Record<string, any> {
    const summary: Record<string, any> = { count: entries.length };

    if (!entries.length) {
      summary.servicesInvolved = [];
      return summary;
    }

    const durations = entries
      .map((entry) =>
        entry && typeof entry.duration === 'number' && Number.isFinite(entry.duration)
          ? entry.duration
          : undefined,
      )
      .filter((value): value is number => value !== undefined);

    if (durations.length) {
      const total = durations.reduce((sum, value) => sum + value, 0);
      summary.maxDuration = Math.max(...durations);
      summary.avgDuration = Number((total / durations.length).toFixed(2));
    }

    const services = new Set<string>();
    for (const entry of entries) {
      if (entry?.service) {
        services.add(String(entry.service));
      }
      if (entry?.targetService) {
        services.add(String(entry.targetService));
      }
    }

    summary.servicesInvolved = Array.from(services).filter((item) => item.length > 0);
    return summary;
  }

  private attachContextToEntry(entry: any, context: IncidentContext, source: string): any {
    if (!this.isPlainObject(entry)) {
      return {
        raw: entry,
        incidentId: context.id,
        source,
        timestamp: Date.now(),
      };
    }

    return {
      ...entry,
      incidentId: entry.incidentId ?? context.id,
      source: entry.source ?? source,
      timestamp: entry.timestamp ?? entry.time ?? Date.now(),
    };
  }

  private normalizeSeverity(value: unknown): string {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'critical') return 'CRITICAL';
      if (normalized === 'high') return 'HIGH';
      if (normalized === 'medium') return 'MEDIUM';
      if (normalized === 'low') return 'LOW';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 80) return 'CRITICAL';
      if (value >= 60) return 'HIGH';
      if (value >= 40) return 'MEDIUM';
      if (value >= 20) return 'LOW';
    }

    return 'INFO';
  }

  private async sendSecurityAlert(context: IncidentContext): Promise<void> {
    // Implement security alerting mechanism
    console.log(`SECURITY ALERT: ${context.title}`);
  }

  private addTimelineEvent(incident: IncidentRecord, event: string, metadata?: any): void {
    incident.timeline.push({
      timestamp: Date.now(),
      event,
      actor: 'system',
      ...metadata,
    });
  }

  private findActionById(actionId: string): ResponseAction | undefined {
    for (const playbook of this.playbooks.values()) {
      const action = playbook.actions.find((a) => a.id === actionId);
      if (action) return action;
    }
    return undefined;
  }

  private async persistIncident(incident: IncidentRecord): Promise<void> {
    await this.redis.setex(
      `incident:${incident.id}`,
      86400, // 24 hours
      JSON.stringify(incident),
    );
  }

  private async removeContainment(incident: IncidentRecord): Promise<void> {
    this.addTimelineEvent(incident, 'containment_removed');
    // Implement containment removal logic
  }

  private async executeDefaultResponse(incident: IncidentRecord): Promise<void> {
    this.addTimelineEvent(incident, 'default_response_initiated');
    // Implement default response actions
  }

  private async escalateIncident(incident: IncidentRecord, reason: string): Promise<void> {
    incident.status = 'escalated';
    this.addTimelineEvent(incident, 'incident_escalated', { reason });
    this.emit('incident:escalated', incident);
  }

  private scheduleEscalation(incident: IncidentRecord, playbook: PlaybookDefinition): void {
    setTimeout(async () => {
      if (incident.status === 'active') {
        await this.escalateIncident(incident, 'Escalation timeout reached');
      }
    }, playbook.escalation.timeoutMinutes * 60000);
  }

  private startCleanupJob(): void {
    setInterval(async () => {
      // Clean up old incidents
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const [id, incident] of this.activeIncidents.entries()) {
        if (incident.context.timestamp < cutoff && incident.status !== 'active') {
          this.activeIncidents.delete(id);
          await this.redis.del(`incident:${id}`);
        }
      }
    }, 60000); // Run every minute
  }
}

// Singleton instance
export const incidentResponseEngine = new IncidentResponseEngine(
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379'),
);
