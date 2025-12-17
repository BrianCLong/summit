import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { z } from 'zod';

interface ValidationResult {
  category: string;
  check: string;
  passed: boolean;
  message: string;
}

export const validateCommand = new Command('validate')
  .description('Validate a service against Golden Path requirements')
  .argument('<service>', 'Service name or path to validate')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (service: string, options: { verbose?: boolean }) => {
    try {
      const servicePath = await resolveServicePath(service);
      const results = await validateService(servicePath, options.verbose);
      printResults(results);

      const failed = results.filter((r) => !r.passed).length;
      if (failed > 0) {
        console.log(chalk.red(`\n${failed} check(s) failed`));
        process.exit(1);
      } else {
        console.log(chalk.green('\nAll checks passed!'));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

async function resolveServicePath(service: string): Promise<string> {
  // Check if it's an absolute path
  if (path.isAbsolute(service)) {
    if (await fs.pathExists(service)) {
      return service;
    }
    throw new Error(`Path not found: ${service}`);
  }

  // Check common locations
  const locations = [
    path.join(process.cwd(), service),
    path.join(process.cwd(), 'services', service),
    path.join(process.cwd(), 'apps', service),
    path.join(process.cwd(), 'packages', service),
  ];

  for (const loc of locations) {
    if (await fs.pathExists(loc)) {
      return loc;
    }
  }

  throw new Error(`Service not found: ${service}`);
}

async function validateService(
  servicePath: string,
  verbose?: boolean
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  if (verbose) {
    console.log(chalk.cyan(`\nValidating: ${servicePath}\n`));
  }

  // Structure checks
  results.push(...(await validateStructure(servicePath)));

  // Configuration checks
  results.push(...(await validateConfiguration(servicePath)));

  // Health endpoint checks
  results.push(...(await validateHealthEndpoints(servicePath)));

  // Observability checks
  results.push(...(await validateObservability(servicePath)));

  // Security checks
  results.push(...(await validateSecurity(servicePath)));

  // CI/CD checks
  results.push(...(await validateCiCd(servicePath)));

  return results;
}

async function validateStructure(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'Structure';

  // Required directories
  const requiredDirs = ['src', 'tests'];
  for (const dir of requiredDirs) {
    const exists = await fs.pathExists(path.join(servicePath, dir));
    results.push({
      category,
      check: `Directory '${dir}/' exists`,
      passed: exists,
      message: exists ? 'Found' : `Missing required directory: ${dir}/`,
    });
  }

  // Recommended directories
  const recommendedDirs = ['slos', 'dashboards', 'policies'];
  for (const dir of recommendedDirs) {
    const exists = await fs.pathExists(path.join(servicePath, dir));
    results.push({
      category,
      check: `Directory '${dir}/' exists`,
      passed: exists,
      message: exists ? 'Found' : `Recommended directory missing: ${dir}/`,
    });
  }

  // Required files
  const requiredFiles = ['package.json', 'tsconfig.json', 'README.md'];
  for (const file of requiredFiles) {
    const exists = await fs.pathExists(path.join(servicePath, file));
    results.push({
      category,
      check: `File '${file}' exists`,
      passed: exists,
      message: exists ? 'Found' : `Missing required file: ${file}`,
    });
  }

  return results;
}

async function validateConfiguration(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'Configuration';

  // Check package.json
  const packageJsonPath = path.join(servicePath, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);

      // Required scripts
      const requiredScripts = ['build', 'test', 'lint', 'dev'];
      for (const script of requiredScripts) {
        const hasScript = packageJson.scripts?.[script];
        results.push({
          category,
          check: `Script '${script}' defined`,
          passed: !!hasScript,
          message: hasScript ? 'Found' : `Missing required script: ${script}`,
        });
      }

      // CompanyOS metadata
      const hasMetadata = packageJson.companyos?.team;
      results.push({
        category,
        check: 'CompanyOS metadata present',
        passed: !!hasMetadata,
        message: hasMetadata
          ? `Team: ${packageJson.companyos.team}`
          : 'Missing companyos.team in package.json',
      });
    } catch {
      results.push({
        category,
        check: 'package.json valid',
        passed: false,
        message: 'Invalid JSON in package.json',
      });
    }
  }

  // Check tsconfig.json
  const tsconfigPath = path.join(servicePath, 'tsconfig.json');
  if (await fs.pathExists(tsconfigPath)) {
    try {
      const tsconfig = await fs.readJson(tsconfigPath);
      const extendsBase = tsconfig.extends?.includes('tsconfig.base.json');
      results.push({
        category,
        check: 'tsconfig extends base',
        passed: !!extendsBase,
        message: extendsBase
          ? 'Extends tsconfig.base.json'
          : 'Should extend tsconfig.base.json',
      });
    } catch {
      results.push({
        category,
        check: 'tsconfig.json valid',
        passed: false,
        message: 'Invalid JSON in tsconfig.json',
      });
    }
  }

  return results;
}

async function validateHealthEndpoints(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'Health Endpoints';

  // Look for health route implementation
  const healthRoutePatterns = [
    path.join(servicePath, 'src/routes/health.ts'),
    path.join(servicePath, 'src/health.ts'),
    path.join(servicePath, 'src/routes/health.js'),
  ];

  let foundHealthRoute = false;
  for (const pattern of healthRoutePatterns) {
    if (await fs.pathExists(pattern)) {
      foundHealthRoute = true;

      const content = await fs.readFile(pattern, 'utf-8');

      // Check for standard endpoints
      const endpoints = ['/health', '/health/ready', '/health/live'];
      for (const endpoint of endpoints) {
        const hasEndpoint = content.includes(endpoint);
        results.push({
          category,
          check: `Endpoint '${endpoint}' implemented`,
          passed: hasEndpoint,
          message: hasEndpoint ? 'Found' : `Missing health endpoint: ${endpoint}`,
        });
      }
      break;
    }
  }

  if (!foundHealthRoute) {
    results.push({
      category,
      check: 'Health route file exists',
      passed: false,
      message: 'No health route file found (expected src/routes/health.ts)',
    });
  }

  return results;
}

async function validateObservability(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'Observability';

  // Check for metrics implementation
  const metricsPatterns = [
    path.join(servicePath, 'src/metrics.ts'),
    path.join(servicePath, 'src/observability/metrics.ts'),
  ];

  let foundMetrics = false;
  for (const pattern of metricsPatterns) {
    if (await fs.pathExists(pattern)) {
      foundMetrics = true;
      const content = await fs.readFile(pattern, 'utf-8');

      // Check for required metrics
      const requiredMetrics = ['http_requests_total', 'http_request_duration'];
      for (const metric of requiredMetrics) {
        const hasMetric = content.includes(metric);
        results.push({
          category,
          check: `Metric '${metric}' defined`,
          passed: hasMetric,
          message: hasMetric ? 'Found' : `Missing required metric: ${metric}`,
        });
      }
      break;
    }
  }

  if (!foundMetrics) {
    results.push({
      category,
      check: 'Metrics file exists',
      passed: false,
      message: 'No metrics file found (expected src/metrics.ts)',
    });
  }

  // Check for SLO definitions
  const sloPath = path.join(servicePath, 'slos/slos.yaml');
  const hasSlos = await fs.pathExists(sloPath);
  results.push({
    category,
    check: 'SLO definitions exist',
    passed: hasSlos,
    message: hasSlos ? 'Found slos/slos.yaml' : 'Missing SLO definitions (slos/slos.yaml)',
  });

  // Check for Grafana dashboard
  const dashboardPath = path.join(servicePath, 'dashboards/grafana.json');
  const hasDashboard = await fs.pathExists(dashboardPath);
  results.push({
    category,
    check: 'Grafana dashboard exists',
    passed: hasDashboard,
    message: hasDashboard
      ? 'Found dashboards/grafana.json'
      : 'Missing Grafana dashboard (dashboards/grafana.json)',
  });

  return results;
}

async function validateSecurity(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'Security';

  // Check for OPA policy
  const policyPath = path.join(servicePath, 'policies/authz.rego');
  const hasPolicy = await fs.pathExists(policyPath);
  results.push({
    category,
    check: 'OPA policy exists',
    passed: hasPolicy,
    message: hasPolicy
      ? 'Found policies/authz.rego'
      : 'Missing OPA policy (policies/authz.rego)',
  });

  // Check Dockerfile for security best practices
  const dockerfilePath = path.join(servicePath, 'Dockerfile');
  if (await fs.pathExists(dockerfilePath)) {
    const dockerfile = await fs.readFile(dockerfilePath, 'utf-8');

    const runsAsNonRoot = dockerfile.includes('USER node') || dockerfile.includes('USER 1000');
    results.push({
      category,
      check: 'Dockerfile uses non-root user',
      passed: runsAsNonRoot,
      message: runsAsNonRoot ? 'Runs as non-root' : 'Should run as non-root user',
    });

    const hasHealthcheck = dockerfile.includes('HEALTHCHECK');
    results.push({
      category,
      check: 'Dockerfile has HEALTHCHECK',
      passed: hasHealthcheck,
      message: hasHealthcheck ? 'Has HEALTHCHECK instruction' : 'Missing HEALTHCHECK instruction',
    });
  } else {
    results.push({
      category,
      check: 'Dockerfile exists',
      passed: false,
      message: 'Missing Dockerfile',
    });
  }

  // Check for .env.example (not .env which should be gitignored)
  const envExamplePath = path.join(servicePath, '.env.example');
  const hasEnvExample = await fs.pathExists(envExamplePath);
  results.push({
    category,
    check: '.env.example exists',
    passed: hasEnvExample,
    message: hasEnvExample
      ? 'Environment template found'
      : 'Missing .env.example template',
  });

  return results;
}

async function validateCiCd(servicePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const category = 'CI/CD';

  // Check for CI workflow
  const ciWorkflowPatterns = [
    path.join(servicePath, '.github/workflows/ci.yml'),
    path.join(servicePath, '.github/workflows/ci.yaml'),
  ];

  let foundCi = false;
  for (const pattern of ciWorkflowPatterns) {
    if (await fs.pathExists(pattern)) {
      foundCi = true;
      const content = await fs.readFile(pattern, 'utf-8');

      // Check if it uses reusable workflows
      const usesReusable = content.includes('_golden-path-pipeline.yml');
      results.push({
        category,
        check: 'Uses Golden Path pipeline',
        passed: usesReusable,
        message: usesReusable
          ? 'Uses reusable workflow'
          : 'Should use _golden-path-pipeline.yml',
      });
      break;
    }
  }

  if (!foundCi) {
    results.push({
      category,
      check: 'CI workflow exists',
      passed: false,
      message: 'Missing CI workflow (.github/workflows/ci.yml)',
    });
  }

  return results;
}

function printResults(results: ValidationResult[]): void {
  const categories = [...new Set(results.map((r) => r.category))];

  for (const category of categories) {
    console.log(chalk.cyan(`\n${category}:`));
    const categoryResults = results.filter((r) => r.category === category);

    for (const result of categoryResults) {
      const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
      const status = result.passed ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`  ${icon} ${result.check} - ${status}`);
      if (!result.passed) {
        console.log(chalk.gray(`    ${result.message}`));
      }
    }
  }
}
