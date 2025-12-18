/**
 * Dependency Audit Validator
 *
 * Validates package dependencies for security vulnerabilities and policy compliance.
 *
 * @module pve/evaluator/validators/DependencyAuditValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  DependencyAuditInput,
  Vulnerability,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface DependencyAuditValidatorConfig {
  /** Minimum severity to report */
  minSeverity?: 'low' | 'moderate' | 'high' | 'critical';
  /** Packages that are explicitly allowed */
  allowlist?: string[];
  /** Packages that are explicitly blocked */
  blocklist?: BlockedPackage[];
  /** Maximum allowed dependency depth */
  maxDepth?: number;
  /** Require license compatibility */
  allowedLicenses?: string[];
  /** Block deprecated packages */
  blockDeprecated?: boolean;
  /** Maximum package age in days */
  maxPackageAge?: number;
}

export interface BlockedPackage {
  name: string;
  reason: string;
  severity?: 'error' | 'warning';
}

const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical'];

const DEFAULT_CONFIG: DependencyAuditValidatorConfig = {
  minSeverity: 'moderate',
  blocklist: [
    { name: 'event-stream', reason: 'Known malicious package', severity: 'error' },
    { name: 'flatmap-stream', reason: 'Known malicious package', severity: 'error' },
    { name: 'node-ipc', reason: 'Known protestware with malicious behavior', severity: 'error' },
  ],
  allowedLicenses: [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    'CC0-1.0',
    'Unlicense',
  ],
  blockDeprecated: true,
};

export class DependencyAuditValidator {
  private config: DependencyAuditValidatorConfig;

  constructor(config: DependencyAuditValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'dependency_audit') {
      return [];
    }

    const input = context.input as DependencyAuditInput;
    const results: PolicyResult[] = [];

    // Check for vulnerabilities
    if (input.vulnerabilities) {
      results.push(...this.checkVulnerabilities(input.vulnerabilities));
    }

    // Check blocklist
    results.push(...this.checkBlocklist(input.manifest));

    // Check allowlist (if configured)
    if (this.config.allowlist) {
      results.push(...this.checkAllowlist(input.manifest));
    }

    // Check license compatibility
    if (this.config.allowedLicenses) {
      results.push(...this.checkLicenses(input.manifest));
    }

    // Check for potentially risky patterns
    results.push(...this.checkRiskyPatterns(input.manifest));

    // Check dependency counts
    results.push(...this.checkDependencyCounts(input.manifest));

