/**
 * Service Adapter Tests
 *
 * Unit tests for the service audit adapter.
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import type { AuditEventInput, SubmitResult } from '../sink/audit-sink.js';

/**
 * Mock audit sink for testing
 */
class MockAuditSink extends EventEmitter {
  public submittedEvents: AuditEventInput[] = [];
  public shouldFail: boolean = false;
  public backpressureActive: boolean = false;

  async initialize(): Promise<void> {}

  async submit(input: AuditEventInput): Promise<SubmitResult> {
    if (this.shouldFail) {
      return {
        success: false,
        eventId: randomUUID(),
        queued: false,
        error: 'Mock failure',
      };
    }

    this.submittedEvents.push(input);

    return {
      success: true,
      eventId: randomUUID(),
      queued: true,
    };
  }

  async submitBatch(inputs: AuditEventInput[]): Promise<SubmitResult[]> {
    return Promise.all(inputs.map((input) => this.submit(input)));
  }

  isBackpressureActive(): boolean {
    return this.backpressureActive;
  }

  async close(): Promise<void> {}

  clear(): void {
    this.submittedEvents = [];
  }
}

/**
 * Service adapter implementation for testing
 */
class TestServiceAdapter {
  private serviceId: string;
  private serviceName: string;
  private environment: 'development' | 'staging' | 'production';
  private tenantId?: string;
  private defaultTags: string[];
  private sink: MockAuditSink;
  private defaultContext: Record<string, unknown> = {};

  constructor(config: {
    serviceId: string;
    serviceName: string;
    environment: 'development' | 'staging' | 'production';
    tenantId?: string;
    defaultTags?: string[];
    sink: MockAuditSink;
  }) {
    this.serviceId = config.serviceId;
    this.serviceName = config.serviceName;
    this.environment = config.environment;
    this.tenantId = config.tenantId;
    this.defaultTags = config.defaultTags || [];
    this.sink = config.sink;
  }

  setDefaultContext(context: Record<string, unknown>): void {
    this.defaultContext = context;
  }

  async logAccess(input: {
    correlationId?: string;
    userId: string;
    action: string;
    outcome: string;
    message?: string;
    ipAddress?: string;
    sessionId?: string;
  }): Promise<SubmitResult> {
    return this.sink.submit({
      eventType: `user_${input.action}`,
      level: input.outcome === 'failure' ? 'warn' : 'info',
      correlationId: input.correlationId || randomUUID(),
      tenantId: this.tenantId || 'default',
      serviceId: this.serviceId,
      serviceName: this.serviceName,
      environment: this.environment,
      action: input.action,
      outcome: input.outcome as 'success' | 'failure',
      message: input.message || `User ${input.action}`,
      userId: input.userId,
      criticalCategory: 'access',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'ISO27001'],
      ipAddress: input.ipAddress,
      sessionId: input.sessionId,
      tags: this.defaultTags,
    });
  }

  async logExport(input: {
    correlationId?: string;
    userId: string;
    resourceType: string;
    exportFormat: string;
    recordCount: number;
    outcome: string;
  }): Promise<SubmitResult> {
    return this.sink.submit({
      eventType: 'data_export',
      level: input.outcome === 'failure' ? 'error' : 'info',
      correlationId: input.correlationId || randomUUID(),
      tenantId: this.tenantId || 'default',
      serviceId: this.serviceId,
      serviceName: this.serviceName,
      environment: this.environment,
      action: 'export',
      outcome: input.outcome as 'success' | 'failure',
      message: `Data export ${input.outcome}`,
      userId: input.userId,
      resourceType: input.resourceType,
      criticalCategory: 'export',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
      details: {
        exportFormat: input.exportFormat,
        recordCount: input.recordCount,
      },
      tags: this.defaultTags,
    });
  }

  async logSecurity(input: {
    correlationId?: string;
    eventType: string;
    severity: string;
    description: string;
    sourceIp?: string;
  }): Promise<SubmitResult> {
    const levelMap: Record<string, 'info' | 'warn' | 'error' | 'critical'> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'critical',
    };

    return this.sink.submit({
      eventType: `security_${input.eventType}`,
      level: levelMap[input.severity] || 'warn',
      correlationId: input.correlationId || randomUUID(),
      tenantId: this.tenantId || 'default',
      serviceId: this.serviceId,
      serviceName: this.serviceName,
      environment: this.environment,
      action: input.eventType,
      outcome: 'success',
      message: input.description,
      criticalCategory: 'security',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'NIST', 'ISO27001'],
      ipAddress: input.sourceIp,
      details: {
        severity: input.severity,
      },
      tags: this.defaultTags,
    });
  }
}

