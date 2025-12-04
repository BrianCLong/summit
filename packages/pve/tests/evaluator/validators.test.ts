/**
 * Validators Tests
 */

import { describe, it, expect } from 'vitest';
import { PRDiffValidator } from '../../src/evaluator/validators/PRDiffValidator.js';
import { SchemaDriftValidator } from '../../src/evaluator/validators/SchemaDriftValidator.js';
import { TSConfigValidator } from '../../src/evaluator/validators/TSConfigValidator.js';
import { AgentOutputValidator } from '../../src/evaluator/validators/AgentOutputValidator.js';
import { SecurityScanValidator } from '../../src/evaluator/validators/SecurityScanValidator.js';
import type { EvaluationContext } from '../../src/types/index.js';

describe('PRDiffValidator', () => {
  const validator = new PRDiffValidator();

  it('should pass for valid PR', async () => {
    const context: EvaluationContext = {
      type: 'pr_diff',
      input: {
        type: 'pr_diff',
        base: 'main',
        head: 'feature',
        files: [
          {
            path: 'src/index.ts',
            status: 'modified',
            additions: 10,
            deletions: 5,
          },
        ],
        pr: {
          title: 'Add new feature',
          body: 'This PR adds a new feature that does something useful.',
          author: 'developer',
          isDraft: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    };

    const results = await validator.validate(context);
    const errors = results.filter((r) => !r.allowed && r.severity === 'error');

    expect(errors).toHaveLength(0);
  });

  it('should detect forbidden files', async () => {
    const context: EvaluationContext = {
      type: 'pr_diff',
      input: {
        type: 'pr_diff',
        base: 'main',
        head: 'feature',
        files: [
          {
            path: '.env',
            status: 'added',
            additions: 5,
            deletions: 0,
          },
        ],
      },
    };

    const results = await validator.validate(context);
    const forbidden = results.filter((r) => r.policy === 'pve.pr.forbidden_file' && !r.allowed);

    expect(forbidden.length).toBeGreaterThan(0);
  });

  it('should detect secrets in patches', async () => {
    const context: EvaluationContext = {
      type: 'pr_diff',
      input: {
        type: 'pr_diff',
        base: 'main',
        head: 'feature',
        files: [
          {
            path: 'src/config.ts',
            status: 'modified',
            additions: 1,
            deletions: 0,
            patch: '+const apiKey = "AKIAIOSFODNN7EXAMPLE";',
          },
        ],
      },
    };

    const results = await validator.validate(context);
    const sensitive = results.filter((r) => r.policy === 'pve.pr.sensitive_content' && !r.allowed);

    expect(sensitive.length).toBeGreaterThan(0);
  });

  it('should warn about large PRs', async () => {
    const context: EvaluationContext = {
      type: 'pr_diff',
      input: {
        type: 'pr_diff',
        base: 'main',
        head: 'feature',
        files: Array(60).fill({
          path: 'src/file.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
        }),
      },
    };

    const results = await validator.validate(context);
    const fileCount = results.find((r) => r.policy === 'pve.pr.max_files');

    expect(fileCount?.allowed).toBe(false);
  });
});

describe('SchemaDriftValidator', () => {
  const validator = new SchemaDriftValidator();

  it('should pass for compatible changes', async () => {
    const context: EvaluationContext = {
      type: 'schema_drift',
      input: {
        type: 'schema_drift',
        schemaType: 'json_schema',
        previous: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['id'],
        },
        current: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['id'],
        },
      },
    };

    const results = await validator.validate(context);
    const breaking = results.filter((r) => r.policy === 'pve.schema.breaking_change' && !r.allowed);

    expect(breaking).toHaveLength(0);
  });

  it('should detect breaking changes', async () => {
    const context: EvaluationContext = {
      type: 'schema_drift',
      input: {
        type: 'schema_drift',
        schemaType: 'json_schema',
        previous: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
        current: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    };

    const results = await validator.validate(context);

    // Should detect field removal
    expect(results.some((r) => r.policy.includes('schema') && !r.allowed)).toBe(true);
  });
});

describe('TSConfigValidator', () => {
  const validator = new TSConfigValidator();

  it('should pass for valid config', async () => {
    const context: EvaluationContext = {
      type: 'tsconfig_integrity',
      input: {
        type: 'tsconfig_integrity',
        config: {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            esModuleInterop: true,
            skipLibCheck: true,
            resolveJsonModule: true,
            strict: true,
          },
        },
        filePath: 'tsconfig.json',
      },
    };

    const results = await validator.validate(context);
    const errors = results.filter((r) => !r.allowed && r.severity === 'error');

    expect(errors).toHaveLength(0);
  });

  it('should warn about missing options', async () => {
    const context: EvaluationContext = {
      type: 'tsconfig_integrity',
      input: {
        type: 'tsconfig_integrity',
        config: {
          compilerOptions: {
            target: 'ES5',
          },
        },
        filePath: 'tsconfig.json',
      },
    };

    const results = await validator.validate(context);
    const warnings = results.filter((r) => !r.allowed);

    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('AgentOutputValidator', () => {
  const validator = new AgentOutputValidator();

  it('should pass for valid output', async () => {
    const context: EvaluationContext = {
      type: 'agent_output',
      input: {
        type: 'agent_output',
        agentId: 'claude-1',
        agentType: 'claude',
        output: {
          outputType: 'code',
          files: [
            {
              path: 'src/feature.ts',
              content: 'export function feature() { return true; }',
              action: 'create',
            },
          ],
        },
      },
    };

    const results = await validator.validate(context);
    const errors = results.filter((r) => !r.allowed && r.severity === 'error');

    expect(errors).toHaveLength(0);
  });

  it('should detect forbidden paths', async () => {
    const context: EvaluationContext = {
      type: 'agent_output',
      input: {
        type: 'agent_output',
        agentId: 'claude-1',
        agentType: 'claude',
        output: {
          outputType: 'code',
          files: [
            {
              path: '.env',
              content: 'API_KEY=secret',
              action: 'create',
            },
          ],
        },
      },
    };

    const results = await validator.validate(context);
    const forbidden = results.filter((r) => r.policy === 'pve.agent.forbidden_path' && !r.allowed);

    expect(forbidden.length).toBeGreaterThan(0);
  });

  it('should detect hardcoded secrets', async () => {
    const context: EvaluationContext = {
      type: 'agent_output',
      input: {
        type: 'agent_output',
        agentId: 'claude-1',
        agentType: 'claude',
        output: {
          outputType: 'code',
          files: [
            {
              path: 'src/config.ts',
              content: 'const password = "supersecret123";',
              action: 'create',
            },
          ],
        },
      },
    };

    const results = await validator.validate(context);
    const secrets = results.filter((r) => r.policy === 'pve.agent.hardcoded_secret' && !r.allowed);

    expect(secrets.length).toBeGreaterThan(0);
  });
});

describe('SecurityScanValidator', () => {
  const validator = new SecurityScanValidator();

  it('should detect AWS keys', async () => {
    const context: EvaluationContext = {
      type: 'security_scan',
      input: {
        type: 'security_scan',
        scanType: 'secrets',
        content: 'const key = "AKIAIOSFODNN7EXAMPLE";',
        filePaths: ['src/config.ts'],
      },
    };

    const results = await validator.validate(context);
    const secrets = results.filter((r) => r.policy.includes('secret') && !r.allowed);

    expect(secrets.length).toBeGreaterThan(0);
  });

  it('should detect GitHub tokens', async () => {
    const context: EvaluationContext = {
      type: 'security_scan',
      input: {
        type: 'security_scan',
        scanType: 'secrets',
        content: 'const token = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890";',
        filePaths: ['src/github.ts'],
      },
    };

    const results = await validator.validate(context);
    const secrets = results.filter((r) => r.policy.includes('secret') && !r.allowed);

    expect(secrets.length).toBeGreaterThan(0);
  });

  it('should detect SQL injection patterns', async () => {
    const context: EvaluationContext = {
      type: 'security_scan',
      input: {
        type: 'security_scan',
        scanType: 'sast',
        content: 'db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);',
        filePaths: ['src/db.ts'],
      },
    };

    const results = await validator.validate(context);
    const sast = results.filter((r) => r.policy.includes('sast') && !r.allowed);

    expect(sast.length).toBeGreaterThan(0);
  });

  it('should pass for clean code', async () => {
    const context: EvaluationContext = {
      type: 'security_scan',
      input: {
        type: 'security_scan',
        scanType: 'secrets',
        content: 'const config = { apiUrl: process.env.API_URL };',
        filePaths: ['src/config.ts'],
      },
    };

    const results = await validator.validate(context);
    const issues = results.filter((r) => !r.allowed && r.severity === 'error');

    expect(issues).toHaveLength(0);
  });
});
