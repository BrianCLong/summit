/**
 * Data Spine Audit Trail
 *
 * Provides immutable, hash-chained audit logging for all governance operations.
 * Supports compliance requirements for GDPR, CCPA, SOC2, and enterprise audit needs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const AUDIT_EVENT_TYPES = [
  'contract.created',
  'contract.updated',
  'contract.validated',
  'contract.bumped',
  'contract.deprecated',
  'schema.accessed',
  'schema.modified',
  'policy.applied',
  'policy.violated',
  'residency.checked',
  'residency.violated',
  'classification.changed',
  'access.granted',
  'access.denied',
  'access.revoked',
  'lineage.recorded',
  'compliance.checked',
  'compliance.violated',
  'retention.enforced',
  'data.tokenized',
  'data.detokenized',
  'data.redacted',
  'export.requested',
  'export.completed',
  'audit.verified',
];

const ACTOR_TYPES = ['user', 'service', 'system', 'auditor'];

const SEVERITY_LEVELS = ['info', 'warning', 'critical', 'audit'];

function computeHash(data, previousHash = '') {
  const payload = JSON.stringify({ ...data, previousHash });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function validateEventType(eventType) {
  if (!AUDIT_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Invalid audit event type: ${eventType}`);
  }
}

function validateActorType(actorType) {
  if (!ACTOR_TYPES.includes(actorType)) {
    throw new Error(`Invalid actor type: ${actorType}`);
  }
}

class AuditTrail {
  constructor(options = {}) {
    this.events = [];
    this.lastHash = options.genesisHash || 'GENESIS';
    this.outputPath =
      options.outputPath ||
      path.join(__dirname, '..', 'audit', 'audit-trail.json');
    this.bus = options.bus || new EventEmitter();
    this.autoFlush = options.autoFlush !== false;
    this.flushInterval = options.flushInterval || 1000;
    this.maxMemoryEvents = options.maxMemoryEvents || 10000;
    this.retentionDays = options.retentionDays || 2555; // 7 years default

    if (options.loadExisting !== false) {
      this.loadExisting();
    }

    if (this.autoFlush) {
      this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  loadExisting() {
    try {
      if (fs.existsSync(this.outputPath)) {
        const data = JSON.parse(fs.readFileSync(this.outputPath, 'utf8'));
        this.events = data.events || [];
        if (this.events.length > 0) {
          this.lastHash = this.events[this.events.length - 1].currentHash;
        }
      }
    } catch (error) {
      // Start fresh if loading fails
      this.events = [];
    }
  }

  record(event) {
    validateEventType(event.eventType);
    validateActorType(event.actorType);

    const timestamp = new Date().toISOString();
    const eventId = crypto.randomUUID();

    const auditEvent = {
      eventId,
      timestamp,
      eventType: event.eventType,
      actorId: event.actorId,
      actorType: event.actorType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action,
      outcome: event.outcome || 'success',
      severity: event.severity || 'info',
      details: event.details || {},
      metadata: {
        tenantId: event.tenantId,
        region: event.region,
        environment: event.environment,
        traceId: event.traceId,
        correlationId: event.correlationId,
        sourceService: event.sourceService || 'data-spine',
        policyVersion: event.policyVersion,
        schemaVersion: event.schemaVersion,
      },
      previousHash: this.lastHash,
      currentHash: null,
    };

    auditEvent.currentHash = computeHash(auditEvent, this.lastHash);
    this.lastHash = auditEvent.currentHash;
    this.events.push(auditEvent);

    // Emit event for real-time subscribers
    this.bus.emit('audit-event', auditEvent);

    // Trim memory if needed
    if (this.events.length > this.maxMemoryEvents) {
      this.flush();
      this.events = this.events.slice(-Math.floor(this.maxMemoryEvents / 2));
    }

    return auditEvent;
  }

  recordContractCreated(contract, actorId, actorType = 'user', details = {}) {
    return this.record({
      eventType: 'contract.created',
      actorId,
      actorType,
      resourceType: 'contract',
      resourceId: contract.name,
      action: 'create',
      details: {
        ...details,
        version: contract.version,
        classification: contract.classification,
        residency: contract.residency,
      },
    });
  }

  recordContractValidated(contract, actorId, actorType = 'system', result) {
    return this.record({
      eventType: 'contract.validated',
      actorId,
      actorType,
      resourceType: 'contract',
      resourceId: contract.name,
      action: 'validate',
      outcome: result.valid ? 'success' : 'failure',
      severity: result.valid ? 'info' : 'warning',
      details: {
        version: contract.version,
        errors: result.errors || [],
      },
    });
  }

  recordPolicyViolation(contract, policy, violation, actorId) {
    return this.record({
      eventType: 'policy.violated',
      actorId,
      actorType: 'system',
      resourceType: 'contract',
      resourceId: contract.name,
      action: 'policy_check',
      outcome: 'violation',
      severity: violation.severity || 'critical',
      details: {
        policyType: policy.type,
        violationType: violation.type,
        message: violation.message,
        remediation: violation.remediation,
      },
    });
  }

  recordAccessDecision(resource, actor, decision, reason) {
    return this.record({
      eventType: decision === 'allow' ? 'access.granted' : 'access.denied',
      actorId: actor.id,
      actorType: actor.type,
      resourceType: resource.type,
      resourceId: resource.id,
      action: resource.action,
      outcome: decision,
      severity: decision === 'deny' ? 'warning' : 'info',
      details: {
        reason,
        roles: actor.roles,
        attributes: actor.attributes,
      },
    });
  }

  recordComplianceCheck(contract, standard, result) {
    return this.record({
      eventType: result.compliant ? 'compliance.checked' : 'compliance.violated',
      actorId: 'compliance-engine',
      actorType: 'system',
      resourceType: 'contract',
      resourceId: contract.name,
      action: 'compliance_check',
      outcome: result.compliant ? 'success' : 'failure',
      severity: result.compliant ? 'info' : 'critical',
      details: {
        standard: standard.id,
        standardVersion: standard.version,
        score: result.score,
        violations: result.violations,
        recommendations: result.recommendations,
      },
    });
  }

  recordDataOperation(operation, contract, actor, details = {}) {
    const eventTypeMap = {
      tokenize: 'data.tokenized',
      detokenize: 'data.detokenized',
      redact: 'data.redacted',
    };
    return this.record({
      eventType: eventTypeMap[operation] || 'schema.accessed',
      actorId: actor.id,
      actorType: actor.type,
      resourceType: 'contract',
      resourceId: contract.name,
      action: operation,
      details: {
        ...details,
        fieldsAffected: details.fields || [],
        environment: details.environment,
      },
    });
  }

  query(filters = {}) {
    let results = this.events;

    if (filters.eventType) {
      results = results.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.actorId) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }
    if (filters.resourceId) {
      results = results.filter((e) => e.resourceId === filters.resourceId);
    }
    if (filters.resourceType) {
      results = results.filter((e) => e.resourceType === filters.resourceType);
    }
    if (filters.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }
    if (filters.startTime) {
      results = results.filter((e) => e.timestamp >= filters.startTime);
    }
    if (filters.endTime) {
      results = results.filter((e) => e.timestamp <= filters.endTime);
    }
    if (filters.tenantId) {
      results = results.filter((e) => e.metadata.tenantId === filters.tenantId);
    }

    if (filters.limit) {
      results = results.slice(-filters.limit);
    }

    return results;
  }

  verifyIntegrity(options = {}) {
    const errors = [];
    let expectedPreviousHash = options.startHash || 'GENESIS';
    const startIndex = options.startIndex || 0;

    for (let i = startIndex; i < this.events.length; i++) {
      const event = this.events[i];

      // Verify chain linkage
      if (event.previousHash !== expectedPreviousHash) {
        errors.push({
          index: i,
          eventId: event.eventId,
          error: 'Chain linkage broken',
          expected: expectedPreviousHash,
          actual: event.previousHash,
        });
      }

      // Verify hash integrity
      const computed = computeHash(
        { ...event, currentHash: null },
        event.previousHash
      );
      if (computed !== event.currentHash) {
        errors.push({
          index: i,
          eventId: event.eventId,
          error: 'Hash mismatch - event may be tampered',
          expected: computed,
          actual: event.currentHash,
        });
      }

      expectedPreviousHash = event.currentHash;
    }

    return {
      valid: errors.length === 0,
      totalEvents: this.events.length,
      verifiedEvents: this.events.length - startIndex,
      errors,
      lastVerifiedHash: expectedPreviousHash,
      verifiedAt: new Date().toISOString(),
    };
  }

  generateReport(options = {}) {
    const period = {
      start: options.startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: options.endTime || new Date().toISOString(),
    };

    const events = this.query({
      startTime: period.start,
      endTime: period.end,
    });

    const summary = {
      totalEvents: events.length,
      byType: {},
      bySeverity: {},
      byOutcome: {},
      byActor: {},
      violations: [],
      criticalEvents: [],
    };

    events.forEach((event) => {
      summary.byType[event.eventType] = (summary.byType[event.eventType] || 0) + 1;
      summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;
      summary.byOutcome[event.outcome] = (summary.byOutcome[event.outcome] || 0) + 1;
      summary.byActor[event.actorId] = (summary.byActor[event.actorId] || 0) + 1;

      if (event.eventType.includes('violated')) {
        summary.violations.push(event);
      }
      if (event.severity === 'critical') {
        summary.criticalEvents.push(event);
      }
    });

    const integrity = this.verifyIntegrity();

    return {
      reportId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      period,
      summary,
      integrity,
      retention: {
        policy: `${this.retentionDays} days`,
        oldestEvent: events[0]?.timestamp,
        newestEvent: events[events.length - 1]?.timestamp,
      },
    };
  }

  flush() {
    const dir = path.dirname(this.outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          lastHash: this.lastHash,
          eventCount: this.events.length,
          events: this.events,
        },
        null,
        2
      )
    );
  }

  export(filePath, filters = {}) {
    const events = this.query(filters);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          filters,
          eventCount: events.length,
          events,
        },
        null,
        2
      )
    );
    return { exported: events.length, path: filePath };
  }

  close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

module.exports = {
  AuditTrail,
  AUDIT_EVENT_TYPES,
  ACTOR_TYPES,
  SEVERITY_LEVELS,
  computeHash,
};
