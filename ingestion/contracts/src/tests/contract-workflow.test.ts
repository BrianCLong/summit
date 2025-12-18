import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CertificationWorkflow,
  CertificateAuthority,
  ContractSpecification,
  QuarantineRegistry,
  diffContracts
} from '../index.js';
import { ContractSpec } from '../types.js';

test('detects contract drift across versions', () => {
  const current: ContractSpec = {
    id: 'dpic-001',
    dataset: 'alpha',
    version: '1.0.0',
    owner: 'alpha',
    license: { name: 'CC-BY-4.0' },
    termsHash: '',
    fields: [
      { name: 'user_id', type: 'string', nullable: false, classification: 'pii' },
      { name: 'region', type: 'string', nullable: false }
    ]
  };

  const proposed: ContractSpec = {
    ...current,
    version: '1.1.0',
    fields: [
      ...current.fields,
      { name: 'dp_score', type: 'number', nullable: true, classification: 'dp', unit: 'epsilon' }
    ]
  };

  const diffs = diffContracts(current, proposed);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].field, 'dp_score');
  assert.equal(diffs[0].change, 'added');
});

test('quarantine to recertification loop', () => {
  const registry = new QuarantineRegistry();
  const ca = new CertificateAuthority();
  const workflow = new CertificationWorkflow(ca);

  const spec: ContractSpec = {
    id: 'dpic-002',
    dataset: 'beta',
    version: '1.0.0',
    owner: 'beta',
    license: { name: 'CC-BY-4.0' },
    termsHash: '',
    fields: []
  };

  const record = registry.quarantine(spec.id, spec.version, 'no schema defined');
  assert.ok(record);
  assert.equal(registry.active().length, 1);

  spec.fields.push({ name: 'event_id', type: 'string', nullable: false });
  const { cert } = workflow.certify(spec);
  assert.ok(cert.signature);
  const resolved = registry.resolve(spec.id, spec.version, 'schema provided and certified');
  assert.ok(resolved?.releasedAt);
  assert.equal(registry.active().length, 0);
});

test('production ingest blocked without certification', () => {
  const ca = new CertificateAuthority();
  const workflow = new CertificationWorkflow(ca);

  const spec: ContractSpec = {
    id: 'dpic-003',
    dataset: 'gamma',
    version: '1.0.0',
    owner: 'gamma',
    license: { name: 'CC0' },
    termsHash: '',
    fields: [{ name: 'user_id', type: 'string', nullable: false, classification: 'pii' }]
  };

  assert.throws(() => workflow.enforceProductionGate(spec));
  workflow.certify(spec);
  assert.doesNotThrow(() => workflow.enforceProductionGate(spec));
});

test('dp and pii flags surface in validation', () => {
  const spec: ContractSpec = {
    id: 'dpic-004',
    dataset: 'delta',
    version: '1.0.0',
    owner: 'delta',
    license: { name: 'CC-BY-4.0' },
    termsHash: '',
    fields: [
      { name: 'user_id', type: 'string', nullable: false, classification: 'pii' },
      { name: 'privacy_budget', type: 'number', nullable: false, classification: 'dp', unit: 'epsilon' }
    ]
  };

  const specValidator = new ContractSpecification(spec);
  const findings = specValidator.validate();
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  assert.ok(warnings.length >= 1);
});
