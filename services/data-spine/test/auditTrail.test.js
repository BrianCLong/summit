const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AuditTrail, AUDIT_EVENT_TYPES, ACTOR_TYPES } = require('../src/auditTrail');

test('AuditTrail records events with hash chain', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  const event1 = audit.record({
    eventType: 'contract.created',
    actorId: 'user-123',
    actorType: 'user',
    resourceType: 'contract',
    resourceId: 'customer-profile',
    action: 'create',
  });

  assert.ok(event1.eventId);
  assert.strictEqual(event1.eventType, 'contract.created');
  assert.strictEqual(event1.previousHash, 'GENESIS');
  assert.ok(event1.currentHash);

  const event2 = audit.record({
    eventType: 'contract.validated',
    actorId: 'system',
    actorType: 'system',
    resourceType: 'contract',
    resourceId: 'customer-profile',
    action: 'validate',
  });

  assert.strictEqual(event2.previousHash, event1.currentHash);
  assert.notStrictEqual(event2.currentHash, event1.currentHash);

  audit.close();
});

test('AuditTrail verifies integrity correctly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-integrity-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  // Record multiple events
  for (let i = 0; i < 5; i++) {
    audit.record({
      eventType: 'schema.accessed',
      actorId: `user-${i}`,
      actorType: 'user',
      resourceType: 'schema',
      resourceId: `schema-${i}`,
      action: 'read',
    });
  }

  const integrity = audit.verifyIntegrity();
  assert.strictEqual(integrity.valid, true);
  assert.strictEqual(integrity.totalEvents, 5);
  assert.strictEqual(integrity.errors.length, 0);

  audit.close();
});

test('AuditTrail detects tampering', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-tamper-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  audit.record({
    eventType: 'contract.created',
    actorId: 'user-1',
    actorType: 'user',
    resourceType: 'contract',
    resourceId: 'test-contract',
    action: 'create',
  });

  audit.record({
    eventType: 'contract.validated',
    actorId: 'system',
    actorType: 'system',
    resourceType: 'contract',
    resourceId: 'test-contract',
    action: 'validate',
  });

  // Tamper with an event
  audit.events[0].details = { tampered: true };

  const integrity = audit.verifyIntegrity();
  assert.strictEqual(integrity.valid, false);
  assert.ok(integrity.errors.length > 0);

  audit.close();
});

test('AuditTrail queries filter correctly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-query-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  audit.record({
    eventType: 'contract.created',
    actorId: 'user-1',
    actorType: 'user',
    resourceType: 'contract',
    resourceId: 'contract-a',
    action: 'create',
  });

  audit.record({
    eventType: 'policy.violated',
    actorId: 'system',
    actorType: 'system',
    resourceType: 'contract',
    resourceId: 'contract-b',
    action: 'check',
    severity: 'critical',
  });

  audit.record({
    eventType: 'access.denied',
    actorId: 'user-2',
    actorType: 'user',
    resourceType: 'schema',
    resourceId: 'schema-1',
    action: 'read',
  });

  const contractEvents = audit.query({ resourceType: 'contract' });
  assert.strictEqual(contractEvents.length, 2);

  const criticalEvents = audit.query({ severity: 'critical' });
  assert.strictEqual(criticalEvents.length, 1);

  const user1Events = audit.query({ actorId: 'user-1' });
  assert.strictEqual(user1Events.length, 1);

  audit.close();
});

test('AuditTrail generates reports', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-report-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  audit.record({
    eventType: 'contract.created',
    actorId: 'user-1',
    actorType: 'user',
    resourceType: 'contract',
    resourceId: 'test',
    action: 'create',
  });

  audit.record({
    eventType: 'policy.violated',
    actorId: 'system',
    actorType: 'system',
    resourceType: 'contract',
    resourceId: 'test',
    action: 'check',
    severity: 'critical',
  });

  const report = audit.generateReport();
  assert.ok(report.reportId);
  assert.strictEqual(report.summary.totalEvents, 2);
  assert.ok(report.summary.byType['contract.created']);
  assert.ok(report.summary.byType['policy.violated']);
  assert.strictEqual(report.summary.criticalEvents.length, 1);
  assert.strictEqual(report.summary.violations.length, 1);

  audit.close();
});

test('AuditTrail records contract lifecycle events', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-lifecycle-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  const contract = {
    name: 'customer-profile',
    version: '1.0.0',
    classification: ['PII'],
    residency: { allowedRegions: ['us-east-1'] },
  };

  const created = audit.recordContractCreated(contract, 'admin-user');
  assert.strictEqual(created.eventType, 'contract.created');
  assert.strictEqual(created.resourceId, 'customer-profile');

  const validated = audit.recordContractValidated(contract, 'ci-system', 'system', { valid: true });
  assert.strictEqual(validated.eventType, 'contract.validated');
  assert.strictEqual(validated.outcome, 'success');

  audit.close();
});

test('AuditTrail exports events to file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-export-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const exportPath = path.join(tmpDir, 'export.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  for (let i = 0; i < 3; i++) {
    audit.record({
      eventType: 'contract.created',
      actorId: `user-${i}`,
      actorType: 'user',
      resourceType: 'contract',
      resourceId: `contract-${i}`,
      action: 'create',
    });
  }

  const result = audit.export(exportPath);
  assert.strictEqual(result.exported, 3);
  assert.ok(fs.existsSync(exportPath));

  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  assert.strictEqual(exported.eventCount, 3);

  audit.close();
});

test('validates event types', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-validate-'));
  const outputPath = path.join(tmpDir, 'audit.json');
  const audit = new AuditTrail({ outputPath, autoFlush: false, loadExisting: false });

  assert.throws(() => {
    audit.record({
      eventType: 'invalid.event.type',
      actorId: 'user-1',
      actorType: 'user',
      resourceType: 'contract',
      resourceId: 'test',
      action: 'test',
    });
  }, /Invalid audit event type/);

  assert.throws(() => {
    audit.record({
      eventType: 'contract.created',
      actorId: 'user-1',
      actorType: 'invalid-actor',
      resourceType: 'contract',
      resourceId: 'test',
      action: 'test',
    });
  }, /Invalid actor type/);

  audit.close();
});