describe('ServiceAuditAdapter', () => {
  let sink: MockAuditSink;
  let adapter: TestServiceAdapter;

  beforeEach(() => {
    sink = new MockAuditSink();
    adapter = new TestServiceAdapter({
      serviceId: 'test-api',
      serviceName: 'Test API Service',
      environment: 'development',
      tenantId: 'test-tenant',
      defaultTags: ['test', 'unit-test'],
      sink,
    });
  });

  describe('Access Event Logging', () => {
    it('should log login events correctly', async () => {
      const result = await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
        ipAddress: '192.168.1.1',
        sessionId: randomUUID(),
      });

      expect(result.success).toBe(true);
      expect(sink.submittedEvents).toHaveLength(1);

      const event = sink.submittedEvents[0];
      expect(event.eventType).toBe('user_login');
      expect(event.level).toBe('info');
      expect(event.userId).toBe('user-123');
      expect(event.criticalCategory).toBe('access');
      expect(event.complianceRelevant).toBe(true);
      expect(event.complianceFrameworks).toContain('SOC2');
    });

    it('should log failed login as warning', async () => {
      await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'failure',
        message: 'Invalid credentials',
      });

      const event = sink.submittedEvents[0];
      expect(event.level).toBe('warn');
    });

    it('should include default tags', async () => {
      await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
      });

      const event = sink.submittedEvents[0];
      expect(event.tags).toContain('test');
      expect(event.tags).toContain('unit-test');
    });
  });

  describe('Export Event Logging', () => {
    it('should log export events with compliance frameworks', async () => {
      await adapter.logExport({
        userId: 'user-123',
        resourceType: 'investigation',
        exportFormat: 'csv',
        recordCount: 1000,
        outcome: 'success',
      });

      const event = sink.submittedEvents[0];
      expect(event.eventType).toBe('data_export');
      expect(event.criticalCategory).toBe('export');
      expect(event.complianceFrameworks).toContain('GDPR');
      expect(event.complianceFrameworks).toContain('HIPAA');
      expect(event.details?.recordCount).toBe(1000);
    });

    it('should log failed exports as errors', async () => {
      await adapter.logExport({
        userId: 'user-123',
        resourceType: 'investigation',
        exportFormat: 'pdf',
        recordCount: 0,
        outcome: 'failure',
      });

      const event = sink.submittedEvents[0];
      expect(event.level).toBe('error');
    });
  });

  describe('Security Event Logging', () => {
    it('should log security alerts with correct severity', async () => {
      await adapter.logSecurity({
        eventType: 'alert',
        severity: 'high',
        description: 'Suspicious activity detected',
        sourceIp: '10.0.0.1',
      });

      const event = sink.submittedEvents[0];
      expect(event.eventType).toBe('security_alert');
      expect(event.level).toBe('error');
      expect(event.criticalCategory).toBe('security');
      expect(event.ipAddress).toBe('10.0.0.1');
    });

    it('should map severity levels correctly', async () => {
      const severities = [
        { severity: 'low', expectedLevel: 'info' },
        { severity: 'medium', expectedLevel: 'warn' },
        { severity: 'high', expectedLevel: 'error' },
        { severity: 'critical', expectedLevel: 'critical' },
      ];

      for (const { severity, expectedLevel } of severities) {
        sink.clear();

        await adapter.logSecurity({
          eventType: 'test',
          severity,
          description: `Test ${severity} alert`,
        });

        expect(sink.submittedEvents[0].level).toBe(expectedLevel);
      }
    });
  });

  describe('Correlation ID Handling', () => {
    it('should use provided correlation ID', async () => {
      const correlationId = randomUUID();

      await adapter.logAccess({
        correlationId,
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
      });

      expect(sink.submittedEvents[0].correlationId).toBe(correlationId);
    });

    it('should generate correlation ID if not provided', async () => {
      await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
      });

      expect(sink.submittedEvents[0].correlationId).toBeDefined();
      expect(sink.submittedEvents[0].correlationId).toHaveLength(36); // UUID format
    });
  });

  describe('Error Handling', () => {
    it('should handle sink failures gracefully', async () => {
      sink.shouldFail = true;

      const result = await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mock failure');
    });
  });

  describe('Service Context', () => {
    it('should include service context in all events', async () => {
      await adapter.logAccess({
        userId: 'user-123',
        action: 'login',
        outcome: 'success',
      });

      const event = sink.submittedEvents[0];
      expect(event.serviceId).toBe('test-api');
      expect(event.serviceName).toBe('Test API Service');
      expect(event.environment).toBe('development');
      expect(event.tenantId).toBe('test-tenant');
    });
  });
});

describe('Multi-Service Scenarios', () => {
  it('should handle events from multiple services with same correlation ID', async () => {
    const sink = new MockAuditSink();
    const correlationId = randomUUID();

    const apiAdapter = new TestServiceAdapter({
      serviceId: 'api-gateway',
      serviceName: 'API Gateway',
      environment: 'production',
      tenantId: 'tenant-1',
      sink,
    });

    const authAdapter = new TestServiceAdapter({
      serviceId: 'auth-service',
      serviceName: 'Auth Service',
      environment: 'production',
      tenantId: 'tenant-1',
      sink,
    });

    // Simulate request flow
    await apiAdapter.logAccess({
      correlationId,
      userId: 'user-123',
      action: 'request',
      outcome: 'success',
    });

    await authAdapter.logAccess({
      correlationId,
      userId: 'user-123',
      action: 'authenticate',
      outcome: 'success',
    });

    await apiAdapter.logAccess({
      correlationId,
      userId: 'user-123',
      action: 'response',
      outcome: 'success',
    });

    expect(sink.submittedEvents).toHaveLength(3);

    // All events should share correlation ID
    sink.submittedEvents.forEach((event) => {
      expect(event.correlationId).toBe(correlationId);
    });

    // Events should have different service IDs
    const serviceIds = sink.submittedEvents.map((e) => e.serviceId);
    expect(serviceIds).toContain('api-gateway');
    expect(serviceIds).toContain('auth-service');
  });
});
