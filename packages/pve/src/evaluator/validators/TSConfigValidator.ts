/**
 * TSConfig Integrity Validator
 *
 * Validates TypeScript configuration integrity and consistency.
 *
 * @module pve/evaluator/validators/TSConfigValidator
 */

import type {
  EvaluationContext,
  PolicyResult,
  TSConfigIntegrityInput,
} from '../../types/index.js';
import { pass, fail, warn } from '../PolicyResult.js';

export interface TSConfigValidatorConfig {
  /** Required compiler options */
  requiredOptions?: Record<string, unknown>;
  /** Forbidden compiler options */
  forbiddenOptions?: string[];
  /** Minimum TypeScript target */
  minTarget?: string;
  /** Maximum allowed "any" usage (via noImplicitAny) */
  enforceNoImplicitAny?: boolean;
  /** Require strict mode */
  enforceStrict?: boolean;
  /** Enforce consistent module resolution */
  moduleResolution?: string[];
}

const TARGET_ORDER = ['ES5', 'ES6', 'ES2015', 'ES2016', 'ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ESNext'];

const DEFAULT_CONFIG: TSConfigValidatorConfig = {
  requiredOptions: {
    esModuleInterop: true,
    skipLibCheck: true,
    resolveJsonModule: true,
  },
  forbiddenOptions: [],
  minTarget: 'ES2020',
  enforceNoImplicitAny: false,
  enforceStrict: false,
  moduleResolution: ['node', 'bundler', 'node16', 'nodenext'],
};

export class TSConfigValidator {
  private config: TSConfigValidatorConfig;

  constructor(config: TSConfigValidatorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async validate(context: EvaluationContext): Promise<PolicyResult[]> {
    if (context.type !== 'tsconfig_integrity') {
      return [];
    }

    const input = context.input as TSConfigIntegrityInput;
    const results: PolicyResult[] = [];

    try {
      const tsconfig = this.parseTSConfig(input.config);
      const compilerOptions = tsconfig.compilerOptions || {};

      // Check required options
      results.push(...this.checkRequiredOptions(compilerOptions, input.filePath));

      // Check forbidden options
      results.push(...this.checkForbiddenOptions(compilerOptions, input.filePath));

      // Check target version
      results.push(...this.checkTarget(compilerOptions, input.filePath));

      // Check module resolution
      results.push(...this.checkModuleResolution(compilerOptions, input.filePath));

      // Check strict mode
      if (this.config.enforceStrict) {
        results.push(...this.checkStrictMode(compilerOptions, input.filePath));
      }

      // Check noImplicitAny
      if (this.config.enforceNoImplicitAny) {
        results.push(...this.checkNoImplicitAny(compilerOptions, input.filePath));
      }

      // Check for common misconfigurations
      results.push(...this.checkCommonIssues(compilerOptions, input.filePath));

      // Validate expected options from input
      if (input.expectedOptions) {
        results.push(...this.validateExpectedOptions(compilerOptions, input.expectedOptions, input.filePath));
      }
    } catch (error) {
      results.push(
        fail('pve.tsconfig.parse_error', `Failed to parse tsconfig: ${error instanceof Error ? error.message : String(error)}`, {
          severity: 'error',
          location: { file: input.filePath },
        }),
      );
    }

    return results;
  }

  private parseTSConfig(config: unknown): {
    compilerOptions?: Record<string, unknown>;
    extends?: string;
    include?: string[];
    exclude?: string[];
  } {
    if (typeof config === 'string') {
      return JSON.parse(config);
    }
    return config as ReturnType<TSConfigValidator['parseTSConfig']>;
  }

  private checkRequiredOptions(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    for (const [key, expectedValue] of Object.entries(this.config.requiredOptions || {})) {
      const actualValue = options[key];

      if (actualValue === undefined) {
        results.push(
          fail('pve.tsconfig.required_option', `Missing required compiler option: ${key}`, {
            severity: 'warning',
            location: filePath ? { file: filePath, field: `compilerOptions.${key}` } : undefined,
            fix: `Add "${key}": ${JSON.stringify(expectedValue)} to compilerOptions`,
            details: { expected: expectedValue },
          }),
        );
      } else if (actualValue !== expectedValue) {
        results.push(
          warn('pve.tsconfig.option_value', `Compiler option "${key}" has unexpected value`, {
            location: filePath ? { file: filePath, field: `compilerOptions.${key}` } : undefined,
            details: { expected: expectedValue, actual: actualValue },
          }),
        );
      } else {
        results.push(pass(`pve.tsconfig.required.${key}`));
      }
    }

    return results;
  }

  private checkForbiddenOptions(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    for (const key of this.config.forbiddenOptions || []) {
      if (key in options) {
        results.push(
          fail('pve.tsconfig.forbidden_option', `Forbidden compiler option found: ${key}`, {
            severity: 'error',
            location: filePath ? { file: filePath, field: `compilerOptions.${key}` } : undefined,
            fix: `Remove "${key}" from compilerOptions`,
          }),
        );
      }
    }

    if ((this.config.forbiddenOptions || []).length > 0) {
      const hasForbidden = results.some((r) => !r.allowed);
      if (!hasForbidden) {
        results.push(pass('pve.tsconfig.forbidden_options'));
      }
    }

    return results;
  }

  private checkTarget(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    const target = String(options.target || 'ES5').toUpperCase();

    if (this.config.minTarget) {
      const minTarget = this.config.minTarget.toUpperCase();
      const targetIndex = TARGET_ORDER.indexOf(target);
      const minIndex = TARGET_ORDER.indexOf(minTarget);

      if (targetIndex !== -1 && minIndex !== -1 && targetIndex < minIndex) {
        results.push(
          fail('pve.tsconfig.target', `TypeScript target "${target}" is below minimum "${minTarget}"`, {
            severity: 'warning',
            location: filePath ? { file: filePath, field: 'compilerOptions.target' } : undefined,
            fix: `Update target to "${minTarget}" or higher`,
            details: { actual: target, minimum: minTarget },
          }),
        );
      } else {
        results.push(pass('pve.tsconfig.target'));
      }
    }

    return results;
  }

  private checkModuleResolution(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];
    const moduleResolution = String(options.moduleResolution || 'node').toLowerCase();

    const allowed = (this.config.moduleResolution || []).map((m) => m.toLowerCase());
    if (allowed.length > 0 && !allowed.includes(moduleResolution)) {
      results.push(
        warn('pve.tsconfig.module_resolution', `Module resolution "${moduleResolution}" is not in allowed list`, {
          location: filePath ? { file: filePath, field: 'compilerOptions.moduleResolution' } : undefined,
          details: { actual: moduleResolution, allowed },
        }),
      );
    } else {
      results.push(pass('pve.tsconfig.module_resolution'));
    }

    return results;
  }

