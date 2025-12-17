const test = require('node:test');
const assert = require('node:assert');
const { GovernanceEventEmitter, EVENT_TYPES, createEnvelope } = require('../src/governanceEvents');

test('createEnvelope creates valid event envelope', () => {
  const envelope = createEnvelope(
    EVENT_TYPES.CONTRACT_CREATED,
    { contract_name: 'test-contract' },
    { tenantId: 'tenant-123', region: 'us-east-1' }
  );

  assert.ok(envelope.event_id);
  assert.strictEqual(envelope.event_type, EVENT_TYPES.CONTRACT_CREATED);
  assert.strictEqual(envelope.event_version, 'v1');
  assert.ok(envelope.occurred_at);
  assert.ok(envelope.recorded_at);
  assert.strictEqual(envelope.tenant_id, 'tenant-123');
  assert.strictEqual(envelope.source_service, 'data-spine');
  assert.strictEqual(envelope.region, 'us-east-1');
  assert.deepStrictEqual(envelope.data, { contract_name: 'test-contract' });
});

test('GovernanceEventEmitter emits contract events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = {
    name: 'customer-profile',
    version: '1.0.0',
    classification: ['PII'],
    residency: { allowedRegions: ['us-east-1'] },
    checksum: 'abc123',
  };

  const actor = { id: 'user-1', type: 'user' };

  emitter.contractCreated(contract, actor);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event_type, EVENT_TYPES.CONTRACT_CREATED);
  assert.strictEqual(events[0].data.contract_name, 'customer-profile');

  emitter.contractValidated(contract, { valid: true, errors: [] });
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].event_type, EVENT_TYPES.CONTRACT_VALIDATED);
  assert.strictEqual(events[1].data.valid, true);

  emitter.close();
});

test('GovernanceEventEmitter emits policy events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = { name: 'test-contract' };
  const policy = { type: 'pii-protection', version: '1.0' };

  emitter.policyApplied(
    contract,
    policy,
    { id: 'record-1' },
    { fieldsAffected: ['email', 'ssn'], environment: 'dev', transformationType: 'tokenize' }
  );

  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].event_type, EVENT_TYPES.POLICY_APPLIED);
  assert.deepStrictEqual(events[0].data.fields_affected, ['email', 'ssn']);

  emitter.policyViolated(contract, policy, {
    type: 'missing_classification',
    severity: 'critical',
    message: 'PII not classified',
    remediation: 'Add PII classification',
  });

  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].event_type, EVENT_TYPES.POLICY_VIOLATED);
  assert.strictEqual(events[1].data.violation_severity, 'critical');

  emitter.close();
});

test('GovernanceEventEmitter emits access events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const resource = { type: 'contract', id: 'test-contract' };
  const actor = { id: 'user-1', type: 'user', roles: ['data-analyst'] };

  emitter.accessGranted(resource, actor, ['contract:read', 'schema:read']);
  assert.strictEqual(events[0].event_type, EVENT_TYPES.ACCESS_GRANTED);
  assert.deepStrictEqual(events[0].data.permissions_granted, ['contract:read', 'schema:read']);

  emitter.accessDenied(resource, actor, 'Insufficient clearance level');
  assert.strictEqual(events[1].event_type, EVENT_TYPES.ACCESS_DENIED);
  assert.strictEqual(events[1].data.denial_reason, 'Insufficient clearance level');

  emitter.accessRevoked(resource, actor, 'admin-1', 'Role change');
  assert.strictEqual(events[2].event_type, EVENT_TYPES.ACCESS_REVOKED);
  assert.strictEqual(events[2].data.revocation_reason, 'Role change');

  emitter.close();
});

test('GovernanceEventEmitter emits compliance events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = { name: 'test-contract', version: '1.0.0' };
  const assessment = {
    assessmentId: 'assess-1',
    standards: [{ standardId: 'GDPR' }, { standardId: 'CCPA' }],
    overallScore: 85,
    overallCompliant: true,
    violations: [],
    assessedAt: new Date().toISOString(),
  };

  emitter.complianceAssessed(contract, assessment);
  assert.strictEqual(events[0].event_type, EVENT_TYPES.COMPLIANCE_ASSESSED);
  assert.strictEqual(events[0].data.overall_score, 85);
  assert.deepStrictEqual(events[0].data.standards_checked, ['GDPR', 'CCPA']);

  emitter.close();
});

test('GovernanceEventEmitter emits data operation events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = { name: 'customer-profile', version: '1.0.0' };
  const actor = { id: 'user-1', type: 'user' };

  emitter.dataTokenized(contract, ['email', 'phone'], 1000, { environment: 'dev' });
  assert.strictEqual(events[0].event_type, EVENT_TYPES.DATA_TOKENIZED);
  assert.strictEqual(events[0].data.record_count, 1000);
  assert.strictEqual(events[0].data.reversible, true);

  emitter.dataRedacted(contract, ['ssn'], 500, { environment: 'dev' });
  assert.strictEqual(events[1].event_type, EVENT_TYPES.DATA_REDACTED);
  assert.strictEqual(events[1].data.irreversible, true);

  emitter.dataDetokenized(contract, ['email'], 100, actor, { justification: 'Support request' });
  assert.strictEqual(events[2].event_type, EVENT_TYPES.DATA_DETOKENIZED);
  assert.strictEqual(events[2].data.actor_id, 'user-1');

  emitter.close();
});

