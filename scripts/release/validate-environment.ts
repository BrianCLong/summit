#!/usr/bin/env npx tsx
/**
 * Release Environment Validator
 *
 * Validates target deployment environments before release:
 * - Checks Kubernetes cluster connectivity
 * - Validates required secrets exist
 * - Verifies database connectivity
 * - Checks resource availability
 * - Validates configuration
 *
 * Usage:
 *   npx tsx scripts/release/validate-environment.ts <environment>
 *   pnpm release:validate-env staging
 *
 * Options:
 *   --config <file>    Environment config file
 *   --skip <checks>    Skip specific checks (comma-separated)
 *   --timeout <sec>    Timeout for connectivity checks (default: 30)
 *   --format <fmt>     Output format: text, json (default: text)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';

interface EnvironmentConfig {
  name: string;
  cluster?: {
    context?: string;
    namespace?: string;
  };
  endpoints: {
    name: string;
    url: string;
    expectedStatus?: number;
    timeout?: number;
  }[];
  secrets?: {
    name: string;
    namespace?: string;
  }[];
  databases?: {
    name: string;
    type: 'postgres' | 'redis' | 'neo4j';
    connectionString?: string;
    envVar?: string;
  }[];
  resources?: {
    minCpu?: string;
    minMemory?: string;
    minPods?: number;
  };
  configMaps?: {
    name: string;
    namespace?: string;
    requiredKeys?: string[];
  }[];
}

interface CheckResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: string;
  duration?: number;
}

interface ValidationReport {
  environment: string;
  timestamp: string;
  passed: boolean;
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

const DEFAULT_TIMEOUT = 30;

function run(cmd: string, args: string[], timeout?: number): { success: boolean; output: string; stderr: string } {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: (timeout || DEFAULT_TIMEOUT) * 1000,
  });
  return {
    success: result.status === 0,
    output: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  };
}

function checkUrl(url: string, expectedStatus: number = 200, timeout: number = 10): Promise<CheckResult> {
  return new Promise(resolve => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.get(
      url,
      {
        timeout: timeout * 1000,
        rejectUnauthorized: false, // Allow self-signed certs for internal endpoints
      },
      res => {
        const duration = Date.now() - startTime;
        const passed = res.statusCode === expectedStatus;
        resolve({
          name: `Endpoint: ${urlObj.hostname}`,
          category: 'connectivity',
          passed,
          message: passed
            ? `Returned ${res.statusCode} in ${duration}ms`
            : `Expected ${expectedStatus}, got ${res.statusCode}`,
          duration,
        });
      }
    );

    req.on('error', err => {
      resolve({
        name: `Endpoint: ${urlObj.hostname}`,
        category: 'connectivity',
        passed: false,
        message: `Connection failed: ${err.message}`,
        duration: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: `Endpoint: ${urlObj.hostname}`,
        category: 'connectivity',
        passed: false,
        message: `Timeout after ${timeout}s`,
        duration: timeout * 1000,
      });
    });
  });
}

function checkKubernetesConnectivity(context?: string): CheckResult {
  const args = context ? ['--context', context, 'cluster-info'] : ['cluster-info'];
  const result = run('kubectl', args);

  return {
    name: 'Kubernetes Cluster',
    category: 'infrastructure',
    passed: result.success,
    message: result.success ? 'Cluster is accessible' : 'Cannot connect to cluster',
    details: result.success ? undefined : result.stderr,
  };
}

function checkKubernetesNamespace(namespace: string, context?: string): CheckResult {
  const args = context
    ? ['--context', context, 'get', 'namespace', namespace]
    : ['get', 'namespace', namespace];
  const result = run('kubectl', args);

  return {
    name: `Namespace: ${namespace}`,
    category: 'infrastructure',
    passed: result.success,
    message: result.success ? 'Namespace exists' : 'Namespace not found',
  };
}

function checkKubernetesSecret(name: string, namespace: string, context?: string): CheckResult {
  const args = context
    ? ['--context', context, '-n', namespace, 'get', 'secret', name, '-o', 'name']
    : ['-n', namespace, 'get', 'secret', name, '-o', 'name'];
  const result = run('kubectl', args);

  return {
    name: `Secret: ${name}`,
    category: 'secrets',
    passed: result.success,
    message: result.success ? 'Secret exists' : 'Secret not found',
  };
}

function checkKubernetesConfigMap(
  name: string,
  namespace: string,
  requiredKeys?: string[],
  context?: string
): CheckResult {
  const args = context
    ? ['--context', context, '-n', namespace, 'get', 'configmap', name, '-o', 'json']
    : ['-n', namespace, 'get', 'configmap', name, '-o', 'json'];
  const result = run('kubectl', args);

  if (!result.success) {
    return {
      name: `ConfigMap: ${name}`,
      category: 'configuration',
      passed: false,
      message: 'ConfigMap not found',
    };
  }

  if (requiredKeys && requiredKeys.length > 0) {
    try {
      const configMap = JSON.parse(result.output);
      const data = configMap.data || {};
      const missingKeys = requiredKeys.filter(k => !(k in data));

      if (missingKeys.length > 0) {
        return {
          name: `ConfigMap: ${name}`,
          category: 'configuration',
          passed: false,
          message: `Missing keys: ${missingKeys.join(', ')}`,
        };
      }
    } catch {
      return {
        name: `ConfigMap: ${name}`,
        category: 'configuration',
        passed: false,
        message: 'Failed to parse ConfigMap',
      };
    }
  }

  return {
    name: `ConfigMap: ${name}`,
    category: 'configuration',
    passed: true,
    message: 'ConfigMap exists with required keys',
  };
}

function checkDatabaseConnectivity(
  name: string,
  type: string,
  connectionString?: string
): CheckResult {
  // For security, we only check if the connection string env var is set
  // Actual connectivity would require the respective client tools
  if (!connectionString) {
    return {
      name: `Database: ${name} (${type})`,
      category: 'database',
      passed: false,
      message: 'No connection string provided',
    };
  }

  // Check if it looks like a valid connection string
  let isValid = false;
  switch (type) {
    case 'postgres':
      isValid = connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://');
      break;
    case 'redis':
      isValid = connectionString.startsWith('redis://') || connectionString.startsWith('rediss://');
      break;
    case 'neo4j':
      isValid = connectionString.startsWith('bolt://') || connectionString.startsWith('neo4j://');
      break;
  }

  return {
    name: `Database: ${name} (${type})`,
    category: 'database',
    passed: isValid,
    message: isValid ? 'Connection string format valid' : 'Invalid connection string format',
  };
}

function checkResourceAvailability(
  namespace: string,
  minPods?: number,
  context?: string
): CheckResult {
  if (!minPods) {
    return {
      name: 'Resource Availability',
      category: 'resources',
      passed: true,
      message: 'No minimum pods requirement',
    };
  }

  const args = context
    ? ['--context', context, '-n', namespace, 'get', 'pods', '--field-selector=status.phase=Running', '-o', 'name']
    : ['-n', namespace, 'get', 'pods', '--field-selector=status.phase=Running', '-o', 'name'];
  const result = run('kubectl', args);

  if (!result.success) {
    return {
      name: 'Resource Availability',
      category: 'resources',
      passed: false,
      message: 'Cannot check pod count',
    };
  }

  const runningPods = result.output.split('\n').filter(Boolean).length;
  const passed = runningPods >= minPods;

  return {
    name: 'Resource Availability',
    category: 'resources',
    passed,
    message: passed
      ? `${runningPods} running pods (>= ${minPods} required)`
      : `Only ${runningPods} running pods (need ${minPods})`,
  };
}

function checkHelmRelease(releaseName: string, namespace: string, context?: string): CheckResult {
  const args = context
    ? ['--kube-context', context, '-n', namespace, 'status', releaseName]
    : ['-n', namespace, 'status', releaseName];
  const result = run('helm', args);

  return {
    name: `Helm Release: ${releaseName}`,
    category: 'deployment',
    passed: result.success,
    message: result.success ? 'Helm release exists' : 'Helm release not found',
  };
}

function checkEnvVar(name: string): CheckResult {
  const value = process.env[name];
  return {
    name: `Env: ${name}`,
    category: 'configuration',
    passed: !!value,
    message: value ? 'Environment variable set' : 'Environment variable not set',
  };
}

function loadConfig(configPath: string): EnvironmentConfig | null {
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getDefaultConfig(env: string): EnvironmentConfig {
  const configs: Record<string, EnvironmentConfig> = {
    development: {
      name: 'development',
      endpoints: [
        { name: 'API', url: 'http://localhost:4000/health' },
      ],
      databases: [
        { name: 'PostgreSQL', type: 'postgres', envVar: 'DATABASE_URL' },
        { name: 'Redis', type: 'redis', envVar: 'REDIS_URL' },
      ],
    },
    staging: {
      name: 'staging',
      cluster: {
        context: 'staging-cluster',
        namespace: 'summit-staging',
      },
      endpoints: [
        { name: 'API', url: 'https://staging-api.example.com/health' },
        { name: 'Web', url: 'https://staging.example.com' },
      ],
      secrets: [
        { name: 'summit-secrets' },
        { name: 'database-credentials' },
      ],
      configMaps: [
        { name: 'summit-config', requiredKeys: ['API_URL', 'LOG_LEVEL'] },
      ],
      resources: {
        minPods: 2,
      },
    },
    production: {
      name: 'production',
      cluster: {
        context: 'production-cluster',
        namespace: 'summit',
      },
      endpoints: [
        { name: 'API', url: 'https://api.example.com/health' },
        { name: 'Web', url: 'https://app.example.com' },
      ],
      secrets: [
        { name: 'summit-secrets' },
        { name: 'database-credentials' },
        { name: 'tls-certificates' },
      ],
      configMaps: [
        { name: 'summit-config', requiredKeys: ['API_URL', 'LOG_LEVEL', 'OTEL_ENDPOINT'] },
      ],
      resources: {
        minPods: 3,
      },
    },
  };

  return configs[env] || {
    name: env,
    endpoints: [],
  };
}

async function validateEnvironment(
  config: EnvironmentConfig,
  skipChecks: string[],
  timeout: number
): Promise<ValidationReport> {
  const checks: CheckResult[] = [];
  const skip = new Set(skipChecks.map(s => s.toLowerCase()));

  // Kubernetes connectivity
  if (config.cluster && !skip.has('kubernetes')) {
    checks.push(checkKubernetesConnectivity(config.cluster.context));

    if (config.cluster.namespace) {
      checks.push(checkKubernetesNamespace(config.cluster.namespace, config.cluster.context));
    }
  }

  // Endpoint checks
  if (!skip.has('endpoints')) {
    for (const endpoint of config.endpoints) {
      const result = await checkUrl(endpoint.url, endpoint.expectedStatus || 200, endpoint.timeout || timeout);
      result.name = `Endpoint: ${endpoint.name}`;
      checks.push(result);
    }
  }

  // Secret checks
  if (config.secrets && !skip.has('secrets')) {
    for (const secret of config.secrets) {
      const namespace = secret.namespace || config.cluster?.namespace || 'default';
      checks.push(checkKubernetesSecret(secret.name, namespace, config.cluster?.context));
    }
  }

  // ConfigMap checks
  if (config.configMaps && !skip.has('configmaps')) {
    for (const cm of config.configMaps) {
      const namespace = cm.namespace || config.cluster?.namespace || 'default';
      checks.push(checkKubernetesConfigMap(cm.name, namespace, cm.requiredKeys, config.cluster?.context));
    }
  }

  // Database checks
  if (config.databases && !skip.has('databases')) {
    for (const db of config.databases) {
      const connString = db.connectionString || (db.envVar ? process.env[db.envVar] : undefined);
      checks.push(checkDatabaseConnectivity(db.name, db.type, connString));
    }
  }

  // Resource checks
  if (config.resources && config.cluster?.namespace && !skip.has('resources')) {
    checks.push(checkResourceAvailability(
      config.cluster.namespace,
      config.resources.minPods,
      config.cluster.context
    ));
  }

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  return {
    environment: config.name,
    timestamp: new Date().toISOString(),
    passed: failed === 0,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      skipped: skipChecks.length,
    },
  };
}

function formatTextReport(report: ValidationReport): void {
  console.log('\n========================================');
  console.log(`  Environment Validation: ${report.environment}`);
  console.log('========================================\n');

  const statusIcon = report.passed ? '[PASS]' : '[FAIL]';
  console.log(`Status: ${statusIcon}\n`);

  // Group by category
  const categories = new Map<string, CheckResult[]>();
  for (const check of report.checks) {
    const cat = check.category || 'other';
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(check);
  }

  for (const [category, checks] of categories) {
    console.log(`${category.charAt(0).toUpperCase() + category.slice(1)}:`);
    for (const check of checks) {
      const icon = check.passed ? '[OK]' : '[FAIL]';
      const duration = check.duration ? ` (${check.duration}ms)` : '';
      console.log(`   ${icon} ${check.name}`);
      console.log(`       ${check.message}${duration}`);
      if (check.details) {
        console.log(`       Details: ${check.details}`);
      }
    }
    console.log('');
  }

  console.log('Summary:');
  console.log(`   Total:   ${report.summary.total}`);
  console.log(`   Passed:  ${report.summary.passed}`);
  console.log(`   Failed:  ${report.summary.failed}`);
  if (report.summary.skipped > 0) {
    console.log(`   Skipped: ${report.summary.skipped}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let environment = 'development';
  let configFile: string | undefined;
  let skipChecks: string[] = [];
  let timeout = DEFAULT_TIMEOUT;
  let format = 'text';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        configFile = args[++i];
        break;
      case '--skip':
        skipChecks = args[++i].split(',').map(s => s.trim());
        break;
      case '--timeout':
        timeout = parseInt(args[++i], 10) || DEFAULT_TIMEOUT;
        break;
      case '--format':
        format = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Release Environment Validator

Usage: npx tsx scripts/release/validate-environment.ts <environment> [options]

Environments:
  development    Local development environment
  staging        Staging/QA environment
  production     Production environment

Options:
  --config <file>    Custom environment config file (JSON)
  --skip <checks>    Skip checks: kubernetes, endpoints, secrets, configmaps, databases, resources
  --timeout <sec>    Timeout for connectivity checks (default: 30)
  --format <fmt>     Output format: text, json (default: text)

Examples:
  pnpm release:validate-env staging
  pnpm release:validate-env production --skip databases
  pnpm release:validate-env staging --config envs/staging.json
  pnpm release:validate-env production --format json

Config File Format:
  {
    "name": "staging",
    "cluster": { "context": "staging-ctx", "namespace": "app-staging" },
    "endpoints": [{ "name": "API", "url": "https://api.example.com/health" }],
    "secrets": [{ "name": "app-secrets" }],
    "databases": [{ "name": "PostgreSQL", "type": "postgres", "envVar": "DATABASE_URL" }]
  }
`);
        process.exit(0);
      default:
        if (!args[i].startsWith('--')) {
          environment = args[i];
        }
    }
  }

  console.log('========================================');
  console.log('  Release Environment Validator');
  console.log('========================================\n');

  // Load config
  let config: EnvironmentConfig;
  if (configFile) {
    const loaded = loadConfig(configFile);
    if (!loaded) {
      console.error(`Failed to load config: ${configFile}`);
      process.exit(1);
    }
    config = loaded;
  } else {
    config = getDefaultConfig(environment);
  }

  console.log(`[validate] Environment: ${config.name}`);
  console.log(`[validate] Timeout: ${timeout}s`);
  if (skipChecks.length > 0) {
    console.log(`[validate] Skipping: ${skipChecks.join(', ')}`);
  }

  const report = await validateEnvironment(config, skipChecks, timeout);

  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    formatTextReport(report);
  }

  process.exit(report.passed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
