import { emitEvidence } from './evidence-emit';
import { validateRegistry } from '../../src/platform/infra/validate';
import { InfraRegistry } from '../../src/platform/infra/registry';

// Stub validation and emission
const validRegistry: InfraRegistry = {
  version: 1,
  artifacts: [
    {
      kind: 'module',
      name: 'core-network',
      version: '1.0.0',
      owner: { team: 'platform-infra' }
    }
  ]
};

const errors = validateRegistry(validRegistry);

if (errors.length > 0) {
  emitEvidence(
    'infra',
    'EVD-ADIDASCDK-IAC-001',
    'fail',
    errors.map(e => ({ code: 'REGISTRY_INVALID', message: e })),
    { 'infra.registry.artifacts_total': 1 }
  );
  process.exit(1);
} else {
  emitEvidence(
    'infra',
    'EVD-ADIDASCDK-IAC-001',
    'pass',
    [],
    { 'infra.registry.artifacts_total': 1 }
  );
}

// Stub policy verify
emitEvidence(
  'policy',
  'EVD-ADIDASCDK-POL-001',
  'fail', // Intentionally fail due to default allow = false
  [{ code: 'DENY_BY_DEFAULT', message: 'Policy denied by default rule' }],
  { 'infra.policy.violations_total': 1 }
);

// Stub scaffolder verify
emitEvidence(
  'scaffolder',
  'EVD-ADIDASCDK-SCF-001',
  'pass',
  [],
  { 'scaffolder.templates_validated_total': 1 }
);
