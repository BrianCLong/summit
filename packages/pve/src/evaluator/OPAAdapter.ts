/**
 * OPA Adapter
 *
 * Interface for evaluating policies using Open Policy Agent.
 * Supports both OPA server mode and embedded evaluation.
 *
 * @module pve/evaluator/OPAAdapter
 */

import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../utils/logger.js';

export interface OPAConfig {
  /** Path to OPA binary (default: 'opa') */
  binary?: string;
  /** OPA server URL for HTTP mode */
  serverUrl?: string;
  /** Evaluation mode */
  mode?: 'binary' | 'http' | 'wasm';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Enable strict mode */
  strict?: boolean;
  /** Additional OPA flags */
  flags?: string[];
}

export interface OPAEvalResult {
  allow: boolean;
  violations?: OPAViolation[];
  details?: Record<string, unknown>;
  raw?: unknown;
}

export interface OPAViolation {
  rule: string;
  message: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}

export interface OPAQuery {
  query: string;
  input: unknown;
  data?: unknown;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * OPA Adapter for policy evaluation
 */
export class OPAAdapter {
  private config: Required<OPAConfig>;
  private policyCache: Map<string, string> = new Map();

  constructor(config: OPAConfig = {}) {
    this.config = {
      binary: config.binary || 'opa',
      serverUrl: config.serverUrl || '',
      mode: config.mode || 'binary',
      timeout: config.timeout || DEFAULT_TIMEOUT,
      strict: config.strict !== false,
      flags: config.flags || [],
    };
  }

  /**
   * Evaluate a policy against input data
   */
  async evaluate(
    policyPath: string,
    input: unknown,
    query?: string,
  ): Promise<OPAEvalResult> {
    switch (this.config.mode) {
      case 'http':
        return this.evaluateHttp(policyPath, input, query);
      case 'wasm':
        return this.evaluateWasm(policyPath, input, query);
      case 'binary':
      default:
        return this.evaluateBinary(policyPath, input, query);
    }
  }

  /**
   * Evaluate using OPA binary
   */
  private async evaluateBinary(
    policyPath: string,
    input: unknown,
    query?: string,
  ): Promise<OPAEvalResult> {
    const namespace = this.getDataNamespace(policyPath);
    const queryStr = query || `data.${namespace}`;

    // Write input to temp file
    const inputFile = path.join(os.tmpdir(), `pve-input-${Date.now()}.json`);
    fs.writeFileSync(inputFile, JSON.stringify(input));

    try {
      const args = [
        'eval',
        '--format=json',
        '--data',
        policyPath,
        '--input',
        inputFile,
        queryStr,
        ...this.config.flags,
      ];

      if (this.config.strict) {
        args.push('--strict');
      }

      const result = await this.runOPA(args);
      return this.parseOPAResult(result);
    } finally {
      // Clean up temp file
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }
    }
  }

