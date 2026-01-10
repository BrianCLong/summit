/**
 * OPA Policy Gate Module
 *
 * Provides policy enforcement for CLI operations using OPA (Open Policy Agent).
 * In CI mode, policy must be present (fail-closed).
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';

// Exit code for policy/configuration errors
export const POLICY_EXIT_CODE = 2;

/**
 * Action types that can be evaluated by policy
 */
export type ActionType = 'write_patch' | 'read_file' | 'exec_tool' | 'network';

/**
 * Policy action schema
 */
export const PolicyActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('write_patch'),
    files: z.array(z.string()),
    diff_bytes: z.number(),
  }),
  z.object({
    type: z.literal('read_file'),
    path: z.string(),
  }),
  z.object({
    type: z.literal('exec_tool'),
    tool: z.string(),
    args: z.array(z.string()),
  }),
  z.object({
    type: z.literal('network'),
    kind: z.string(),
  }),
]);

export type PolicyAction = z.infer<typeof PolicyActionSchema>;

/**
 * Policy input schema - sent to OPA for evaluation
 */
export const PolicyInputSchema = z.object({
  command: z.string(),
  flags: z.object({
    ci: z.boolean(),
    write: z.boolean(),
    policy_present: z.boolean(),
  }),
  repo_root: z.string(),
  actions: z.array(PolicyActionSchema),
});

export type PolicyInput = z.infer<typeof PolicyInputSchema>;

/**
 * Policy decision schema - returned from OPA
 */
export const PolicyDecisionSchema = z.object({
  allow: z.boolean(),
  deny_reasons: z.array(z.string()).optional().default([]),
  limits: z.object({
    max_files: z.number().optional(),
    max_diff_bytes: z.number().optional(),
  }).optional(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

/**
 * Policy evaluation options
 */
export interface PolicyOptions {
  policyBundle?: string;
  ci: boolean;
  repoRoot: string;
}

/**
 * Stable JSON stringify for deterministic output
 */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort(), 2);
}

/**
 * Sort actions deterministically for policy evaluation
 */
export function sortActions(actions: PolicyAction[]): PolicyAction[] {
  return [...actions].sort((a, b) => {
    // First sort by type
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) return typeCompare;

    // Then sort by type-specific fields
    switch (a.type) {
      case 'write_patch':
        return (a as { files: string[] }).files.join(',').localeCompare(
          (b as { files: string[] }).files.join(',')
        );
      case 'read_file':
        return (a as { path: string }).path.localeCompare((b as { path: string }).path);
      case 'exec_tool':
        return (a as { tool: string }).tool.localeCompare((b as { tool: string }).tool);
      case 'network':
        return (a as { kind: string }).kind.localeCompare((b as { kind: string }).kind);
      default:
        return 0;
    }
  }).map(action => {
    // Sort files arrays within write_patch actions
    if (action.type === 'write_patch') {
      return {
        ...action,
        files: [...action.files].sort(),
      };
    }
    // Sort args arrays within exec_tool actions
    if (action.type === 'exec_tool') {
      return {
        ...action,
        args: [...action.args].sort(),
      };
    }
    return action;
  });
}

/**
 * Check if OPA is available on the system
 */