test('GovernanceEventEmitter emits residency events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = {
    name: 'test-contract',
    residency: { allowedRegions: ['us-east-1', 'us-west-2'], defaultRegion: 'us-east-1' },
  };

  emitter.residencyChecked(contract, 'us-east-1', { allowed: true, effectiveRegion: 'us-east-1' });
  assert.strictEqual(events[0].event_type, EVENT_TYPES.RESIDENCY_CHECKED);
  assert.strictEqual(events[0].data.check_result, 'allowed');

  emitter.residencyViolated(contract, 'ap-south-1');
  assert.strictEqual(events[1].event_type, EVENT_TYPES.RESIDENCY_VIOLATED);
  assert.strictEqual(events[1].data.requested_region, 'ap-south-1');
  assert.strictEqual(events[1].data.severity, 'critical');

  emitter.close();
});

test('GovernanceEventEmitter emits retention events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = { name: 'test-contract' };
  const actor = { id: 'admin-1', type: 'user' };

  emitter.retentionPolicySet(
    contract,
    { maxDays: 365, deletionPolicy: 'hard_delete', archivePolicy: 'COLD' },
    actor
  );
  assert.strictEqual(events[0].event_type, EVENT_TYPES.RETENTION_POLICY_SET);
  assert.strictEqual(events[0].data.retention_days, 365);

  emitter.retentionEnforced(contract, 'archive', 1000);
  assert.strictEqual(events[1].event_type, EVENT_TYPES.RETENTION_ENFORCED);

  emitter.dataArchived(contract, 's3://archive-bucket', 1000, { checksum: 'abc123' });
  assert.strictEqual(events[2].event_type, EVENT_TYPES.DATA_ARCHIVED);

  emitter.dataDeleted(contract, 'retention_policy', 500, { method: 'hard_delete' });
  assert.strictEqual(events[3].event_type, EVENT_TYPES.DATA_DELETED);

  emitter.close();
});

test('GovernanceEventEmitter emits classification events', () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const events = [];

  emitter.on('governance-event', (event) => events.push(event));

  const contract = { name: 'test-contract', version: '1.0.0' };
  const actor = { id: 'admin-1', type: 'user' };

  emitter.classificationChanged(contract, ['Internal'], ['PII', 'Internal'], actor, {
    reason: 'Added PII data',
  });

  assert.strictEqual(events[0].event_type, EVENT_TYPES.CLASSIFICATION_UPGRADED);
  assert.strictEqual(events[0].data.classification_direction, 'upgrade');
  assert.deepStrictEqual(events[0].data.previous_classification, ['Internal']);
  assert.deepStrictEqual(events[0].data.new_classification, ['PII', 'Internal']);

  emitter.close();
});

test('GovernanceEventEmitter registers and uses sinks', async () => {
  const emitter = new GovernanceEventEmitter({ consoleLogging: false, autoFlush: false });
  const sinkEvents = [];

  emitter.registerSink({
    name: 'test-sink',
    emit: (event) => {
      sinkEvents.push(event);
      return Promise.resolve();
    },
  });

  emitter.contractCreated(
    { name: 'test', version: '1.0.0', classification: ['Internal'] },
    { id: 'user-1', type: 'user' }
  );

  await emitter.flush();
  assert.strictEqual(sinkEvents.length, 1);

  emitter.removeSink('test-sink');
  emitter.contractCreated(
    { name: 'test2', version: '1.0.0', classification: ['Internal'] },
    { id: 'user-1', type: 'user' }
  );

  await emitter.flush();
  assert.strictEqual(sinkEvents.length, 1); // No new events after sink removed

  emitter.close();
});

test('GovernanceEventEmitter buffers and flushes events', async () => {
  const emitter = new GovernanceEventEmitter({
    consoleLogging: false,
    autoFlush: false,
    bufferSize: 3,
  });

  const sinkEvents = [];
  emitter.registerSink({
    name: 'buffer-test-sink',
    emit: (event) => {
      sinkEvents.push(event);
      return Promise.resolve();
    },
  });

  // Add events below buffer size
  emitter.contractCreated({ name: 't1', version: '1.0.0' }, { id: 'u1', type: 'user' });
  emitter.contractCreated({ name: 't2', version: '1.0.0' }, { id: 'u1', type: 'user' });

  // Events should be buffered, not flushed yet
  assert.strictEqual(sinkEvents.length, 0);

  // Add one more to trigger flush (buffer size = 3)
  emitter.contractCreated({ name: 't3', version: '1.0.0' }, { id: 'u1', type: 'user' });

  // Wait for flush
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.strictEqual(sinkEvents.length, 3);

  emitter.close();
});
