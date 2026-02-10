/**
 * Sandbox Guardrails Module
 *
 * Provides path allowlist/denylist enforcement, tool execution restrictions,
 * and network permission control for safe CLI operation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, SpawnOptions } from 'child_process';

// Exit code for sandbox violations
export const SANDBOX_EXIT_CODE = 2;

/**
 * Default deny patterns that cannot be overridden
 */
export const HARDCODED_DENY_PATTERNS = [
  '.git/**',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/*.pfx',
  '**/id_rsa*',
  '**/*_ed25519*',
  '**/secrets/**',
] as const;

/**
 * Env-file patterns (require explicit opt-in)
 */
export const ENV_FILE_PATTERNS = [
  '**/.env',
  '**/.env.*',
] as const;

/**
 * Safe environment variables to pass through to tools
 */
export const SAFE_ENV_VARS = [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
  'TZ',
  'NODE_ENV',
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'JENKINS_HOME',
] as const;

/**
 * Environment variable patterns to scrub (secrets)
 */
export const SECRET_ENV_PATTERNS = [
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /CREDENTIAL/i,
  /API_KEY/i,
  /PRIVATE_KEY/i,
  /AUTH/i,
];

/**
 * Sandbox options
 */
export interface SandboxOptions {
  repoRoot: string;
  allowPaths: string[];
  denyPaths: string[];
  allowTools: string[];
  toolTimeoutMs: number;
  allowNetwork: boolean;
  allowDotenv: boolean;
  allowUserConfig: boolean;
  unsafeAllowSensitivePaths: boolean;
  ci: boolean;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Sandbox violation error
 */
export class SandboxError extends Error {
  constructor(
    message: string,
    public violationType: 'path' | 'tool' | 'network',
    public details: string[] = [],
    public exitCode: number = SANDBOX_EXIT_CODE
  ) {
    super(message);
    this.name = 'SandboxError';
  }

  format(): string {
    const sortedDetails = [...this.details].sort();
    let output = `Sandbox Error (${this.violationType}): ${this.message}`;
    if (sortedDetails.length > 0) {
      output += '\nDetails:';
      for (const detail of sortedDetails) {
        output += `\n  - ${detail}`;
      }
    }
    return output;
  }
}

/**
 * Simple glob pattern matching
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  // Normalize paths
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle **/ prefix - should match files in any directory including root
  let patternToMatch = normalizedPattern;
  if (patternToMatch.startsWith('**/')) {
    // **/ means "any directory including none"
    patternToMatch = patternToMatch.slice(3); // Remove **/
  }

  // Convert glob pattern to regex
  let regexPattern = patternToMatch
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '{{GLOBSTAR}}')      // Temp placeholder for **
    .replace(/\*/g, '[^/]*')               // * matches anything except /
    .replace(/{{GLOBSTAR}}/g, '.*')        // ** matches anything including /
    .replace(/\?/g, '[^/]');               // ? matches single char except /

  // If original pattern started with **/, match from any position
  if (normalizedPattern.startsWith('**/')) {
    regexPattern = '(^|.*/|^)' + regexPattern;
  } else if (!normalizedPattern.startsWith('*')) {
    regexPattern = '(^|/)' + regexPattern;
  }

  const regex = new RegExp(regexPattern + '$', 'i');
  return regex.test(normalizedPath);
}

/**
 * Normalize and resolve a path, handling symlinks
 */
export function normalizePath(inputPath: string, baseDir: string): string {
  // Resolve relative paths against base directory
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(baseDir, inputPath);

  try {
    // Resolve symlinks
    return fs.realpathSync(absolutePath);
  } catch {
    // If file doesn't exist yet, resolve without following symlinks
    return path.resolve(absolutePath);
  }
}

/**
 * Check if a path is within a base directory
 */
export function isPathWithin(targetPath: string, baseDir: string): boolean {
  const normalizedTarget = path.normalize(targetPath);
  const normalizedBase = path.normalize(baseDir);

  // Ensure base ends with separator for proper prefix matching
  const baseWithSep = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : normalizedBase + path.sep;

  return normalizedTarget === normalizedBase ||
         normalizedTarget.startsWith(baseWithSep);
}

/**
 * Scrub environment variables, removing secrets
 */
export function scrubEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};

  for (const key of Object.keys(env)) {
    // Always include safe vars
    if (SAFE_ENV_VARS.includes(key as typeof SAFE_ENV_VARS[number])) {
      result[key] = env[key];
      continue;
    }

    // Skip vars matching secret patterns
    const isSecret = SECRET_ENV_PATTERNS.some(pattern => pattern.test(key));
    if (!isSecret) {
      result[key] = env[key];
    }
  }

  return result;
}

/**
 * Sandbox class - main guardrail implementation
 */
export class Sandbox {
  private options: SandboxOptions;
  private resolvedRepoRoot: string;
  private effectiveAllowPaths: string[];
  private effectiveDenyPatterns: string[];

  constructor(options: SandboxOptions) {
    this.options = options;
    this.resolvedRepoRoot = normalizePath(options.repoRoot, process.cwd());

    // Build effective allow paths
    this.effectiveAllowPaths = options.allowPaths.length > 0
      ? options.allowPaths.map(p => normalizePath(p, this.resolvedRepoRoot))
      : [this.resolvedRepoRoot];

    // Build effective deny patterns (hardcoded + user-specified)
    this.effectiveDenyPatterns = options.unsafeAllowSensitivePaths
      ? [...options.denyPaths]
      : [...HARDCODED_DENY_PATTERNS, ...options.denyPaths];

    // Add env file patterns if not explicitly allowed
    if (!options.allowDotenv) {
      this.effectiveDenyPatterns.push(...ENV_FILE_PATTERNS);
    }
  }

