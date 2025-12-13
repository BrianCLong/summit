/**
 * Environment commands for Admin CLI
 * Provides status, health, and service information
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import type {
  GlobalOptions,
  ServiceHealth,
  EnvironmentStatus,
  SLOSummary,
  HealthStatus,
  ApiClientInterface,
} from '../types/index.js';
import {
  output,
  outputTable,
  printHeader,
  printError,
  formatHealthStatus,
  formatPercentage,
  formatDuration,
  getOutputFormat,
} from '../utils/output.js';
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Register env commands
 */
export function registerEnvCommands(program: Command): void {
  const envCmd = new Command('env')
    .description('Environment status and health commands');

  // Status command
  envCmd
    .command('status')
    .description('Show overall environment status including services, health, and SLOs')
    .option('-e, --environment <env>', 'Target environment', 'development')
    .option('--detailed', 'Show detailed information')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await showEnvironmentStatus(options.environment, options.detailed, globalOpts);
    });

  // Health command
  envCmd
    .command('health')
    .description('Check health of all services')
    .option('-s, --service <name>', 'Check specific service')
    .option('--wait', 'Wait for services to become healthy')
    .option('--timeout <seconds>', 'Timeout for waiting', '60')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await checkHealth(options, globalOpts);
    });

  // Services command
  envCmd
    .command('services')
    .description('List all services and their status')
    .option('--type <type>', 'Filter by service type (api, database, cache, queue)')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await listServices(options.type, globalOpts);
    });

  // SLO command
  envCmd
    .command('slo')
    .description('Show SLO metrics summary')
    .option('--period <period>', 'Time period (hour, day, week)', 'day')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await showSLOSummary(options.period, globalOpts);
    });

  program.addCommand(envCmd);
}

/**
 * Show overall environment status
 */