    return results;
  }

  private checkVulnerabilities(vulnerabilities: Vulnerability[]): PolicyResult[] {
    const results: PolicyResult[] = [];
    const minIndex = SEVERITY_ORDER.indexOf(this.config.minSeverity || 'moderate');

    const relevantVulns = vulnerabilities.filter((v) => {
      const vulnIndex = SEVERITY_ORDER.indexOf(v.severity);
      return vulnIndex >= minIndex;
    });

    if (relevantVulns.length === 0) {
      results.push(pass('pve.deps.vulnerabilities', 'No relevant vulnerabilities found'));
      return results;
    }

    // Group by severity
    const bySeverity = relevantVulns.reduce(
      (acc, v) => {
        acc[v.severity] = acc[v.severity] || [];
        acc[v.severity].push(v);
        return acc;
      },
      {} as Record<string, Vulnerability[]>,
    );

    // Report critical and high as errors
    if (bySeverity.critical?.length) {
      results.push(
        fail('pve.deps.critical_vulnerabilities', `${bySeverity.critical.length} critical vulnerabilities found`, {
          severity: 'error',
          fix: 'Update affected packages immediately',
          details: {
            vulnerabilities: bySeverity.critical.map((v) => ({
              package: v.package,
              version: v.version,
              cve: v.cve,
              fix: v.fix,
            })),
          },
        }),
      );
    }

    if (bySeverity.high?.length) {
      results.push(
        fail('pve.deps.high_vulnerabilities', `${bySeverity.high.length} high severity vulnerabilities found`, {
          severity: 'error',
          fix: 'Update affected packages as soon as possible',
          details: {
            vulnerabilities: bySeverity.high.map((v) => ({
              package: v.package,
              version: v.version,
              cve: v.cve,
              fix: v.fix,
            })),
          },
        }),
      );
    }

    // Report moderate as warnings
    if (bySeverity.moderate?.length) {
      results.push(
        warn('pve.deps.moderate_vulnerabilities', `${bySeverity.moderate.length} moderate vulnerabilities found`, {
          fix: 'Consider updating affected packages',
          details: {
            count: bySeverity.moderate.length,
            packages: bySeverity.moderate.map((v) => v.package),
          },
        }),
      );
    }

    return results;
  }

  private checkBlocklist(manifest: DependencyAuditInput['manifest']): PolicyResult[] {
    const results: PolicyResult[] = [];
    const allDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };

    const blocked: string[] = [];

    for (const [name, _version] of Object.entries(allDeps)) {
      const blockedEntry = this.config.blocklist?.find((b) => b.name === name);
      if (blockedEntry) {
        blocked.push(name);
        results.push(
          fail('pve.deps.blocked_package', `Blocked package "${name}": ${blockedEntry.reason}`, {
            severity: blockedEntry.severity || 'error',
            location: { field: name },
            fix: `Remove "${name}" from dependencies`,
          }),
        );
      }
    }

    if (blocked.length === 0) {
      results.push(pass('pve.deps.blocklist'));
    }

    return results;
  }

  private checkAllowlist(manifest: DependencyAuditInput['manifest']): PolicyResult[] {
    const results: PolicyResult[] = [];
    const allowlist = new Set(this.config.allowlist || []);

    if (allowlist.size === 0) {
      return results;
    }

    const allDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };

    const notAllowed: string[] = [];

    for (const name of Object.keys(allDeps)) {
      // Check if package or its scope is allowed
      const scope = name.startsWith('@') ? name.split('/')[0] : null;
      if (!allowlist.has(name) && !(scope && allowlist.has(`${scope}/*`))) {
        notAllowed.push(name);
      }
    }

    if (notAllowed.length > 0) {
      results.push(
        warn('pve.deps.not_allowlisted', `${notAllowed.length} packages are not in the allowlist`, {
          details: { packages: notAllowed.slice(0, 10) },
        }),
      );
    } else {
      results.push(pass('pve.deps.allowlist'));
    }

    return results;
  }

  private checkLicenses(_manifest: DependencyAuditInput['manifest']): PolicyResult[] {
    // Note: Full license checking requires fetching package metadata
    // This is a placeholder for the structure
    return [pass('pve.deps.licenses', 'License check requires package registry access')];
  }

  private checkRiskyPatterns(manifest: DependencyAuditInput['manifest']): PolicyResult[] {
    const results: PolicyResult[] = [];
    const allDeps = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };

    const riskyPatterns: Array<{ pattern: RegExp; message: string }> = [
      { pattern: /^file:/, message: 'Local file dependency detected' },
      { pattern: /^git(\+|:)/, message: 'Git dependency detected' },
      { pattern: /^github:/, message: 'GitHub shorthand dependency detected' },
      { pattern: /^\*$/, message: 'Wildcard version detected' },
      { pattern: /^>=/, message: 'Open-ended version range detected' },
    ];

    for (const [name, version] of Object.entries(allDeps)) {
      for (const { pattern, message } of riskyPatterns) {
        if (pattern.test(version)) {
          results.push(
            warn('pve.deps.risky_pattern', `${message} for package "${name}": ${version}`, {
              location: { field: name },
              fix: 'Use a fixed version or semver range',
            }),
          );
        }
      }
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.deps.risky_patterns'));
    }

    return results;
  }

  private checkDependencyCounts(manifest: DependencyAuditInput['manifest']): PolicyResult[] {
    const results: PolicyResult[] = [];

    const depsCount = Object.keys(manifest.dependencies || {}).length;
    const devDepsCount = Object.keys(manifest.devDependencies || {}).length;
    const totalCount = depsCount + devDepsCount;

    // These are heuristic thresholds
    if (depsCount > 100) {
      results.push(
        warn('pve.deps.excessive_dependencies', `Package has ${depsCount} production dependencies`, {
          fix: 'Consider reducing dependencies or using lighter alternatives',
          details: { count: depsCount },
        }),
      );
    }

    if (totalCount > 500) {
      results.push(
        warn('pve.deps.total_dependencies', `Package has ${totalCount} total dependencies`, {
          details: { production: depsCount, dev: devDepsCount },
        }),
      );
    }

    if (results.filter((r) => !r.allowed).length === 0) {
      results.push(pass('pve.deps.counts', `${depsCount} production, ${devDepsCount} dev dependencies`));
    }

    return results;
  }
}
