import fs from 'node:fs';
import path from 'node:path';
import { validateFlakeRegistry } from '../lib/flake-registry';

const TEMP_DIR = path.join(__dirname, 'tmp-flake-registry');

function writeRegistry(contents: string): string {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, `flake-${Date.now()}-${Math.random()}.yml`);
  fs.writeFileSync(filePath, contents, 'utf8');
  return filePath;
}

afterAll(() => {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
});

test('valid registry passes', () => {
  const registryPath = writeRegistry(`version: 1
flakes:
  - id: unit-test-flake
    scope: unit-test
    target: jest:stable test
    owner: "@summit-release"
    ticket: https://github.com/summit/IntelGraph/issues/12999
    created: 2026-01-10
    expires: 2026-01-20
    rationale: intermittent timing issue
    mitigation: retry wrapper
`);
  const result = validateFlakeRegistry(registryPath, path.join('schemas', 'flake-registry.schema.json'), {
    maxDurationDays: 14,
    allowLonger: new Set<string>(),
  });
  expect(result.errors).toHaveLength(0);
});

test('missing owner and ticket fails', () => {
  const registryPath = writeRegistry(`version: 1
flakes:
  - id: missing-owner
    scope: unit-test
    target: jest:missing owner
    owner: ""
    ticket: ""
    created: 2026-01-10
    expires: 2026-01-20
    rationale: missing fields
    mitigation: retry wrapper
`);
  const result = validateFlakeRegistry(registryPath, path.join('schemas', 'flake-registry.schema.json'), {
    maxDurationDays: 14,
    allowLonger: new Set<string>(),
  });
  expect(result.errors.some((err) => err.includes('owner and ticket'))).toBe(true);
});

test('expired entry fails', () => {
  const registryPath = writeRegistry(`version: 1
flakes:
  - id: expired-entry
    scope: unit-test
    target: jest:expired
    owner: "@summit-release"
    ticket: https://github.com/summit/IntelGraph/issues/12999
    created: 2024-01-10
    expires: 2024-01-11
    rationale: expired
    mitigation: retry wrapper
`);
  const result = validateFlakeRegistry(registryPath, path.join('schemas', 'flake-registry.schema.json'), {
    maxDurationDays: 14,
    allowLonger: new Set<string>(),
  });
  expect(result.errors.some((err) => err.includes('is in the past'))).toBe(true);
});

test('overlong expiry fails', () => {
  const registryPath = writeRegistry(`version: 1
flakes:
  - id: overlong-entry
    scope: unit-test
    target: jest:overlong
    owner: "@summit-release"
    ticket: https://github.com/summit/IntelGraph/issues/12999
    created: 2026-01-01
    expires: 2026-02-01
    rationale: too long
    mitigation: retry wrapper
`);
  const result = validateFlakeRegistry(registryPath, path.join('schemas', 'flake-registry.schema.json'), {
    maxDurationDays: 14,
    allowLonger: new Set<string>(),
  });
  expect(result.errors.some((err) => err.includes('exceeds max'))).toBe(true);
});

test('broad target fails', () => {
  const registryPath = writeRegistry(`version: 1
flakes:
  - id: broad-target
    scope: unit-test
    target: "all tests"
    owner: "@summit-release"
    ticket: https://github.com/summit/IntelGraph/issues/12999
    created: 2026-01-10
    expires: 2026-01-20
    rationale: too broad
    mitigation: retry wrapper
`);
  const result = validateFlakeRegistry(registryPath, path.join('schemas', 'flake-registry.schema.json'), {
    maxDurationDays: 14,
    allowLonger: new Set<string>(),
  });
  expect(result.errors.some((err) => err.includes('too broad'))).toBe(true);
});