  /**
   * Evaluate using OPA HTTP server
   */
  private async evaluateHttp(
    policyPath: string,
    input: unknown,
    query?: string,
  ): Promise<OPAEvalResult> {
    if (!this.config.serverUrl) {
      throw new Error('OPA server URL not configured');
    }

    const namespace = this.getDataNamespace(policyPath);
    const url = `${this.config.serverUrl}/v1/data/${namespace.replace(/\./g, '/')}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OPA server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseOPAResult(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Evaluate using WASM (placeholder for future implementation)
   */
  private async evaluateWasm(
    _policyPath: string,
    _input: unknown,
    _query?: string,
  ): Promise<OPAEvalResult> {
    throw new Error('WASM evaluation mode not yet implemented');
  }

  /**
   * Run OPA binary command
   */
  private runOPA(args: string[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const proc = execFile(
        this.config.binary,
        args,
        {
          timeout: this.config.timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        },
        (error, stdout, stderr) => {
          if (error) {
            logger.error('OPA execution failed', {
              error: error.message,
              stderr,
              args,
            });
            reject(new Error(`OPA execution failed: ${error.message}`));
            return;
          }

          try {
            const parsed = JSON.parse(stdout);
            resolve(parsed);
          } catch (parseError) {
            logger.error('Failed to parse OPA output', {
              stdout,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            });
            reject(new Error(`Failed to parse OPA output: ${stdout}`));
          }
        },
      );

      proc.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`OPA binary not found at: ${this.config.binary}`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Parse OPA result into standard format
   */
  private parseOPAResult(result: unknown): OPAEvalResult {
    if (!result || typeof result !== 'object') {
      return { allow: false, raw: result };
    }

    const obj = result as Record<string, unknown>;

    // Handle standard OPA eval output format
    if ('result' in obj && Array.isArray(obj.result)) {
      const expressions = obj.result;
      if (expressions.length === 0) {
        return { allow: false, raw: result };
      }

      const firstExpr = expressions[0] as Record<string, unknown>;
      const value = firstExpr?.expressions?.[0]?.value ?? firstExpr?.value;

      return this.parseEvalValue(value, result);
    }

    // Handle HTTP API response format
    if ('result' in obj && typeof obj.result === 'object') {
      return this.parseEvalValue(obj.result, result);
    }

    return this.parseEvalValue(obj, result);
  }

  /**
   * Parse evaluation value from OPA response
   */
  private parseEvalValue(value: unknown, raw: unknown): OPAEvalResult {
    if (typeof value === 'boolean') {
      return { allow: value, raw };
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;

      // Standard policy result structure
      const allow =
        obj.allow === true ||
        obj.allowed === true ||
        obj.permit === true ||
        (Array.isArray(obj.violations) && obj.violations.length === 0);

      const violations = this.parseViolations(obj.violations || obj.errors);

      return {
        allow,
        violations: violations.length > 0 ? violations : undefined,
        details: obj.details as Record<string, unknown> | undefined,
        raw,
      };
    }

    return { allow: false, raw };
  }

  /**
   * Parse violations from OPA result
   */
  private parseViolations(data: unknown): OPAViolation[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      if (typeof item === 'string') {
        return { rule: 'unknown', message: item };
      }

      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          rule: String(obj.rule || obj.name || 'unknown'),
          message: String(obj.message || obj.msg || obj.description || ''),
          severity: obj.severity as string | undefined,
          metadata: obj.metadata as Record<string, unknown> | undefined,
        };
      }

      return { rule: 'unknown', message: String(item) };
    });
  }

  /**
   * Extract data namespace from policy path
   */
  private getDataNamespace(policyPath: string): string {
    // Read the policy file to extract the package name
    if (fs.existsSync(policyPath)) {
      const content = fs.readFileSync(policyPath, 'utf-8');
      const packageMatch = content.match(/^package\s+(\S+)/m);
      if (packageMatch) {
        return packageMatch[1];
      }
    }

    // Fall back to path-based namespace
    return policyPath
      .replace(/^.*policies[/\\]/, '')
      .replace(/\.rego$/, '')
      .replace(/[/\\]/g, '.');
  }

  /**
   * Check if OPA binary is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.runOPA(['version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get OPA version
   */
  async getVersion(): Promise<string | null> {
    try {
      const result = (await this.runOPA(['version', '--format=json'])) as Record<
        string,
        unknown
      >;
      return String(result.version || 'unknown');
    } catch {
      return null;
    }
  }

  /**
   * Validate a Rego policy file
   */
  async validatePolicy(policyPath: string): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      await this.runOPA(['check', policyPath, '--strict']);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Format a Rego policy file
   */
  async formatPolicy(policyPath: string): Promise<string> {
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(this.config.binary, ['fmt', policyPath]);
      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`OPA fmt failed: ${error}`));
        } else {
          resolve(output);
        }
      });
    });

    return result;
  }

  /**
   * Cache a policy for faster evaluation
   */
  cachePolicy(policyId: string, content: string): void {
    this.policyCache.set(policyId, content);
  }

  /**
   * Clear the policy cache
   */
  clearCache(): void {
    this.policyCache.clear();
  }
}

/**
 * Create an OPA adapter with the given configuration
 */
export function createOPAAdapter(config?: OPAConfig): OPAAdapter {
  return new OPAAdapter(config);
}