  private checkStrictMode(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    if (options.strict === true) {
      return [pass('pve.tsconfig.strict')];
    }

    return [
      fail('pve.tsconfig.strict', 'Strict mode is not enabled', {
        severity: 'warning',
        location: filePath ? { file: filePath, field: 'compilerOptions.strict' } : undefined,
        fix: 'Add "strict": true to compilerOptions',
      }),
    ];
  }

  private checkNoImplicitAny(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    if (options.noImplicitAny === true || options.strict === true) {
      return [pass('pve.tsconfig.no_implicit_any')];
    }

    return [
      warn('pve.tsconfig.no_implicit_any', 'noImplicitAny is not enabled', {
        location: filePath ? { file: filePath, field: 'compilerOptions.noImplicitAny' } : undefined,
        fix: 'Add "noImplicitAny": true to compilerOptions',
      }),
    ];
  }

  private checkCommonIssues(
    options: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    // Check for conflicting options
    if (options.module === 'CommonJS' && options.type === 'module') {
      results.push(
        warn('pve.tsconfig.conflict', 'Module type conflict: CommonJS module with ESM package.json', {
          location: filePath ? { file: filePath } : undefined,
          fix: 'Use "module": "ESNext" or "NodeNext" for ESM packages',
        }),
      );
    }

    // Check for missing declaration settings
    if (options.declaration === true && options.declarationMap !== true) {
      results.push(
        warn('pve.tsconfig.declaration_map', 'Declaration files enabled without declaration maps', {
          location: filePath ? { file: filePath, field: 'compilerOptions.declarationMap' } : undefined,
          fix: 'Add "declarationMap": true for better debugging experience',
        }),
      );
    }

    // Check for missing source maps
    if (options.sourceMap !== true && options.inlineSourceMap !== true) {
      results.push(
        warn('pve.tsconfig.source_maps', 'Source maps are not enabled', {
          location: filePath ? { file: filePath } : undefined,
          fix: 'Add "sourceMap": true for better debugging',
        }),
      );
    }

    if (results.length === 0) {
      results.push(pass('pve.tsconfig.common_issues'));
    }

    return results;
  }

  private validateExpectedOptions(
    options: Record<string, unknown>,
    expected: Record<string, unknown>,
    filePath?: string,
  ): PolicyResult[] {
    const results: PolicyResult[] = [];

    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = options[key];

      if (actualValue !== expectedValue) {
        results.push(
          fail('pve.tsconfig.expected_option', `Compiler option "${key}" does not match expected value`, {
            severity: 'warning',
            location: filePath ? { file: filePath, field: `compilerOptions.${key}` } : undefined,
            details: { expected: expectedValue, actual: actualValue },
          }),
        );
      }
    }

    if (results.length === 0) {
      results.push(pass('pve.tsconfig.expected_options'));
    }

    return results;
  }
}
