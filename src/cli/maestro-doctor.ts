#!/usr/bin/env node

/**
 * Maestro Doctor - Composer vNext Sprint
 * Environment checks and build system diagnostics
 */

import axios from 'axios';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import neo4j from 'neo4j-driver';
import path from 'path';
import os from 'os';
import { Pool } from 'pg';
import { createClient } from 'redis';

import Ajv from 'ajv';

interface DiagnosticCheck {
  name: string;
  category:
    | 'environment'
    | 'tools'
    | 'configuration'
    | 'performance'
    | 'golden-path';
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

    // Golden path checks
    this.checks.push({
      name: 'Environment Variables',
      category: 'golden-path',
      check: this.checkEnvironmentVariables,
    });

    this.checks.push({
      name: 'Postgres Connectivity',
      category: 'golden-path',
      check: this.checkPostgresConnectivity,
    });

    this.checks.push({
      name: 'Neo4j Connectivity',
      category: 'golden-path',
      check: this.checkNeo4jConnectivity,
    });

    this.checks.push({
      name: 'Redis Connectivity',
      category: 'golden-path',
      check: this.checkRedisConnectivity,
    });

    this.checks.push({
      name: 'Core Service Health',
      category: 'golden-path',
      check: this.checkServiceHealth,
    });

    this.checks.push({
      name: 'Schema Compatibility',
      category: 'golden-path',
      check: this.checkSchemaCompatibility,
    });

