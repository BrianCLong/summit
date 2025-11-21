/**
 * Authority Compiler
 *
 * Compiles policy bundles into runtime-evaluable rules.
 * Supports hot-reloading of policy updates.
 */

import { PolicyBundle, Authority, PolicyDecision, Operation } from './schema/policy.schema';

export interface CompilerOptions {
  /** Enable strict mode - reject policies with warnings */
  strict?: boolean;
  /** Cache compiled policies */
  enableCache?: boolean;
  /** Maximum cache age in seconds */
  cacheMaxAge?: number;
}

export interface CompiledPolicy {
  bundleId: string;
  version: string;
  compiledAt: Date;
  authorityIndex: Map<string, Authority>;
  operationIndex: Map<Operation, Authority[]>;
}

export interface CompilationResult {
  success: boolean;
  policy?: CompiledPolicy;
  errors: string[];
  warnings: string[];
}

/**
 * Compiles a policy bundle into an optimized runtime format
 */
export class AuthorityCompiler {
  private options: CompilerOptions;
  private cache: Map<string, CompiledPolicy> = new Map();

  constructor(options: CompilerOptions = {}) {
    this.options = {
      strict: false,
      enableCache: true,
      cacheMaxAge: 300,
      ...options,
    };
  }

  /**
   * Compile a policy bundle
   */
  compile(bundle: PolicyBundle): CompilationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check cache
    if (this.options.enableCache) {
      const cached = this.cache.get(bundle.id);
      if (cached && cached.version === bundle.version) {
        return { success: true, policy: cached, errors: [], warnings: [] };
      }
    }

    // Validate bundle
    const validationResult = this.validateBundle(bundle);
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);

    if (errors.length > 0 || (this.options.strict && warnings.length > 0)) {
      return { success: false, errors, warnings };
    }

    // Build indexes for fast lookup
    const authorityIndex = new Map<string, Authority>();
    const operationIndex = new Map<Operation, Authority[]>();

    for (const authority of bundle.authorities) {
      authorityIndex.set(authority.id, authority);

      for (const permission of authority.permissions) {
        const existing = operationIndex.get(permission) || [];
        existing.push(authority);
        operationIndex.set(permission, existing);
      }
    }

    const compiledPolicy: CompiledPolicy = {
      bundleId: bundle.id,
      version: bundle.version,
      compiledAt: new Date(),
      authorityIndex,
      operationIndex,
    };

    // Update cache
    if (this.options.enableCache) {
      this.cache.set(bundle.id, compiledPolicy);
    }

    return { success: true, policy: compiledPolicy, errors, warnings };
  }

  /**
   * Validate a policy bundle for correctness
   */
  private validateBundle(bundle: PolicyBundle): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate authority IDs
    const authorityIds = new Set<string>();
    for (const authority of bundle.authorities) {
      if (authorityIds.has(authority.id)) {
        errors.push(`Duplicate authority ID: ${authority.id}`);
      }
      authorityIds.add(authority.id);
    }

    // Check for overlapping permissions that could cause conflicts
    // This is a simplified check - production would need more sophisticated conflict detection
    for (let i = 0; i < bundle.authorities.length; i++) {
      for (let j = i + 1; j < bundle.authorities.length; j++) {
        const a = bundle.authorities[i];
        const b = bundle.authorities[j];

        const sharedPerms = a.permissions.filter((p) => b.permissions.includes(p));
        if (sharedPerms.length > 0) {
          warnings.push(
            `Authorities ${a.id} and ${b.id} have overlapping permissions: ${sharedPerms.join(', ')}`
          );
        }
      }
    }

    // Validate two-person controls reference valid roles
    if (bundle.twoPersonControls) {
      for (const tpc of bundle.twoPersonControls) {
        if (tpc.approval.approverRoles.length === 0) {
          errors.push(`Two-person control ${tpc.id} has no approver roles defined`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Clear the compilation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export default AuthorityCompiler;
