#!/usr/bin/env node

/**
 * Maestro Doctor - Composer vNext Sprint
 * Environment checks and build system diagnostics
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

interface DiagnosticCheck {
  name: string;
  category: 'environment' | 'tools' | 'configuration' | 'performance';
  check: () => Promise<DiagnosticResult>;
}

interface DiagnosticResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
  fix?: string;
  impact?: 'low' | 'medium' | 'high';
}

class MaestroDoctor {
  private checks: DiagnosticCheck[] = [];

  constructor() {
    this.initializeChecks();
  }

  async runDiagnostics(): Promise<void> {
    console.log('🩺 Maestro Doctor - Build System Health Check\n');
    console.log('='.repeat(60));

    const results: { [category: string]: DiagnosticResult[] } = {};
    let totalChecks = 0;
    let passedChecks = 0;
    let warnings = 0;
    let failures = 0;

    for (const check of this.checks) {
      console.log(`🔍 Checking: ${check.name}...`);

      try {
        const result = await check.check();

        if (!results[check.category]) {
          results[check.category] = [];
        }
        results[check.category].push(result);

        const statusIcon = this.getStatusIcon(result.status);
        console.log(`${statusIcon} ${check.name}: ${result.message}`);

        if (result.details) {
          console.log(`   ${result.details}`);
        }

        if (result.status === 'fail' && result.fix) {
          console.log(`   💡 Fix: ${result.fix}`);
        }

        totalChecks++;
        if (result.status === 'pass') passedChecks++;
        else if (result.status === 'warn') warnings++;
        else failures++;
      } catch (error) {
        console.log(`❌ ${check.name}: Check failed - ${error}`);
        failures++;
        totalChecks++;
      }

      console.log('');
    }

    this.printSummary(totalChecks, passedChecks, warnings, failures);
    this.printRecommendations(results);
  }

  private initializeChecks(): void {
    // Environment checks
    this.checks.push({
      name: 'Node.js Version',
      category: 'environment',
      check: this.checkNodeVersion,
    });

    this.checks.push({
      name: 'System Resources',
      category: 'environment',
      check: this.checkSystemResources,
    });

    this.checks.push({
      name: 'Disk Space',
      category: 'environment',
      check: this.checkDiskSpace,
    });

    // Tool availability
    this.checks.push({
      name: 'Docker',
      category: 'tools',
      check: this.checkDocker,
    });

    this.checks.push({
      name: 'BuildKit Support',
      category: 'tools',
      check: this.checkBuildKit,
    });

    this.checks.push({
      name: 'Git Configuration',
      category: 'tools',
      check: this.checkGit,
    });

    // Configuration checks
    this.checks.push({
      name: 'Package.json Structure',
      category: 'configuration',
      check: this.checkPackageJson,
    });

    this.checks.push({
      name: 'TypeScript Configuration',
      category: 'configuration',
      check: this.checkTypeScriptConfig,
    });

    this.checks.push({
      name: 'Cache Configuration',
      category: 'configuration',
      check: this.checkCacheConfig,
    });

    this.checks.push({
      name: 'Test Setup',
      category: 'configuration',
      check: this.checkTestSetup,
    });

    // Performance checks
    this.checks.push({
      name: 'Node Modules Size',
      category: 'performance',
      check: this.checkNodeModulesSize,
    });

    this.checks.push({
      name: 'Build Cache Health',
      category: 'performance',
      check: this.checkBuildCache,
    });

    this.checks.push({
      name: 'Parallel Execution',
      category: 'performance',
      check: this.checkParallelExecution,
    });
  }

  private checkNodeVersion = async (): Promise<DiagnosticResult> => {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      return {
        status: 'pass',
        message: `Node.js ${version} (supported)`,
        details: 'Recommended version for optimal performance',
      };
    } else if (majorVersion >= 16) {
      return {
        status: 'warn',
        message: `Node.js ${version} (outdated)`,
        details: 'Consider upgrading to Node.js 18+ for better performance',
        fix: 'Update Node.js using nvm or your package manager',
        impact: 'medium',
      };
    } else {
      return {
        status: 'fail',
        message: `Node.js ${version} (unsupported)`,
        details: 'Build system requires Node.js 16+',
        fix: 'Upgrade to Node.js 18+ immediately',
        impact: 'high',
      };
    }
  };

  private checkSystemResources = async (): Promise<DiagnosticResult> => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;

    const memoryGB = Math.round(totalMemory / 1024 / 1024 / 1024);
    const freeGB = Math.round(freeMemory / 1024 / 1024 / 1024);
    const memoryUsage = (
      ((totalMemory - freeMemory) / totalMemory) *
      100
    ).toFixed(1);

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `${memoryGB}GB RAM, ${cpuCount} CPUs (${memoryUsage}% used)`;
    let fix = '';

    if (memoryGB < 4) {
      status = 'fail';
      fix = 'Consider upgrading to at least 8GB RAM for optimal builds';
    } else if (memoryGB < 8) {
      status = 'warn';
      fix = 'Consider upgrading to 16GB+ RAM for large projects';
    }

    if (parseFloat(memoryUsage) > 90) {
      status = 'warn';
      fix = 'Close unused applications to free memory';
    }

    return {
      status,
      message,
      details: `Free: ${freeGB}GB, Usage: ${memoryUsage}%`,
      fix: fix || undefined,
      impact: status === 'fail' ? 'high' : 'medium',
    };
  };

  private checkDiskSpace = async (): Promise<DiagnosticResult> => {
    try {
      const stats = await fs.statfs(process.cwd());
      const totalSpace = stats.bavail * stats.bsize;
      const totalSpaceGB = Math.round(totalSpace / 1024 / 1024 / 1024);

      if (totalSpaceGB < 2) {
        return {
          status: 'fail',
          message: `${totalSpaceGB}GB free (insufficient)`,
          fix: 'Free up disk space - builds require at least 2GB',
          impact: 'high',
        };
      } else if (totalSpaceGB < 10) {
        return {
          status: 'warn',
          message: `${totalSpaceGB}GB free (limited)`,
          fix: 'Consider freeing up more space for cache and artifacts',
          impact: 'medium',
        };
      } else {
        return {
          status: 'pass',
          message: `${totalSpaceGB}GB free (adequate)`,
        };
      }
    } catch {
      return {
        status: 'warn',
        message: 'Could not check disk space',
        details: 'Manual verification recommended',
      };
    }
  };

  private checkDocker = async (): Promise<DiagnosticResult> => {
    try {
      execSync('docker --version', { stdio: 'ignore' });

      try {
        execSync('docker info', { stdio: 'ignore' });
        return {
          status: 'pass',
          message: 'Docker available and running',
        };
      } catch {
        return {
          status: 'warn',
          message: 'Docker installed but not running',
          fix: 'Start Docker Desktop or docker daemon',
          impact: 'high',
        };
      }
    } catch {
      return {
        status: 'fail',
        message: 'Docker not found',
        fix: 'Install Docker from https://docker.com',
        impact: 'high',
      };
    }
  };

  private checkBuildKit = async (): Promise<DiagnosticResult> => {
    try {
      execSync('docker buildx version', { stdio: 'ignore' });
      return {
        status: 'pass',
        message: 'BuildKit support available',
      };
    } catch {
      return {
        status: 'warn',
        message: 'BuildKit not available',
        fix: 'Update Docker to a version that supports BuildKit',
        impact: 'medium',
      };
    }
  };

  private checkGit = async (): Promise<DiagnosticResult> => {
    try {
      execSync('git --version', { stdio: 'ignore' });

      try {
        const userName = execSync('git config user.name', {
          encoding: 'utf8',
        }).trim();
        const userEmail = execSync('git config user.email', {
          encoding: 'utf8',
        }).trim();

        if (userName && userEmail) {
          return {
            status: 'pass',
            message: 'Git configured properly',
          };
        } else {
          return {
            status: 'warn',
            message: 'Git missing user configuration',
            fix: 'Run: git config --global user.name "Your Name" && git config --global user.email "you@example.com"',
            impact: 'low',
          };
        }
      } catch {
        return {
          status: 'warn',
          message: 'Git user configuration incomplete',
          fix: 'Set git user.name and user.email',
          impact: 'low',
        };
      }
    } catch {
      return {
        status: 'fail',
        message: 'Git not installed',
        fix: 'Install Git from https://git-scm.com',
        impact: 'high',
      };
    }
  };

  private checkPackageJson = async (): Promise<DiagnosticResult> => {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8'),
      );

      const issues: string[] = [];

      if (!packageJson.scripts?.build) {
        issues.push('Missing build script');
      }

      if (!packageJson.scripts?.test) {
        issues.push('Missing test script');
      }

      if (!packageJson.scripts?.lint) {
        issues.push('Missing lint script');
      }

      if (issues.length === 0) {
        return {
          status: 'pass',
          message: 'Package.json properly configured',
        };
      } else {
        return {
          status: 'warn',
          message: `Package.json issues: ${issues.join(', ')}`,
          fix: 'Add missing scripts to package.json',
          impact: 'medium',
        };
      }
    } catch {
      return {
        status: 'fail',
        message: 'package.json not found or invalid',
        fix: 'Create valid package.json in project root',
        impact: 'high',
      };
    }
  };

  private checkTypeScriptConfig = async (): Promise<DiagnosticResult> => {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');

    try {
      await fs.access(tsconfigPath);
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'));

      const issues: string[] = [];

      if (!tsconfig.compilerOptions?.strict) {
        issues.push('Strict mode disabled');
      }

      if (!tsconfig.compilerOptions?.incremental) {
        issues.push('Incremental compilation disabled');
      }

      if (issues.length === 0) {
        return {
          status: 'pass',
          message: 'TypeScript configuration optimal',
        };
      } else {
        return {
          status: 'warn',
          message: `TypeScript config issues: ${issues.join(', ')}`,
          fix: 'Enable strict mode and incremental compilation',
          impact: 'medium',
        };
      }
    } catch {
      return {
        status: 'warn',
        message: 'TypeScript configuration not found',
        details: 'Using default configuration',
        impact: 'low',
      };
    }
  };

  private checkCacheConfig = async (): Promise<DiagnosticResult> => {
    const cacheDir = path.join(process.cwd(), '.maestro-cache');

    try {
      await fs.access(cacheDir);
      const stats = await fs.stat(cacheDir);

      if (stats.isDirectory()) {
        return {
          status: 'pass',
          message: 'Build cache directory exists',
        };
      } else {
        return {
          status: 'warn',
          message: 'Cache path exists but is not a directory',
          fix: 'Remove .maestro-cache file and let system create directory',
          impact: 'medium',
        };
      }
    } catch {
      return {
        status: 'warn',
        message: 'Build cache not initialized',
        details: 'Will be created on first build',
        impact: 'low',
      };
    }
  };

  private checkTestSetup = async (): Promise<DiagnosticResult> => {
    const testDirs = ['test', 'tests', '__tests__', 'spec'];
    let testDirFound = false;

    for (const dir of testDirs) {
      try {
        const testPath = path.join(process.cwd(), dir);
        const stats = await fs.stat(testPath);
        if (stats.isDirectory()) {
          testDirFound = true;
          break;
        }
      } catch {
        // Directory doesn't exist
      }
    }

    if (testDirFound) {
      return {
        status: 'pass',
        message: 'Test directory structure found',
      };
    } else {
      return {
        status: 'warn',
        message: 'No test directories found',
        fix: 'Create test directory and add tests',
        impact: 'medium',
      };
    }
  };

  private checkNodeModulesSize = async (): Promise<DiagnosticResult> => {
    try {
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      const size = await this.getDirectorySize(nodeModulesPath);
      const sizeMB = Math.round(size / 1024 / 1024);

      if (sizeMB > 1000) {
        return {
          status: 'warn',
          message: `node_modules is large (${sizeMB}MB)`,
          fix: 'Consider removing unused dependencies or using npm ci --production',
          impact: 'medium',
        };
      } else {
        return {
          status: 'pass',
          message: `node_modules size reasonable (${sizeMB}MB)`,
        };
      }
    } catch {
      return {
        status: 'warn',
        message: 'node_modules not found',
        fix: 'Run npm install to install dependencies',
      };
    }
  };

  private checkBuildCache = async (): Promise<DiagnosticResult> => {
    const cacheDir = path.join(process.cwd(), '.maestro-cache');

    try {
      const indexPath = path.join(cacheDir, 'index.json');
      await fs.access(indexPath);

      const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      const entryCount = Array.isArray(indexData) ? indexData.length : 0;

      return {
        status: 'pass',
        message: `Build cache healthy (${entryCount} entries)`,
      };
    } catch {
      return {
        status: 'warn',
        message: 'Build cache not initialized',
        details: 'First build will establish cache',
        impact: 'low',
      };
    }
  };

  private checkParallelExecution = async (): Promise<DiagnosticResult> => {
    const cpuCount = os.cpus().length;

    if (cpuCount >= 8) {
      return {
        status: 'pass',
        message: `Excellent parallelization (${cpuCount} cores)`,
      };
    } else if (cpuCount >= 4) {
      return {
        status: 'pass',
        message: `Good parallelization (${cpuCount} cores)`,
      };
    } else {
      return {
        status: 'warn',
        message: `Limited parallelization (${cpuCount} cores)`,
        details: 'Builds may be slower on this system',
        impact: 'medium',
      };
    }
  };

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    async function calculateSize(currentPath: string): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    }

    await calculateSize(dirPath);
    return totalSize;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pass':
        return '✅';
      case 'warn':
        return '⚠️';
      case 'fail':
        return '❌';
      default:
        return '❓';
    }
  }

  private printSummary(
    total: number,
    passed: number,
    warnings: number,
    failures: number,
  ): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total checks: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failures}`);

    const score = Math.round((passed / total) * 100);
    console.log(`\n🎯 Overall Health Score: ${score}%`);

    if (score >= 90) {
      console.log('🟢 Excellent - Your build environment is well optimized!');
    } else if (score >= 70) {
      console.log('🟡 Good - Some optimizations recommended');
    } else {
      console.log('🔴 Needs Attention - Several issues should be addressed');
    }
  }

  private printRecommendations(results: {
    [category: string]: DiagnosticResult[];
  }): void {
    console.log('\n💡 KEY RECOMMENDATIONS');
    console.log('='.repeat(60));

    let hasRecommendations = false;

    for (const [category, categoryResults] of Object.entries(results)) {
      const highImpactIssues = categoryResults.filter(
        (r) =>
          (r.status === 'fail' || r.status === 'warn') &&
          r.fix &&
          r.impact === 'high',
      );

      if (highImpactIssues.length > 0) {
        console.log(`\n🔴 High Priority (${category}):`);
        highImpactIssues.forEach((issue) => {
          console.log(`   • ${issue.fix}`);
        });
        hasRecommendations = true;
      }
    }

    if (!hasRecommendations) {
      console.log(
        '✨ No critical issues found! Your build environment looks great.',
      );
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const doctor = new MaestroDoctor();
  doctor.runDiagnostics().catch((error) => {
    console.error('❌ Doctor check failed:', error);
    process.exit(1);
  });
}

export { MaestroDoctor };