  /**
   * Check if a path is allowed for read/write access
   */
  checkPath(targetPath: string, operation: 'read' | 'write'): void {
    const normalizedPath = normalizePath(targetPath, this.resolvedRepoRoot);

    // Check against deny patterns first (they take precedence)
    for (const pattern of this.effectiveDenyPatterns) {
      if (matchesGlob(normalizedPath, pattern)) {
        throw new SandboxError(
          `Access to path denied by pattern: ${pattern}`,
          'path',
          [`path: ${targetPath}`, `operation: ${operation}`, `matched_pattern: ${pattern}`]
        );
      }
    }

    // Check if path is within any allowed path
    const isAllowed = this.effectiveAllowPaths.some(allowedPath =>
      isPathWithin(normalizedPath, allowedPath)
    );

    if (!isAllowed) {
      throw new SandboxError(
        `Path outside allowed directories`,
        'path',
        [
          `path: ${targetPath}`,
          `operation: ${operation}`,
          `allowed_paths: ${this.effectiveAllowPaths.join(', ')}`
        ]
      );
    }
  }

  /**
   * Check if a tool is allowed for execution
   */
  checkTool(tool: string): void {
    if (this.options.allowTools.length === 0) {
      throw new SandboxError(
        `Tool execution not allowed: ${tool}`,
        'tool',
        ['no_tools_allowed', `requested_tool: ${tool}`]
      );
    }

    // Extract tool name from path if necessary
    const toolName = path.basename(tool);

    const isAllowed = this.options.allowTools.some(allowed =>
      allowed === tool || allowed === toolName
    );

    if (!isAllowed) {
      throw new SandboxError(
        `Tool not in allowlist: ${tool}`,
        'tool',
        [
          `requested_tool: ${tool}`,
          `allowed_tools: ${this.options.allowTools.join(', ')}`
        ]
      );
    }
  }

  /**
   * Check if network access is allowed
   */
  checkNetwork(): void {
    if (!this.options.allowNetwork) {
      throw new SandboxError(
        'Network access not allowed',
        'network',
        this.options.ci
          ? ['network_disabled_in_ci', 'use_--allow-network_to_enable']
          : ['network_disabled', 'use_--allow-network_to_enable']
      );
    }
  }

  /**
   * Execute a tool with sandbox restrictions
   */
  async execTool(
    tool: string,
    args: string[],
    options: { stdin?: string } = {}
  ): Promise<ToolResult> {
    // Check tool is allowed
    this.checkTool(tool);

    // Prepare environment (scrubbed)
    const env = scrubEnvironment(process.env);

    // Disable colors in CI mode
    if (this.options.ci) {
      env.FORCE_COLOR = '0';
      env.NO_COLOR = '1';
    }

    const spawnOptions: SpawnOptions = {
      cwd: this.resolvedRepoRoot,
      env,
      timeout: this.options.toolTimeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(tool, args, spawnOptions);

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, this.options.toolTimeoutMs);

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      if (options.stdin && proc.stdin) {
        proc.stdin.write(options.stdin);
        proc.stdin.end();
      }

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
          timedOut,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr + '\n' + err.message,
          timedOut: false,
        });
      });
    });
  }

  /**
   * Wrap file read operation with sandbox check
   */
  readFile(filePath: string): string {
    this.checkPath(filePath, 'read');
    return fs.readFileSync(normalizePath(filePath, this.resolvedRepoRoot), 'utf-8');
  }

  /**
   * Wrap file write operation with sandbox check
   */
  writeFile(filePath: string, content: string): void {
    this.checkPath(filePath, 'write');
    const normalizedPath = normalizePath(filePath, this.resolvedRepoRoot);

    // Ensure parent directory exists
    const parentDir = path.dirname(normalizedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(normalizedPath, content);
  }

  /**
   * Check if path exists (with sandbox check)
   */
  exists(filePath: string): boolean {
    this.checkPath(filePath, 'read');
    return fs.existsSync(normalizePath(filePath, this.resolvedRepoRoot));
  }

  /**
   * Get effective allow paths (for debugging/info)
   */
  getAllowPaths(): string[] {
    return [...this.effectiveAllowPaths];
  }

  /**
   * Get effective deny patterns (for debugging/info)
   */
  getDenyPatterns(): string[] {
    return [...this.effectiveDenyPatterns];
  }

  /**
   * Get repo root
   */
  getRepoRoot(): string {
    return this.resolvedRepoRoot;
  }
}

/**
 * Default sandbox options
 */
export const DEFAULT_SANDBOX_OPTIONS: Partial<SandboxOptions> = {
  allowPaths: [],
  denyPaths: [],
  allowTools: [],
  toolTimeoutMs: 120000,
  allowNetwork: false,
  allowDotenv: false,
  allowUserConfig: false,
  unsafeAllowSensitivePaths: false,
  ci: false,
};

/**
 * Create sandbox with options merged with defaults
 */
export function createSandbox(options: Partial<SandboxOptions> & { repoRoot: string }): Sandbox {
  const fullOptions: SandboxOptions = {
    ...DEFAULT_SANDBOX_OPTIONS,
    ...options,
  } as SandboxOptions;

  return new Sandbox(fullOptions);
}

/**
 * Detect repo root (git root or nearest package.json)
 */
export function detectRepoRoot(startDir: string = process.cwd()): string {
  let currentDir = path.resolve(startDir);
  let bestRoot = currentDir;

  // In a monorepo, we want the highest directory that has a .git folder
  // or the highest directory that contains a package.json before we hit the root.
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, '.git'))) {
      return currentDir;
    }
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      bestRoot = currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return bestRoot;
}
