# @summit/pve - Policy Validation Engine

OPA-driven governance and invariant enforcement for the Summit platform.

## Overview

PVE (Policy Validation Engine) provides unified policy enforcement across:
- Pull request validation
- Schema drift detection
- Metadata invariants
- Agent output governance
- CI/CD integrity
- Security scanning
- Dependency auditing

## Installation

```bash
pnpm add @summit/pve
```

## Quick Start

### Basic Usage

```typescript
import { createPolicyEngine, validate } from '@summit/pve';

// Quick validation
const report = await validate({
  type: 'pr_diff',
  input: {
    type: 'pr_diff',
    base: 'main',
    head: 'feature-branch',
    files: [
      { path: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 }
    ]
  }
});

if (report.passed) {
  console.log('All checks passed!');
} else {
  console.log('Validation failed:', report.results.filter(r => !r.allowed));
}
```

### PR Validation

```typescript
import { createPRValidator } from '@summit/pve';

const validator = createPRValidator({
  owner: 'your-org',
  repo: 'your-repo',
  githubToken: process.env.GITHUB_TOKEN
});

// Validate from diff string
const result = await validator.validateDiff(diffString, {
  title: 'Add new feature',
  body: 'This PR adds...',
  author: 'developer'
});

// Or validate directly from GitHub
const result = await validator.validateFromGitHub(prNumber);
```

### Agent Output Validation

```typescript
import { createPolicyEngine } from '@summit/pve';

const engine = createPolicyEngine();

const report = await engine.evaluate({
  type: 'agent_output',
  input: {
    type: 'agent_output',
    agentId: 'claude-1',
    agentType: 'claude',
    output: {
      outputType: 'code',
      files: [
        { path: 'src/feature.ts', content: '...', action: 'create' }
      ]
    }
  }
});
```

### Security Scanning

```typescript
import { SecurityScanValidator } from '@summit/pve';

const scanner = new SecurityScanValidator();

const results = await scanner.validate({
  type: 'security_scan',
  input: {
    type: 'security_scan',
    scanType: 'secrets',
    content: fileContent,
    filePaths: ['src/config.ts']
  }
});
```

## Built-in Validators

| Validator | Purpose |
|-----------|---------|
| `PRDiffValidator` | Validates PR size, forbidden files, secrets in patches |
| `SchemaDriftValidator` | Detects breaking schema changes |
| `TSConfigValidator` | Validates TypeScript configuration |
| `AgentOutputValidator` | Validates AI agent outputs |
| `MetadataInvariantValidator` | Enforces metadata schemas |
| `CIIntegrityValidator` | Validates CI/CD configurations |
| `DependencyAuditValidator` | Checks dependencies for vulnerabilities |
| `SecurityScanValidator` | Scans for secrets and SAST patterns |

## Rego Policies

PVE includes built-in Rego policies for OPA evaluation:

```
src/policies/
├── repo/
│   ├── schema-drift.rego
│   ├── tsconfig-integrity.rego
│   ├── metadata-invariants.rego
│   └── ci-integrity.rego
├── agents/
│   └── agent-output.rego
├── schema/
│   └── api-surface.rego
└── ci/
    └── pr-validation.rego
```

## Custom Validators

```typescript
import { createPolicyEngine, type CustomValidator } from '@summit/pve';

const myValidator: CustomValidator = {
  id: 'my-company.custom-check',
  handles: ['pr_diff'],
  validate: async (context) => {
    // Your validation logic
    return [
      { policy: 'my-company.custom-check', allowed: true }
    ];
  }
};

const engine = createPolicyEngine({
  validators: [myValidator]
});
```

## CI Integration

### GitHub Actions

```yaml
- name: PVE Policy Validation
  run: |
    node --loader ts-node/esm packages/pve/scripts/validate-pr.ts
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    PR_NUMBER: ${{ github.event.pull_request.number }}
```

### Pre-commit Hook

```bash
#!/bin/bash
npx ts-node packages/pve/scripts/validate-pr.ts
```

## API Reference

### PolicyEngine

```typescript
class PolicyEngine {
  constructor(config?: PolicyEngineConfig);
  evaluate(context: EvaluationContext, options?: EvaluationOptions): Promise<EvaluationReport>;
  assertAll(context: EvaluationContext, options?: EvaluationOptions): Promise<void>;
  getPolicies(): PolicyConfig[];
  registerValidator(validator: CustomValidator): void;
}
```

### PolicyResult Helpers

```typescript
// Create passing result
pass(policy: string, message?: string): PolicyResult

// Create failing result
fail(policy: string, message: string, options?: FailOptions): PolicyResult

// Create warning
warn(policy: string, message: string, options?: WarnOptions): PolicyResult

// Aggregate results
aggregateResults(results: PolicyResult[]): AggregateResult

// Format for display
formatResults(results: PolicyResult[], options?: FormatOptions): string
```

## Configuration

```typescript
interface PolicyEngineConfig {
  policiesDir?: string;        // Directory containing policy files
  opa?: OPAConfig;             // OPA adapter configuration
  useBuiltIn?: boolean;        // Use built-in policies (default: true)
  validators?: CustomValidator[]; // Custom validators
  failFast?: boolean;          // Stop on first error
  defaultSeverity?: PolicySeverity;
  cacheResults?: boolean;      // Cache evaluation results
}
```

## License

MIT
