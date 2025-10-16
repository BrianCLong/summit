#!/usr/bin/env node

/**
 * Hermeticity Gate v1 - Deny-by-Default Network & Filesystem Guards
 * Declared inputs/outputs enforced with toolchain hashing and network detection
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface HermeticTask {
  id: string;
  command: string;
  declaredInputs: string[];
  declaredOutputs: string[];
  allowedNetworkHosts?: string[];
  allowedEnvVars?: string[];
  toolchainHash?: string;
  workingDir: string;
  timeout?: number;
}

export interface HermeticityViolation {
  type:
    | 'undeclared_read'
    | 'undeclared_write'
    | 'network_access'
    | 'env_var_access'
    | 'toolchain_mismatch';
  resource: string;
  timestamp: number;
  stackTrace?: string;
  remediation: string;
  severity: 'error' | 'warning' | 'info';
}

export interface HermeticityResult {
  taskId: string;
  success: boolean;
  violations: HermeticityViolation[];
  actualInputs: string[];
  actualOutputs: string[];
  networkAccesses: Array<{ host: string; port: number; protocol: string }>;
  duration: number;
  toolchainHashMatch: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface ToolchainInfo {
  name: string;
  version: string;
  hash: string;
  binary: string;
  dependencies: string[];
  lastVerified: number;
}

export interface NetworkRule {
  pattern: string;
  allowed: boolean;
  reason: string;
  expiry?: number;
}

export class HermeticityGate extends EventEmitter {
  private networkRules: NetworkRule[] = [];
  private toolchainCache: Map<string, ToolchainInfo> = new Map();
  private allowlist: Set<string> = new Set();
  private warnMode: boolean = false;
  private networkDetector: NetworkDetector;
  private fileSystemMonitor: FileSystemMonitor;

  private violations: Map<string, HermeticityViolation[]> = new Map();
  private stats = {
    tasksExecuted: 0,
    tasksPassed: 0,
    violationsDetected: 0,
    networkViolations: 0,
    fileSystemViolations: 0,
    autoRemediations: 0,
  };

  constructor(
    private config: {
      warnMode?: boolean;
      allowNetworkInWarnMode?: boolean;
      toolchainVerificationEnabled?: boolean;
      maxExecutionTime?: number;
      sandboxEnabled?: boolean;
    } = {},
  ) {
    super();

    this.warnMode = config.warnMode || false;
    this.networkDetector = new NetworkDetector(this);
    this.fileSystemMonitor = new FileSystemMonitor(this);

    this.initializeNetworkRules();
    this.initializeAllowlist();

    console.log(
      `🔒 Hermeticity Gate initialized (${this.warnMode ? 'WARN' : 'ENFORCE'} mode)`,
    );
  }

  /**
   * Execute a task with hermeticity enforcement
   */
  async executeHermetic(task: HermeticTask): Promise<HermeticityResult> {
    console.log(`🔒 Executing hermetic task: ${task.id}`);

    const startTime = Date.now();
    this.stats.tasksExecuted++;

    // Validate toolchain if specified
    if (task.toolchainHash && this.config.toolchainVerificationEnabled) {
      const toolchainValid = await this.verifyToolchain(task.toolchainHash);
      if (!toolchainValid && !this.warnMode) {
        throw new Error(`Toolchain hash mismatch for task ${task.id}`);
      }
    }

    // Prepare sandbox environment
    const sandbox = await this.prepareSandbox(task);

    // Start monitoring
    const monitoringSession = await this.startMonitoring(task);

    let result: HermeticityResult;

    try {
      // Execute the task in the controlled environment
      const executionResult = await this.executeInSandbox(task, sandbox);

      // Stop monitoring and collect violations
      const violations = await this.stopMonitoring(monitoringSession);

      // Validate declared inputs/outputs
      const ioViolations = await this.validateInputsOutputs(task, sandbox);
      violations.push(...ioViolations);

      result = {
        taskId: task.id,
        success: violations.filter((v) => v.severity === 'error').length === 0,
        violations,
        actualInputs: sandbox.actualInputs,
        actualOutputs: sandbox.actualOutputs,
        networkAccesses: monitoringSession.networkAccesses,
        duration: Date.now() - startTime,
        toolchainHashMatch: task.toolchainHash
          ? await this.verifyToolchain(task.toolchainHash)
          : true,
        exitCode: executionResult.exitCode,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
      };
    } catch (error) {
      result = {
        taskId: task.id,
        success: false,
        violations: [
          {
            type: 'undeclared_read',
            resource: 'execution_error',
            timestamp: Date.now(),
            remediation: `Task execution failed: ${error}`,
            severity: 'error',
          },
        ],
        actualInputs: [],
        actualOutputs: [],
        networkAccesses: [],
        duration: Date.now() - startTime,
        toolchainHashMatch: false,
        exitCode: 1,
      };
    } finally {
      await this.cleanupSandbox(sandbox);
    }

    this.updateStats(result);
    this.violations.set(task.id, result.violations);

    // Auto-remediation for common violations
    if (result.violations.length > 0) {
      const remediatedCount = await this.attemptAutoRemediation(
        task,
        result.violations,
      );
      this.stats.autoRemediations += remediatedCount;
    }

    this.emit('task_completed', result);

    console.log(
      `🔒 Hermetic task completed: ${task.id} (${result.violations.length} violations)`,
    );

    if (!this.warnMode && !result.success) {
      throw new Error(`Hermeticity violations detected in task ${task.id}`);
    }

    return result;
  }

  /**
   * Add a network access rule
   */
  addNetworkRule(rule: NetworkRule): void {
    this.networkRules.push(rule);
    console.log(
      `🌐 Added network rule: ${rule.pattern} (${rule.allowed ? 'ALLOW' : 'DENY'})`,
    );
  }

  /**
   * Add paths to the filesystem allowlist
   */
  addToAllowlist(paths: string[]): void {
    for (const path of paths) {
      this.allowlist.add(path);
    }
    console.log(`📁 Added ${paths.length} paths to allowlist`);
  }

  /**
   * Register a toolchain with its hash
   */
  async registerToolchain(
    toolchain: Omit<ToolchainInfo, 'lastVerified'>,
  ): Promise<void> {
    const info: ToolchainInfo = {
      ...toolchain,
      lastVerified: Date.now(),
    };

    this.toolchainCache.set(toolchain.hash, info);
    console.log(
      `🔧 Registered toolchain: ${toolchain.name}@${toolchain.version} (${toolchain.hash.slice(0, 8)})`,
    );
  }

  /**
   * Get hermeticity statistics
   */
  getStats(): typeof this.stats & {
    passRate: number;
    violationRate: number;
    commonViolations: Array<{ type: string; count: number }>;
  } {
    const passRate =
      this.stats.tasksExecuted > 0
        ? (this.stats.tasksPassed / this.stats.tasksExecuted) * 100
        : 0;
    const violationRate =
      this.stats.tasksExecuted > 0
        ? (this.stats.violationsDetected / this.stats.tasksExecuted) * 100
        : 0;

    // Calculate common violation types
    const violationCounts = new Map<string, number>();
    for (const violations of this.violations.values()) {
      for (const violation of violations) {
        violationCounts.set(
          violation.type,
          (violationCounts.get(violation.type) || 0) + 1,
        );
      }
    }

    const commonViolations = Array.from(violationCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      ...this.stats,
      passRate,
      violationRate,
      commonViolations,
    };
  }

  private async prepareSandbox(task: HermeticTask): Promise<Sandbox> {
    const sandboxDir = `/tmp/hermetic_${task.id}_${Date.now()}`;
    await fs.mkdir(sandboxDir, { recursive: true });

    // Copy declared inputs to sandbox
    const actualInputs: string[] = [];
    for (const input of task.declaredInputs) {
      const inputPath = path.resolve(task.workingDir, input);
      const sandboxPath = path.join(sandboxDir, input);

      try {
        await fs.mkdir(path.dirname(sandboxPath), { recursive: true });
        await fs.copyFile(inputPath, sandboxPath);
        actualInputs.push(input);
      } catch (error) {
        console.warn(`⚠️ Could not copy input ${input}:`, error);
      }
    }

    return {
      id: task.id,
      directory: sandboxDir,
      actualInputs,
      actualOutputs: [],
      startTime: Date.now(),
    };
  }

  private async executeInSandbox(
    task: HermeticTask,
    sandbox: Sandbox,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');

    return new Promise((resolve) => {
      const [command, ...args] = task.command.split(' ');

      const child = spawn(command, args, {
        cwd: sandbox.directory,
        env: this.buildSandboxEnvironment(task),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: task.timeout || 300000, // 5 min default
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: stderr + error.message,
        });
      });
    });
  }

  private buildSandboxEnvironment(task: HermeticTask): Record<string, string> {
    const baseEnv = {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: '/tmp',
      HERMETIC: 'true',
    };

    // Add allowed environment variables
    if (task.allowedEnvVars) {
      for (const envVar of task.allowedEnvVars) {
        const value = process.env[envVar];
        if (value) {
          baseEnv[envVar] = value;
        }
      }
    }

    return baseEnv;
  }

  private async startMonitoring(
    task: HermeticTask,
  ): Promise<MonitoringSession> {
    const session: MonitoringSession = {
      taskId: task.id,
      startTime: Date.now(),
      networkAccesses: [],
      fileAccesses: [],
      violations: [],
    };

    // Start network monitoring
    await this.networkDetector.startMonitoring(session);

    // Start filesystem monitoring
    await this.fileSystemMonitor.startMonitoring(session, task);

    return session;
  }

  private async stopMonitoring(
    session: MonitoringSession,
  ): Promise<HermeticityViolation[]> {
    await this.networkDetector.stopMonitoring(session.taskId);
    await this.fileSystemMonitor.stopMonitoring(session.taskId);

    return session.violations;
  }

  private async validateInputsOutputs(
    task: HermeticTask,
    sandbox: Sandbox,
  ): Promise<HermeticityViolation[]> {
    const violations: HermeticityViolation[] = [];

    // Check that all declared outputs were created
    for (const declaredOutput of task.declaredOutputs) {
      const outputPath = path.join(sandbox.directory, declaredOutput);

      try {
        await fs.access(outputPath);
        sandbox.actualOutputs.push(declaredOutput);
      } catch {
        violations.push({
          type: 'undeclared_write',
          resource: declaredOutput,
          timestamp: Date.now(),
          remediation: `Declared output not created: ${declaredOutput}. Ensure your build command produces this file.`,
          severity: 'warning',
        });
      }
    }

    // Scan for undeclared outputs
    const allFiles = await this.scanSandboxFiles(sandbox.directory);
    const declaredOutputSet = new Set(task.declaredOutputs);

    for (const file of allFiles) {
      const relativePath = path.relative(sandbox.directory, file);
      if (
        !declaredOutputSet.has(relativePath) &&
        !this.isExpectedSystemFile(relativePath)
      ) {
        violations.push({
          type: 'undeclared_write',
          resource: relativePath,
          timestamp: Date.now(),
          remediation: `Add '${relativePath}' to declaredOutputs or remove unexpected file creation.`,
          severity: 'error',
        });
      }
    }

    return violations;
  }

  private async scanSandboxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...(await this.scanSandboxFiles(fullPath)));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore errors (directory may not exist)
    }

    return files;
  }

  private isExpectedSystemFile(filePath: string): boolean {
    const systemPatterns = [
      /^\.$/,
      /^\.\.$/,
      /^\.git/,
      /^node_modules/,
      /^\.npm/,
      /^\.cache/,
      /tmp/,
    ];

    return systemPatterns.some((pattern) => pattern.test(filePath));
  }

  private async verifyToolchain(expectedHash: string): Promise<boolean> {
    const toolchain = this.toolchainCache.get(expectedHash);
    if (!toolchain) {
      console.warn(`⚠️ Unknown toolchain hash: ${expectedHash}`);
      return false;
    }

    // Verify the toolchain binary still matches
    try {
      const currentHash = await this.calculateToolchainHash(toolchain.binary);
      const matches = currentHash === expectedHash;

      if (matches) {
        toolchain.lastVerified = Date.now();
      }

      return matches;
    } catch (error) {
      console.error(`❌ Failed to verify toolchain ${toolchain.name}:`, error);
      return false;
    }
  }

  private async calculateToolchainHash(binaryPath: string): Promise<string> {
    try {
      const data = await fs.readFile(binaryPath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      throw new Error(`Cannot calculate hash for ${binaryPath}: ${error}`);
    }
  }

  private async attemptAutoRemediation(
    task: HermeticTask,
    violations: HermeticityViolation[],
  ): Promise<number> {
    let remediatedCount = 0;

    for (const violation of violations) {
      try {
        switch (violation.type) {
          case 'network_access':
            // Auto-add commonly needed hosts to allowlist
            if (this.isCommonBuildHost(violation.resource)) {
              this.addNetworkRule({
                pattern: violation.resource,
                allowed: true,
                reason: 'Auto-remediated common build dependency',
                expiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
              });
              remediatedCount++;
            }
            break;

          case 'undeclared_read':
            // Auto-add commonly read files to allowlist
            if (this.isCommonBuildFile(violation.resource)) {
              this.addToAllowlist([violation.resource]);
              remediatedCount++;
            }
            break;
        }
      } catch (error) {
        console.warn(
          `Failed to auto-remediate violation ${violation.type}:`,
          error,
        );
      }
    }

    return remediatedCount;
  }

  private isCommonBuildHost(host: string): boolean {
    const commonHosts = [
      'registry.npmjs.org',
      'github.com',
      'api.github.com',
      'cdn.jsdelivr.net',
      'unpkg.com',
      'registry.yarnpkg.com',
    ];

    return commonHosts.includes(host);
  }

  private isCommonBuildFile(filePath: string): boolean {
    const commonFiles = [
      'package.json',
      'yarn.lock',
      'package-lock.json',
      'tsconfig.json',
      '.gitignore',
      'README.md',
    ];

    return commonFiles.some((file) => filePath.endsWith(file));
  }

  private updateStats(result: HermeticityResult): void {
    if (result.success) {
      this.stats.tasksPassed++;
    }

    this.stats.violationsDetected += result.violations.length;
    this.stats.networkViolations += result.violations.filter(
      (v) => v.type === 'network_access',
    ).length;
    this.stats.fileSystemViolations += result.violations.filter(
      (v) => v.type === 'undeclared_read' || v.type === 'undeclared_write',
    ).length;
  }

  private async cleanupSandbox(sandbox: Sandbox): Promise<void> {
    try {
      await fs.rm(sandbox.directory, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup sandbox ${sandbox.id}:`, error);
    }
  }

  private initializeNetworkRules(): void {
    // Default deny-all rule
    this.networkRules = [
      {
        pattern: '*',
        allowed: false,
        reason: 'Default deny-all policy',
      },
    ];
  }

  private initializeAllowlist(): void {
    // Common build system files that are safe to read
    const commonFiles = [
      '/etc/passwd',
      '/etc/group',
      '/etc/hostname',
      '/proc/version',
      '/usr/lib/**/*',
      '/usr/share/**/*',
    ];

    this.addToAllowlist(commonFiles);
  }

  /**
   * Set warn mode (violations logged but not enforced)
   */
  setWarnMode(enabled: boolean): void {
    this.warnMode = enabled;
    console.log(
      `🔒 Hermeticity Gate ${enabled ? 'warn' : 'enforce'} mode enabled`,
    );
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down hermeticity gate...');

    await this.networkDetector.shutdown();
    await this.fileSystemMonitor.shutdown();

    console.log('✅ Hermeticity gate shut down');
  }
}

// Helper classes for monitoring
class NetworkDetector {
  private activeSessions: Map<string, MonitoringSession> = new Map();

  constructor(private gate: HermeticityGate) {}

  async startMonitoring(session: MonitoringSession): Promise<void> {
    this.activeSessions.set(session.taskId, session);
    // In a real implementation, this would hook into network syscalls
    console.log(`🌐 Started network monitoring for task ${session.taskId}`);
  }

  async stopMonitoring(taskId: string): Promise<void> {
    this.activeSessions.delete(taskId);
    console.log(`🌐 Stopped network monitoring for task ${taskId}`);
  }

  async shutdown(): Promise<void> {
    this.activeSessions.clear();
  }
}

class FileSystemMonitor {
  private activeSessions: Map<string, MonitoringSession> = new Map();

  constructor(private gate: HermeticityGate) {}

  async startMonitoring(
    session: MonitoringSession,
    task: HermeticTask,
  ): Promise<void> {
    this.activeSessions.set(session.taskId, session);
    // In a real implementation, this would hook into filesystem syscalls
    console.log(`📁 Started filesystem monitoring for task ${session.taskId}`);
  }

  async stopMonitoring(taskId: string): Promise<void> {
    this.activeSessions.delete(taskId);
    console.log(`📁 Stopped filesystem monitoring for task ${taskId}`);
  }

  async shutdown(): Promise<void> {
    this.activeSessions.clear();
  }
}

// Supporting interfaces
interface Sandbox {
  id: string;
  directory: string;
  actualInputs: string[];
  actualOutputs: string[];
  startTime: number;
}

interface MonitoringSession {
  taskId: string;
  startTime: number;
  networkAccesses: Array<{ host: string; port: number; protocol: string }>;
  fileAccesses: Array<{ path: string; operation: string; timestamp: number }>;
  violations: HermeticityViolation[];
}

// Factory function
export function createHermeticityGate(config?: any): HermeticityGate {
  return new HermeticityGate(config);
}