export function isOpaAvailable(): boolean {
  try {
    const result = spawnSync('opa', ['version'], { encoding: 'utf-8', timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Load and validate policy bundle
 */
export function loadPolicyBundle(bundlePath: string): { valid: boolean; error?: string } {
  try {
    const resolvedPath = path.resolve(bundlePath);

    if (!fs.existsSync(resolvedPath)) {
      return { valid: false, error: `Policy bundle not found: ${bundlePath}` };
    }

    const stat = fs.statSync(resolvedPath);

    // Check for policy.rego file
    if (stat.isDirectory()) {
      const policyFile = path.join(resolvedPath, 'policy.rego');
      if (!fs.existsSync(policyFile)) {
        return { valid: false, error: `No policy.rego found in bundle: ${bundlePath}` };
      }
    } else if (!resolvedPath.endsWith('.rego')) {
      return { valid: false, error: `Invalid policy bundle format: ${bundlePath}` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to load policy bundle: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Collect all .rego files from a directory recursively in sorted order
 */
function collectRegoFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    // Sort entries for deterministic ordering
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.rego')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Compute a stable SHA-256 hash of a policy bundle
 *
 * The hash is computed by:
 * 1. Collecting all .rego files in deterministic (sorted) order
 * 2. For each file, hashing: relative_path + '\0' + file_contents
 * 3. Combining all file hashes into a final bundle hash
 *
 * This ensures the same bundle always produces the same hash,
 * regardless of filesystem ordering.
 */
export function computePolicyBundleHash(bundlePath: string): string | null {
  try {
    const resolvedPath = path.resolve(bundlePath);

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const stat = fs.statSync(resolvedPath);
    const hash = crypto.createHash('sha256');

    if (stat.isDirectory()) {
      // Collect all .rego files in sorted order
      const regoFiles = collectRegoFiles(resolvedPath);

      if (regoFiles.length === 0) {
        return null;
      }

      for (const file of regoFiles) {
        // Use relative path for consistency across machines
        const relativePath = path.relative(resolvedPath, file);
        const content = fs.readFileSync(file, 'utf-8');
        // Include path in hash to detect file renames
        hash.update(relativePath + '\0' + content);
      }
    } else if (resolvedPath.endsWith('.rego')) {
      // Single .rego file
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const basename = path.basename(resolvedPath);
      hash.update(basename + '\0' + content);
    } else {
      return null;
    }

    return hash.digest('hex');
  } catch {
    return null;
  }
}

/**
 * Build policy input from CLI context and actions
 */
export function buildPolicyInput(
  command: string,
  flags: { ci: boolean; write: boolean; policyPresent: boolean },
  repoRoot: string,
  actions: PolicyAction[]
): PolicyInput {
  return {
    command,
    flags: {
      ci: flags.ci,
      write: flags.write,
      policy_present: flags.policyPresent,
    },
    repo_root: path.resolve(repoRoot),
    actions: sortActions(actions),
  };
}

/**
 * Evaluate policy using OPA
 */
export function evaluatePolicy(
  input: PolicyInput,
  bundlePath: string
): PolicyDecision {
  const resolvedBundle = path.resolve(bundlePath);
  const policyPath = fs.statSync(resolvedBundle).isDirectory()
    ? path.join(resolvedBundle, 'policy.rego')
    : resolvedBundle;

  // Create deterministic input JSON
  const inputJson = stableStringify(input);

  try {
    // Use OPA eval with JSON output
    const result = spawnSync(
      'opa',
      [
        'eval',
        '--data', policyPath,
        '--input', '/dev/stdin',
        '--format', 'json',
        'data.claude.policy.decision',
      ],
      {
        input: inputJson,
        encoding: 'utf-8',
        timeout: 30000,
      }
    );

    if (result.status !== 0) {
      throw new Error(`OPA evaluation failed: ${result.stderr || 'unknown error'}`);
    }

    const output = JSON.parse(result.stdout);

    // OPA returns results in a specific format
    if (!output.result || output.result.length === 0) {
      // No result means default deny
      return {
        allow: false,
        deny_reasons: ['no_policy_result'],
      };
    }

    const decision = output.result[0].expressions[0].value;
    return PolicyDecisionSchema.parse(decision);
  } catch (error) {
    // Policy evaluation errors result in deny
    return {
      allow: false,
      deny_reasons: [`policy_eval_error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Policy gate error class
 */
export class PolicyError extends Error {
  constructor(
    message: string,
    public reasons: string[] = [],
    public exitCode: number = POLICY_EXIT_CODE
  ) {
    super(message);
    this.name = 'PolicyError';
  }

  /**
   * Format error for output with stable-sorted reasons
   */
  format(): string {
    const sortedReasons = [...this.reasons].sort();
    let output = `Policy Error: ${this.message}`;
    if (sortedReasons.length > 0) {
      output += '\nDeny reasons:';
      for (const reason of sortedReasons) {
        output += `\n  - ${reason}`;
      }
    }
    return output;
  }
}

/**
 * Policy gate - main entry point for policy enforcement
 */
export class PolicyGate {
  private options: PolicyOptions;
  private policyLoaded: boolean = false;
  private policyBundleHash: string | null = null;

  constructor(options: PolicyOptions) {
    this.options = options;
  }

  /**
   * Initialize policy gate - validates configuration
   */
  initialize(): void {
    // In CI mode, policy bundle is required
    if (this.options.ci && !this.options.policyBundle) {
      throw new PolicyError(
        'Policy bundle required in CI mode',
        ['ci_mode_requires_policy'],
        POLICY_EXIT_CODE
      );
    }

    // If policy bundle specified, validate it
    if (this.options.policyBundle) {
      // Check OPA availability
      if (!isOpaAvailable()) {
        throw new PolicyError(
          'OPA not found. Install OPA to use policy enforcement.',
          ['opa_not_available'],
          POLICY_EXIT_CODE
        );
      }

      // Validate policy bundle
      const { valid, error } = loadPolicyBundle(this.options.policyBundle);
      if (!valid) {
        throw new PolicyError(
          error || 'Invalid policy bundle',
          ['invalid_policy_bundle'],
          POLICY_EXIT_CODE
        );
      }

      // Compute bundle hash for audit trail
      this.policyBundleHash = computePolicyBundleHash(this.options.policyBundle);
      this.policyLoaded = true;
    }
  }

  /**
   * Evaluate actions against policy
   */
  evaluate(
    command: string,
    flags: { write: boolean },
    actions: PolicyAction[]
  ): PolicyDecision {
    // If no policy loaded and not in CI mode, allow by default
    if (!this.policyLoaded) {
      return {
        allow: true,
        deny_reasons: [],
      };
    }

    const input = buildPolicyInput(
      command,
      {
        ci: this.options.ci,
        write: flags.write,
        policyPresent: this.policyLoaded,
      },
      this.options.repoRoot,
      actions
    );

    const decision = evaluatePolicy(input, this.options.policyBundle!);

    // Enforce decision
    if (!decision.allow) {
      const sortedReasons = [...(decision.deny_reasons || [])].sort();
      throw new PolicyError(
        'Action denied by policy',
        sortedReasons,
        POLICY_EXIT_CODE
      );
    }

    return decision;
  }

  /**
   * Check if policy is loaded
   */
  isPolicyLoaded(): boolean {
    return this.policyLoaded;
  }

  /**
   * Get policy limits (if any)
   */
  getLimits(): PolicyDecision['limits'] | undefined {
    return undefined; // Limits are returned per-evaluation
  }

  /**
   * Get policy bundle path (if loaded)
   */
  getPolicyBundlePath(): string | null {
    return this.policyLoaded ? this.options.policyBundle ?? null : null;
  }

  /**
   * Get policy bundle hash (if loaded)
   */
  getPolicyBundleHash(): string | null {
    return this.policyBundleHash;
  }
}

/**
 * Create and initialize policy gate from CLI options
 */
export function createPolicyGate(options: {
  policyBundle?: string;
  ci?: boolean;
  repoRoot?: string;
}): PolicyGate {
  const gate = new PolicyGate({
    policyBundle: options.policyBundle,
    ci: options.ci || false,
    repoRoot: options.repoRoot || process.cwd(),
  });

  gate.initialize();
  return gate;
}
