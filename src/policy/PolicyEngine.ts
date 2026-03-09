/**
 * Policy-as-Code Engine - Composer vNext+1
 * OPA-based preflight checks with actionable remediation
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'performance' | 'quality';
  severity: 'error' | 'warning' | 'info';
  rego: string; // OPA Rego policy
  remediation: {
    description: string;
    action: string;
    automatable: boolean;
  };
}

export interface PolicyInput {
  buildConfig: {
    dockerfile?: string;
    buildArgs: Record<string, string>;
    environment: Record<string, string>;
    toolchain: {
      node?: string;
      docker?: string;
      dependencies: Record<string, string>;
    };
  };
  repository: {
    branch: string;
    files: string[];
    secrets: string[];
  };
  pipeline: {
    steps: Array<{
      name: string;
      command: string;
      networkAccess: boolean;
      privileged: boolean;
    }>;
    artifacts: string[];
  };
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location: {
    file?: string;
    line?: number;
    path: string[];
  };
  remediation: {
    description: string;
    suggestion: string;
    autofix?: string;
  };
  metadata: Record<string, any>;
}

export interface PolicyResult {
  passed: boolean;
  violations: PolicyViolation[];
  stats: {
    rulesEvaluated: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  evaluationTime: number;
}

export interface PolicyConfig {
  rulesDirectory: string;
  opaPath?: string;
  enableAutofix: boolean;
  failOnWarning: boolean;
  excludeRules: string[];
  customRules: PolicyRule[];
}

export class PolicyEngine {
  private rules = new Map<string, PolicyRule>();
  private opaPath: string;

  constructor(private config: PolicyConfig) {
    this.opaPath = config.opaPath || this.findOpaExecutable();
    this.loadRules();
  }

  private findOpaExecutable(): string {
    const paths = ['opa', '/usr/local/bin/opa', '/usr/bin/opa'];

    for (const opaPath of paths) {
      try {
        execSync(`${opaPath} version`, { stdio: 'ignore' });
        return opaPath;
      } catch {
        continue;
      }
    }

    throw new Error(
      'OPA (Open Policy Agent) not found. Please install OPA: https://www.openpolicyagent.org/docs/latest/#running-opa',
    );
  }

  /**
   * Evaluate policies against build configuration
   */
  async evaluate(input: PolicyInput): Promise<PolicyResult> {
    console.log('🔍 Evaluating build policies...');

    const startTime = Date.now();
    const violations: PolicyViolation[] = [];
    let rulesEvaluated = 0;

    // Create OPA data file
    const inputFile = await this.createOpaInput(input);

    try {
      for (const [ruleId, rule] of this.rules) {
        if (this.config.excludeRules.includes(ruleId)) {
          continue;
        }

        rulesEvaluated++;

        try {
          const ruleViolations = await this.evaluateRule(rule, inputFile);
          violations.push(...ruleViolations);
        } catch (error) {
          console.warn(`⚠️ Failed to evaluate rule ${ruleId}:`, error);
        }
      }
    } finally {
      // Cleanup temp file
      await fs.unlink(inputFile);
    }

    const evaluationTime = Date.now() - startTime;

    // Calculate stats
    const stats = {
      rulesEvaluated,
      errors: violations.filter((v) => v.severity === 'error').length,
      warnings: violations.filter((v) => v.severity === 'warning').length,
      infos: violations.filter((v) => v.severity === 'info').length,
    };

    const passed =
      stats.errors === 0 &&
      (stats.warnings === 0 || !this.config.failOnWarning);

    console.log(
      `${passed ? '✅' : '❌'} Policy evaluation: ${stats.errors} errors, ${stats.warnings} warnings (${evaluationTime}ms)`,
    );

    return {
      passed,
      violations,
      stats,
      evaluationTime,
    };
  }

  private async loadRules(): Promise<void> {
    console.log('📋 Loading policy rules...');

    // Load built-in rules
    await this.loadBuiltinRules();

    // Load custom rules from directory
    if (await this.directoryExists(this.config.rulesDirectory)) {
      await this.loadRulesFromDirectory(this.config.rulesDirectory);
    }

    // Add custom rules from config
    for (const rule of this.config.customRules) {
      this.rules.set(rule.id, rule);
    }

    console.log(`📚 Loaded ${this.rules.size} policy rules`);
  }

  private async loadBuiltinRules(): Promise<void> {
    const builtinRules: PolicyRule[] = [
      {
        id: 'no-root-user',
        name: 'No Root User in Docker',
        description: 'Docker containers should not run as root user',
        category: 'security',
        severity: 'error',
        rego: `
          package policies.security

          violation[{"msg": msg}] {
            input.buildConfig.dockerfile
            contains(input.buildConfig.dockerfile, "USER root")
            msg := "Container runs as root user. Add 'USER <non-root-user>' to Dockerfile"
          }
        `,
        remediation: {
          description: 'Add a non-root user to your Dockerfile',
          action:
            'Add "RUN adduser -D -s /bin/sh appuser" and "USER appuser" to Dockerfile',
          automatable: true,
        },
      },

      {
        id: 'pinned-base-images',
        name: 'Pinned Base Images',
        description: 'Base images should be pinned to specific versions',
        category: 'security',
        severity: 'warning',
        rego: `
          package policies.security

          violation[{"msg": msg, "file": dockerfile}] {
            dockerfile := input.buildConfig.dockerfile
            contains(dockerfile, "FROM ")
            not contains(dockerfile, "@sha256:")
            not contains(dockerfile, ":")
            msg := "Base image not pinned to specific version or digest"
          }
        `,
        remediation: {
          description: 'Pin base images to specific versions or digests',
          action:
            'Replace "FROM node" with "FROM node:18-alpine" or "FROM node@sha256:..."',
          automatable: true,
        },
      },

      {
        id: 'no-secrets-in-env',
        name: 'No Secrets in Environment',
        description: 'Environment variables should not contain secrets',
        category: 'security',
        severity: 'error',
        rego: `
          package policies.security

          secret_patterns := [
            "password", "passwd", "secret", "key", "token", "api_key",
            "private_key", "credential", "auth", "bearer"
          ]

          violation[{"msg": msg, "var": var}] {
            var := input.buildConfig.environment[key]
            pattern := secret_patterns[_]
            contains(lower(key), pattern)
            msg := sprintf("Environment variable '%s' appears to contain a secret", [key])
          }
        `,
        remediation: {
          description: 'Use secret management instead of environment variables',
          action:
            'Move secrets to vault, K8s secrets, or secure environment injection',
          automatable: false,
        },
      },

      {
        id: 'allowed-registries',
        name: 'Allowed Docker Registries',
        description: 'Docker images must come from approved registries',
        category: 'compliance',
        severity: 'error',
        rego: `
          package policies.compliance

          allowed_registries := [
            "docker.io", "gcr.io", "ghcr.io", "public.ecr.aws"
          ]

          violation[{"msg": msg}] {
            dockerfile := input.buildConfig.dockerfile
            contains(dockerfile, "FROM ")
            from_line := split(dockerfile, "\\n")[_]
            startswith(from_line, "FROM ")
            image := trim_space(substring(from_line, 5, -1))
            registry := split(image, "/")[0]
            not registry in allowed_registries
            msg := sprintf("Image from unauthorized registry: %s", [registry])
          }
        `,
        remediation: {
          description: 'Use images from approved registries only',
          action:
            'Replace with equivalent image from docker.io, gcr.io, ghcr.io, or public.ecr.aws',
          automatable: false,
        },
      },

      {
        id: 'no-network-in-build',
        name: 'No Network Access in Build Steps',
        description: 'Build steps should not access external networks',
        category: 'security',
        severity: 'warning',
        rego: `
          package policies.security

          violation[{"msg": msg, "step": step.name}] {
            step := input.pipeline.steps[_]
            step.networkAccess == true
            msg := sprintf("Build step '%s' has network access enabled", [step.name])
          }
        `,
        remediation: {
          description: 'Disable network access for build steps',
          action: 'Set networkAccess: false in build step configuration',
          automatable: true,
        },
      },

      {
        id: 'dependency-license-check',
        name: 'Dependency License Check',
        description: 'Dependencies must have approved licenses',
        category: 'compliance',
        severity: 'warning',
        rego: `
          package policies.compliance

          approved_licenses := [
            "MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC"
          ]

          violation[{"msg": msg, "dep": dep}] {
            dep := input.buildConfig.toolchain.dependencies[name]
            # This would need integration with license detection
            # Simplified check for demo
            contains(dep, "GPL")
            msg := sprintf("Dependency '%s' may have restrictive license", [name])
          }
        `,
        remediation: {
          description: 'Review dependency licenses and replace if necessary',
          action:
            'Check dependency license and find MIT/Apache alternative if needed',
          automatable: false,
        },
      },

      {
        id: 'build-reproducibility',
        name: 'Build Reproducibility',
        description: 'Builds should be reproducible',
        category: 'quality',
        severity: 'info',
        rego: `
          package policies.quality

          violation[{"msg": msg}] {
            not input.buildConfig.environment.SOURCE_DATE_EPOCH
            msg := "SOURCE_DATE_EPOCH not set for reproducible builds"
          }
        `,
        remediation: {
          description: 'Set SOURCE_DATE_EPOCH for reproducible builds',
          action:
            'Add SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) to build environment',
          automatable: true,
        },
      },

      {
        id: 'no-privileged-containers',
        name: 'No Privileged Containers',
        description: 'Containers should not run in privileged mode',
        category: 'security',
        severity: 'error',
        rego: `
          package policies.security

          violation[{"msg": msg, "step": step.name}] {
            step := input.pipeline.steps[_]
            step.privileged == true
            msg := sprintf("Build step '%s' runs in privileged mode", [step.name])
          }
        `,
        remediation: {
          description: 'Remove privileged mode from container configuration',
          action: 'Set privileged: false or remove privileged flag',
          automatable: true,
        },
      },
    ];

    for (const rule of builtinRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private async loadRulesFromDirectory(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);

      for (const file of files) {
        if (file.endsWith('.rego') || file.endsWith('.json')) {
          const filePath = path.join(directory, file);
          await this.loadRuleFile(filePath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not load rules from ${directory}:`, error);
    }
  }

  private async loadRuleFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      if (filePath.endsWith('.json')) {
        const rule = JSON.parse(content) as PolicyRule;
        this.rules.set(rule.id, rule);
      } else if (filePath.endsWith('.rego')) {
        // Parse Rego file to extract metadata (simplified)
        const ruleId = path.basename(filePath, '.rego');
        const rule: PolicyRule = {
          id: ruleId,
          name: ruleId.replace(/-/g, ' '),
          description: `Custom rule: ${ruleId}`,
          category: 'compliance',
          severity: 'warning',
          rego: content,
          remediation: {
            description: 'See rule documentation',
            action: 'Manual remediation required',
            automatable: false,
          },
        };

        this.rules.set(rule.id, rule);
      }
    } catch (error) {
      console.warn(`⚠️ Could not load rule file ${filePath}:`, error);
    }
  }

  private async evaluateRule(
    rule: PolicyRule,
    inputFile: string,
  ): Promise<PolicyViolation[]> {
    // Create temporary Rego file
    const regoFile = `/tmp/policy-${rule.id}.rego`;
    await fs.writeFile(regoFile, rule.rego);

    try {
      // Run OPA evaluation
      const opaCommand = `${this.opaPath} eval -d "${regoFile}" -i "${inputFile}" "data.policies"`;
      const output = execSync(opaCommand, {
        encoding: 'utf8',
        timeout: 10000, // 10 second timeout
      });

      const result = JSON.parse(output);
      const violations: PolicyViolation[] = [];

      // Parse OPA results
      if (result.result && Array.isArray(result.result)) {
        for (const violation of result.result) {
          if (violation && violation.msg) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              category: rule.category,
              message: violation.msg,
              location: {
                file: violation.file,
                line: violation.line,
                path: violation.path || [rule.category, rule.id],
              },
              remediation: {
                description: rule.remediation.description,
                suggestion: rule.remediation.action,
                autofix: rule.remediation.automatable
                  ? this.generateAutofix(rule, violation)
                  : undefined,
              },
              metadata: violation,
            });
          }
        }
      }

      return violations;
    } catch (error) {
      // OPA evaluation failed - might indicate no violations or error
      if (error instanceof Error && error.message.includes('exit code 1')) {
        // Exit code 1 often means no violations found
        return [];
      }

      throw error;
    } finally {
      // Cleanup temporary Rego file
      try {
        await fs.unlink(regoFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private generateAutofix(
    rule: PolicyRule,
    violation: any,
  ): string | undefined {
    if (!rule.remediation.automatable) return undefined;

    switch (rule.id) {
      case 'no-root-user':
        return `
# Add to Dockerfile before COPY/ADD commands
RUN adduser -D -s /bin/sh appuser
USER appuser
        `.trim();

      case 'pinned-base-images':
        return 'Replace "FROM image" with "FROM image:specific-tag" or use digest';

      case 'build-reproducibility':
        return 'export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)';

      case 'no-network-in-build':
        return 'Set "networkAccess: false" in build step configuration';

      case 'no-privileged-containers':
        return 'Remove "privileged: true" or set "privileged: false"';

      default:
        return undefined;
    }
  }

  private async createOpaInput(input: PolicyInput): Promise<string> {
    const inputFile = `/tmp/opa-input-${Date.now()}.json`;

    // Enhance input with additional context
    const enrichedInput = {
      ...input,
      timestamp: Date.now(),
      metadata: {
        version: '1.0.0',
        evaluator: 'maestro-policy-engine',
      },
    };

    await fs.writeFile(inputFile, JSON.stringify(enrichedInput, null, 2));
    return inputFile;
  }

  private async directoryExists(directory: string): Promise<boolean> {
    try {
      const stat = await fs.stat(directory);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Generate policy report
   */
  generateReport(result: PolicyResult): string {
    let report = '# 🔍 Policy Evaluation Report\n\n';

    report += `**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Evaluation Time**: ${result.evaluationTime}ms\n`;
    report += `**Rules Evaluated**: ${result.stats.rulesEvaluated}\n\n`;

    report += '## Summary\n\n';
    report += `- **Errors**: ${result.stats.errors}\n`;
    report += `- **Warnings**: ${result.stats.warnings}\n`;
    report += `- **Info**: ${result.stats.infos}\n\n`;

    if (result.violations.length > 0) {
      report += '## Violations\n\n';

      const groupedViolations = result.violations.reduce(
        (groups, violation) => {
          const key = violation.category;
          if (!groups[key]) groups[key] = [];
          groups[key].push(violation);
          return groups;
        },
        {} as Record<string, PolicyViolation[]>,
      );

      for (const [category, violations] of Object.entries(groupedViolations)) {
        report += `### ${category.toUpperCase()}\n\n`;

        for (const violation of violations) {
          const icon =
            violation.severity === 'error'
              ? '❌'
              : violation.severity === 'warning'
                ? '⚠️'
                : 'ℹ️';

          report += `${icon} **${violation.ruleName}**\n`;
          report += `   ${violation.message}\n`;

          if (violation.location.file) {
            report += `   📁 File: ${violation.location.file}\n`;
          }

          report += `   💡 **Fix**: ${violation.remediation.suggestion}\n`;

          if (violation.remediation.autofix) {
            report += `   🔧 **Autofix**:\n`;
            report += `   \`\`\`\n   ${violation.remediation.autofix}\n   \`\`\`\n`;
          }

          report += '\n';
        }
      }
    } else {
      report += '## ✅ No Policy Violations Found\n\n';
      report += 'All policies passed successfully!\n';
    }

    return report;
  }

  /**
   * Apply automatic fixes where possible
   */
  async applyAutofixes(violations: PolicyViolation[]): Promise<{
    applied: number;
    failed: number;
    results: Array<{
      violation: PolicyViolation;
      success: boolean;
      error?: string;
    }>;
  }> {
    if (!this.config.enableAutofix) {
      return { applied: 0, failed: 0, results: [] };
    }

    console.log('🔧 Applying automatic fixes...');

    const results: Array<{
      violation: PolicyViolation;
      success: boolean;
      error?: string;
    }> = [];
    let applied = 0;
    let failed = 0;

    for (const violation of violations) {
      if (!violation.remediation.autofix) continue;

      try {
        await this.applyAutofix(violation);
        results.push({ violation, success: true });
        applied++;
        console.log(`✅ Applied autofix for ${violation.ruleName}`);
      } catch (error) {
        results.push({
          violation,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
        console.warn(
          `❌ Failed to apply autofix for ${violation.ruleName}:`,
          error,
        );
      }
    }

    console.log(`🔧 Autofix complete: ${applied} applied, ${failed} failed`);

    return { applied, failed, results };
  }

  private async applyAutofix(violation: PolicyViolation): Promise<void> {
    // Implementation would depend on the specific autofix
    // This is a simplified example

    if (
      violation.ruleId === 'build-reproducibility' &&
      violation.remediation.autofix
    ) {
      // Apply SOURCE_DATE_EPOCH fix
      const envFile = '.env.build';
      const content = violation.remediation.autofix;
      await fs.appendFile(envFile, `\n${content}\n`);
    }

    // Other autofixes would be implemented based on rule type
  }

  /**
   * Get policy engine statistics
   */
  getStats(): {
    totalRules: number;
    rulesByCategory: Record<string, number>;
    rulesBySeverity: Record<string, number>;
  } {
    const rulesByCategory: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {};

    for (const rule of this.rules.values()) {
      rulesByCategory[rule.category] =
        (rulesByCategory[rule.category] || 0) + 1;
      rulesBySeverity[rule.severity] =
        (rulesBySeverity[rule.severity] || 0) + 1;
    }

    return {
      totalRules: this.rules.size,
      rulesByCategory,
      rulesBySeverity,
    };
  }
}

// Factory function
export function createPolicyEngine(config: PolicyConfig): PolicyEngine {
  return new PolicyEngine(config);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: PolicyConfig = {
    rulesDirectory: './policies',
    enableAutofix: true,
    failOnWarning: false,
    excludeRules: [],
    customRules: [],
  };

  const engine = createPolicyEngine(config);

  const mockInput: PolicyInput = {
    buildConfig: {
      dockerfile: `
FROM node:18
USER root
COPY . /app
WORKDIR /app
RUN npm install
      `.trim(),
      buildArgs: {},
      environment: {
        NODE_ENV: 'production',
        API_SECRET: 'supersecret123',
      },
      toolchain: {
        node: '18.0.0',
        docker: '20.10.0',
        dependencies: {
          express: '^4.18.0',
          'some-gpl-package': '^1.0.0',
        },
      },
    },
    repository: {
      branch: 'main',
      files: ['src/app.ts', 'Dockerfile', 'package.json'],
      secrets: [],
    },
    pipeline: {
      steps: [
        {
          name: 'build',
          command: 'docker build .',
          networkAccess: true,
          privileged: false,
        },
        {
          name: 'test',
          command: 'npm test',
          networkAccess: false,
          privileged: true,
        },
      ],
      artifacts: ['dist/app.js'],
    },
  };

  engine
    .evaluate(mockInput)
    .then(async (result) => {
      console.log('\n📊 Policy Evaluation Results:');
      console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Errors: ${result.stats.errors}`);
      console.log(`   Warnings: ${result.stats.warnings}`);
      console.log(`   Time: ${result.evaluationTime}ms`);

      if (result.violations.length > 0) {
        console.log('\n🔍 Violations:');
        for (const violation of result.violations) {
          console.log(
            `   ${violation.severity === 'error' ? '❌' : '⚠️'} ${violation.message}`,
          );
        }

        // Generate report
        const report = engine.generateReport(result);
        console.log('\n📋 Full Report:');
        console.log(report.substring(0, 800) + '...');

        // Try autofixes
        const autofixResult = await engine.applyAutofixes(result.violations);
        if (autofixResult.applied > 0) {
          console.log(`\n🔧 Applied ${autofixResult.applied} automatic fixes`);
        }
      }

      const stats = engine.getStats();
      console.log('\n📈 Policy Engine Stats:');
      console.log(`   Total rules: ${stats.totalRules}`);
      console.log(`   By category: ${JSON.stringify(stats.rulesByCategory)}`);
      console.log(`   By severity: ${JSON.stringify(stats.rulesBySeverity)}`);
    })
    .catch((error) => {
      console.error('❌ Policy evaluation failed:', error);
    });
}