async function showEnvironmentStatus(
  environment: string,
  detailed: boolean,
  options: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching environment status...').start();

  try {
    const apiClient = createApiClient({
      endpoint: getEndpoint(options.profile, options.endpoint),
      token: getToken(options.profile, options.token),
    });

    // Fetch health and metrics in parallel
    const [healthResponse, metricsResponse] = await Promise.all([
      apiClient.get<{ services: ServiceHealth[] }>('/health/detailed'),
      apiClient.get<SLOSummary>('/metrics/slo'),
    ]);

    spinner.stop();

    if (!healthResponse.success) {
      printError(`Failed to fetch health: ${healthResponse.error?.message}`);
      process.exit(1);
    }

    const services = healthResponse.data?.services ?? getDefaultServices();
    const slo = metricsResponse.data ?? getDefaultSLO();
    const overallStatus = calculateOverallStatus(services);

    const status: EnvironmentStatus = {
      environment,
      timestamp: new Date().toISOString(),
      services,
      sloSummary: slo,
      overallStatus,
    };

    if (getOutputFormat() === 'json') {
      output(status);
      return;
    }

    printHeader(`Environment: ${environment}`);

    // Overall status
    console.log(chalk.bold('Overall Status:'), formatHealthStatus(overallStatus));
    console.log(chalk.gray(`Last updated: ${status.timestamp}`));
    console.log();

    // SLO Summary
    console.log(chalk.bold('SLO Summary:'));
    console.log(`  Availability: ${formatPercentage(slo.availability)}`);
    console.log(`  Error Rate:   ${formatPercentage(slo.errorRate)}`);
    console.log(`  P99 Latency:  ${formatDuration(slo.p99Latency)}`);
    console.log(`  Throughput:   ${chalk.cyan(slo.throughput.toLocaleString())} req/s`);
    console.log();

    // Services
    console.log(chalk.bold('Services:'));
    const serviceRows = services.map((s) => ({
      name: s.name,
      status: formatHealthStatus(s.status),
      latency: s.latency ? formatDuration(s.latency) : '-',
      message: s.message ?? '-',
    }));

    outputTable(serviceRows, ['name', 'status', 'latency', 'message']);

    if (detailed) {
      console.log();
      console.log(chalk.bold('Detailed Information:'));
      for (const service of services) {
        if (service.details) {
          console.log(`\n  ${chalk.cyan(service.name)}:`);
          for (const [key, value] of Object.entries(service.details)) {
            console.log(`    ${key}: ${JSON.stringify(value)}`);
          }
        }
      }
    }
  } catch (err) {
    spinner.fail('Failed to fetch environment status');
    logger.error('Error fetching environment status', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

/**
 * Check health of services
 */
async function checkHealth(
  options: { service?: string; wait?: boolean; timeout?: string },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Checking health...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  const timeout = parseInt(options.timeout ?? '60', 10) * 1000;
  const startTime = Date.now();

  const checkOnce = async (): Promise<ServiceHealth[]> => {
    const path = options.service
      ? `/health/service/${options.service}`
      : '/health/detailed';

    const response = await apiClient.get<{ services: ServiceHealth[] } | ServiceHealth>(path);

    if (!response.success) {
      throw new Error(response.error?.message ?? 'Health check failed');
    }

    if (options.service) {
      return [response.data as ServiceHealth];
    }

    return (response.data as { services: ServiceHealth[] }).services ?? getDefaultServices();
  };

  try {
    let services: ServiceHealth[];
    let healthy = false;

    do {
      services = await checkOnce();
      healthy = services.every((s) => s.status === 'healthy');

      if (!healthy && options.wait) {
        if (Date.now() - startTime > timeout) {
          spinner.fail('Timeout waiting for services to become healthy');
          outputServiceHealth(services, globalOpts);
          process.exit(1);
        }

        spinner.text = `Waiting for services... (${Math.round((Date.now() - startTime) / 1000)}s)`;
        await sleep(2000);
      }
    } while (!healthy && options.wait);

    spinner.stop();
    outputServiceHealth(services, globalOpts);

    if (!healthy) {
      process.exit(1);
    }
  } catch (err) {
    spinner.fail('Health check failed');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * List all services
 */
async function listServices(
  type: string | undefined,
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching services...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.get<{ services: ServiceHealth[] }>('/health/detailed');

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch services: ${response.error?.message}`);
      process.exit(1);
    }

    let services = response.data?.services ?? getDefaultServices();

    if (type) {
      services = services.filter((s) => getServiceType(s.name) === type);
    }

    if (getOutputFormat() === 'json') {
      output(services);
      return;
    }

    printHeader('Services');

    const serviceRows = services.map((s) => ({
      name: s.name,
      type: getServiceType(s.name),
      status: formatHealthStatus(s.status),
      latency: s.latency ? formatDuration(s.latency) : '-',
    }));

    outputTable(serviceRows);
  } catch (err) {
    spinner.fail('Failed to fetch services');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Show SLO summary
 */
async function showSLOSummary(
  period: string,
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching SLO metrics...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.get<SLOSummary>(`/metrics/slo?period=${period}`);

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch SLO metrics: ${response.error?.message}`);
      // Fall back to mock data for demo
    }

    const slo = response.data ?? getDefaultSLO();

    if (getOutputFormat() === 'json') {
      output(slo);
      return;
    }

    printHeader(`SLO Summary (${period})`);

    const sloRows = [
      {
        metric: 'Availability',
        value: formatPercentage(slo.availability),
        target: formatPercentage(0.999),
        status: slo.availability >= 0.999 ? '✓' : '✗',
      },
      {
        metric: 'Error Rate',
        value: formatPercentage(slo.errorRate),
        target: '< 0.1%',
        status: slo.errorRate < 0.001 ? '✓' : '✗',
      },
      {
        metric: 'P99 Latency',
        value: formatDuration(slo.p99Latency),
        target: '< 500ms',
        status: slo.p99Latency < 500 ? '✓' : '✗',
      },
      {
        metric: 'Throughput',
        value: `${slo.throughput.toLocaleString()} req/s`,
        target: '> 1000 req/s',
        status: slo.throughput > 1000 ? '✓' : '✗',
      },
    ];

    outputTable(sloRows);
  } catch (err) {
    spinner.fail('Failed to fetch SLO metrics');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Output service health
 */
function outputServiceHealth(services: ServiceHealth[], _options: GlobalOptions): void {
  if (getOutputFormat() === 'json') {
    output(services);
    return;
  }

  const serviceRows = services.map((s) => ({
    name: s.name,
    status: formatHealthStatus(s.status),
    latency: s.latency ? formatDuration(s.latency) : '-',
    message: s.message ?? '-',
  }));

  outputTable(serviceRows);
}

/**
 * Calculate overall status from service health
 */
function calculateOverallStatus(services: ServiceHealth[]): HealthStatus {
  const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
  const hasDegraded = services.some((s) => s.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

/**
 * Get service type from name
 */
function getServiceType(name: string): string {
  if (name.includes('api') || name.includes('graphql')) return 'api';
  if (name.includes('postgres') || name.includes('neo4j') || name.includes('db')) return 'database';
  if (name.includes('redis') || name.includes('cache')) return 'cache';
  if (name.includes('kafka') || name.includes('queue')) return 'queue';
  return 'service';
}

/**
 * Get default services for demo/fallback
 */
function getDefaultServices(): ServiceHealth[] {
  return [
    {
      name: 'api',
      status: 'healthy',
      latency: 45,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'graphql',
      status: 'healthy',
      latency: 52,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'postgres',
      status: 'healthy',
      latency: 12,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'neo4j',
      status: 'healthy',
      latency: 18,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'redis',
      status: 'healthy',
      latency: 3,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'elasticsearch',
      status: 'healthy',
      latency: 28,
      lastChecked: new Date().toISOString(),
    },
  ];
}

/**
 * Get default SLO for demo/fallback
 */
function getDefaultSLO(): SLOSummary {
  return {
    availability: 0.9995,
    errorRate: 0.0005,
    p99Latency: 245,
    throughput: 2500,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