    this.checks.push({
      name: 'Connector Availability',
      category: 'golden-path',
      check: this.checkConnectorAvailability,
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
    const message = `${memoryGB}GB RAM, ${cpuCount} CPUs (${memoryUsage}% used)`;
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

  private checkEnvironmentVariables = async (): Promise<DiagnosticResult> => {
    const requiredVars = [
      { key: 'DATABASE_URL', description: 'Postgres connection string' },
      { key: 'POSTGRES_URL', description: 'Postgres connection string' },
      { key: 'NEO4J_URI', description: 'Neo4j bolt URI' },
      { key: 'NEO4J_USER', description: 'Neo4j username' },
      { key: 'NEO4J_PASSWORD', description: 'Neo4j password' },
      { key: 'REDIS_URL', description: 'Redis connection string' },
    ];

    const missing = requiredVars.filter((variable) => !process.env[variable.key]);

    if (missing.length === requiredVars.length) {
      return {
        status: 'fail',
        message: 'Core environment not configured',
        details:
          'None of the database or cache variables are set; golden path checks will fail',
        fix: 'Populate DATABASE_URL/POSTGRES_URL, NEO4J_*, and REDIS_URL in your .env',
        impact: 'high',
      };
    }

    if (missing.length > 0) {
      const names = missing.map((variable) => variable.key).join(', ');
      return {
        status: 'warn',
        message: `Missing variables: ${names}`,
        fix: 'Add the missing variables to align with the golden path defaults',
        impact: 'high',
      };
    }

    return {
      status: 'pass',
      message: 'Core environment variables present',
    };
  };

  private checkPostgresConnectivity = async (): Promise<DiagnosticResult> => {
    const connectionString =
      process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

    if (!connectionString) {
      return {
        status: 'warn',
        message: 'Postgres connection string not configured',
        fix: 'Set DATABASE_URL or POSTGRES_URL to enable database checks',
        impact: 'high',
      };
    }

    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
      max: 1,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      return {
        status: 'pass',
        message: 'Postgres reachable and responding',
        details: `Using ${connectionString.split('@').pop()}`,
      };
    } catch (error) {
      await pool.end();
      return {
        status: 'fail',
        message: 'Postgres connection failed',
        details: (error as Error).message,
        fix: 'Confirm the database is running and the connection string is correct',
        impact: 'high',
      };
    }
  };

  private checkNeo4jConnectivity = async (): Promise<DiagnosticResult> => {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      return {
        status: 'warn',
        message: 'Neo4j credentials not fully configured',
        fix: 'Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD for graph checks',
        impact: 'high',
      };
    }

    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 1,
      connectionTimeout: 3000,
    });

    try {
      const session = driver.session();
      await session.run('RETURN 1');
      await session.close();
      await driver.close();
      return {
        status: 'pass',
        message: 'Neo4j reachable and responding',
      };
    } catch (error) {
      await driver.close();
      return {
        status: 'fail',
        message: 'Neo4j connection failed',
        details: (error as Error).message,
        fix: 'Confirm the bolt URI, credentials, and service availability',
        impact: 'high',
      };
    }
  };

  private checkRedisConnectivity = async (): Promise<DiagnosticResult> => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      return {
        status: 'warn',
        message: 'Redis URL not configured',
        fix: 'Set REDIS_URL for cache connectivity',
        impact: 'medium',
      };
    }

    const client = createClient({
      url: redisUrl,
      socket: { connectTimeout: 3000 },
    });

    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return {
        status: 'pass',
        message: 'Redis reachable and responding',
      };
    } catch (error) {
      await client.quit().catch(() => undefined);
      return {
        status: 'fail',
        message: 'Redis connection failed',
        details: (error as Error).message,
        fix: 'Verify REDIS_URL and ensure Redis is running',
        impact: 'medium',
      };
    }
  };

  private checkServiceHealth = async (): Promise<DiagnosticResult> => {
    const endpoints = this.getHealthEndpoints();

    if (endpoints.length === 0) {
      return {
        status: 'warn',
        message: 'No service health endpoints configured',
        fix: 'Set SUMMIT_HEALTH_ENDPOINTS or ensure the API PORT is configured',
        impact: 'medium',
      };
    }

    const unhealthy: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 3000 });
        if (response.status >= 300) {
          unhealthy.push(`${endpoint} (status ${response.status})`);
        }
      } catch (error) {
        unhealthy.push(`${endpoint} (${(error as Error).message})`);
      }
    }

    if (unhealthy.length === 0) {
      return {
        status: 'pass',
        message: `${endpoints.length} health endpoint(s) reachable`,
      };
    }

    return {
      status: 'fail',
      message: `Unhealthy services: ${unhealthy.join(', ')}`,
      fix: 'Start the API stack and verify the health routes are exposed',
      impact: 'high',
    };
  };

  private checkSchemaCompatibility = async (): Promise<DiagnosticResult> => {
    const baselinePath = path.join(process.cwd(), 'schema', 'baseline.graphql');
    const activeSchemaPath = path.join(process.cwd(), 'graphql', 'schema.graphql');

    try {
      const [baseline, active] = await Promise.all([
        fs.readFile(baselinePath, 'utf8'),
        fs.readFile(activeSchemaPath, 'utf8'),
      ]);

      const baselineTypes = this.extractTypeNames(baseline);
      const missing = baselineTypes.filter((typeName) =>
        !active.includes(`type ${typeName}`) &&
        !active.includes(`interface ${typeName}`) &&
        !active.includes(`enum ${typeName}`),
      );

      if (missing.length === 0) {
        return {
          status: 'pass',
          message: 'GraphQL schema matches baseline contract',
        };
      }

      return {
        status: 'warn',
        message: `Baseline types missing: ${missing.join(', ')}`,
        fix: 'Regenerate schema or backfill missing types before deploying',
        impact: 'medium',
      };
    } catch (error) {
      return {
        status: 'warn',
        message: 'Unable to validate schema compatibility',
        details: (error as Error).message,
        fix: 'Ensure schema/baseline.graphql and graphql/schema.graphql exist',
        impact: 'medium',
      };
    }
  };

  private checkConnectorAvailability = async (): Promise<DiagnosticResult> => {
    const registryPath = path.join(process.cwd(), 'connectors', 'registry.json');
    const schemaPath = path.join(process.cwd(), 'connectors', 'registry.schema.json');

    if (!(await this.pathExists(registryPath))) {
      return {
        status: 'warn',
        message: 'Connector registry not found',
        fix: 'Create connectors/registry.json to enumerate available connectors',
        impact: 'medium',
      };
    }

    try {
      const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
      const connectors = Array.isArray(registry.connectors)
        ? registry.connectors
        : [];

      const missingPaths: string[] = [];

      for (const connector of connectors) {
        const connectorPath = connector.path
          ? path.join(process.cwd(), connector.path)
          : path.join(process.cwd(), 'connectors', `${connector.id}_connector`);

        if (!(await this.pathExists(connectorPath))) {
          missingPaths.push(connector.id || connectorPath);
        }
      }

      const schemaIssues = await this.validateConnectorSchema(registry, schemaPath);

      if (missingPaths.length === 0 && schemaIssues.length === 0) {
        return {
          status: 'pass',
          message: `${connectors.length} connectors registered and available`,
        };
      }

      const issues = [
        schemaIssues.length > 0
          ? `Schema drift: ${schemaIssues.join('; ')}`
          : null,
        missingPaths.length > 0
          ? `Missing on disk: ${missingPaths.join(', ')}`
          : null,
      ].filter(Boolean);

      return {
        status: 'warn',
        message: issues.join(' | '),
        fix: 'Align registry.json with registry.schema.json and ensure connector folders exist',
        impact: 'medium',
      };
    } catch (error) {
      return {
        status: 'warn',
        message: 'Failed to read connector registry',
        details: (error as Error).message,
        fix: 'Validate connectors/registry.json is valid JSON',
        impact: 'medium',
      };
    }
  };

  private getHealthEndpoints(): string[] {
    if (process.env.SUMMIT_HEALTH_ENDPOINTS) {
      return process.env.SUMMIT_HEALTH_ENDPOINTS.split(',')
        .map((endpoint) => endpoint.trim())
        .filter(Boolean);
    }

    const port = process.env.PORT || '4000';
    return [`http://localhost:${port}/health`];
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private extractTypeNames(schema: string): string[] {
    const matches = [...schema.matchAll(/^(type|interface|enum)\s+(\w+)/gm)];
    return matches.map((match) => match[2]);
  }

  private async validateConnectorSchema(
    registry: any,
    schemaPath: string,
  ): Promise<string[]> {
    if (!(await this.pathExists(schemaPath))) {
      return [];
    }

    try {
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      const valid = validate(registry);

      if (valid) return [];
      return (validate.errors || []).map(
        (err) => `${err.instancePath || 'root'} ${err.message}`,
      );
    } catch (error) {
      return [(error as Error).message];
    }
  }

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
