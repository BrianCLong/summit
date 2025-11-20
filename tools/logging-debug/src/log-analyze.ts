#!/usr/bin/env node

/**
 * Log Analyzer Tool
 *
 * Analyzes log patterns, errors, and performance metrics
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import dayjs from 'dayjs';

const program = new Command();

interface AnalyzeOptions {
  lokiUrl: string;
  service?: string;
  since?: string;
}

interface LogStats {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  topErrors: Array<{ message: string; count: number }>;
  topServices: Array<{ service: string; count: number }>;
  avgDuration?: number;
  p95Duration?: number;
  p99Duration?: number;
  slowestOperations: Array<{ operation: string; duration: number }>;
  correlationIdCoverage: number;
}

/**
 * Analyze logs
 */
async function analyzeLogs(options: AnalyzeOptions): Promise<void> {
  console.log(chalk.blue('📊 Analyzing logs...\n'));

  const since = options.since || '1h';
  const startTime = dayjs().subtract(parseDuration(since), 'millisecond');

  const stats: LogStats = {
    totalLogs: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    debugCount: 0,
    topErrors: [],
    topServices: [],
    slowestOperations: [],
    correlationIdCoverage: 0,
  };

  try {
    // Query all logs
    const query = options.service ? `{service="${options.service}"}` : '{}';

    const response = await axios.get(`${options.lokiUrl}/loki/api/v1/query_range`, {
      params: {
        query,
        limit: 5000,
        start: startTime.unix() * 1000000000,
        end: dayjs().unix() * 1000000000,
      },
    });

    const streams = response.data.data?.result || [];

    const errorMap = new Map<string, number>();
    const serviceMap = new Map<string, number>();
    const durations: number[] = [];
    let logsWithCorrelation = 0;

    for (const stream of streams) {
      for (const [, log] of stream.values) {
        stats.totalLogs++;

        try {
          const logData = JSON.parse(log);

          // Count by level
          const level = logData.level || 'info';
          if (level === 'error') stats.errorCount++;
          else if (level === 'warn') stats.warnCount++;
          else if (level === 'info') stats.infoCount++;
          else if (level === 'debug') stats.debugCount++;

          // Count services
          const service = logData.service || 'unknown';
          serviceMap.set(service, (serviceMap.get(service) || 0) + 1);

          // Track errors
          if (level === 'error' && logData.message) {
            errorMap.set(logData.message, (errorMap.get(logData.message) || 0) + 1);
          }

          // Track correlation coverage
          if (logData.correlationId) {
            logsWithCorrelation++;
          }

          // Track durations
          if (logData.duration && typeof logData.duration === 'number') {
            durations.push(logData.duration);

            // Track slow operations
            if (logData.duration > 1000) {
              stats.slowestOperations.push({
                operation: logData.operation || logData.message,
                duration: logData.duration,
              });
            }
          }
        } catch {
          // Plain text log, skip analysis
        }
      }
    }

    // Calculate percentiles
    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      stats.avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      stats.p95Duration = durations[Math.floor(durations.length * 0.95)];
      stats.p99Duration = durations[Math.floor(durations.length * 0.99)];
    }

    // Top errors
    stats.topErrors = Array.from(errorMap.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top services
    stats.topServices = Array.from(serviceMap.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort slowest operations
    stats.slowestOperations = stats.slowestOperations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Correlation coverage
    stats.correlationIdCoverage =
      stats.totalLogs > 0 ? (logsWithCorrelation / stats.totalLogs) * 100 : 0;

    // Display results
    displayStats(stats);
  } catch (error: any) {
    console.error(chalk.red('Error analyzing logs:'), error.message);
    process.exit(1);
  }
}

/**
 * Display statistics
 */
function displayStats(stats: LogStats): void {
  console.log(chalk.bold('📋 Log Summary'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Total Logs: ${chalk.cyan(stats.totalLogs.toLocaleString())}`);
  console.log(
    `Errors: ${chalk.red(stats.errorCount)} (${((stats.errorCount / stats.totalLogs) * 100).toFixed(1)}%)`
  );
  console.log(
    `Warnings: ${chalk.yellow(stats.warnCount)} (${((stats.warnCount / stats.totalLogs) * 100).toFixed(1)}%)`
  );
  console.log(
    `Info: ${chalk.green(stats.infoCount)} (${((stats.infoCount / stats.totalLogs) * 100).toFixed(1)}%)`
  );
  console.log(
    `Debug: ${chalk.gray(stats.debugCount)} (${((stats.debugCount / stats.totalLogs) * 100).toFixed(1)}%)`
  );
  console.log(
    `Correlation ID Coverage: ${chalk.cyan(stats.correlationIdCoverage.toFixed(1))}%\n`
  );

  if (stats.avgDuration !== undefined) {
    console.log(chalk.bold('⏱️  Performance Metrics'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Average Duration: ${chalk.cyan(stats.avgDuration.toFixed(2))}ms`);
    console.log(`P95 Duration: ${chalk.yellow(stats.p95Duration?.toFixed(2))}ms`);
    console.log(`P99 Duration: ${chalk.red(stats.p99Duration?.toFixed(2))}ms\n`);
  }

  if (stats.topServices.length > 0) {
    console.log(chalk.bold('🔝 Top Services'));
    console.log(chalk.gray('─'.repeat(50)));
    for (const { service, count } of stats.topServices) {
      const percentage = ((count / stats.totalLogs) * 100).toFixed(1);
      console.log(`${chalk.cyan(service.padEnd(30))} ${count.toLocaleString()} (${percentage}%)`);
    }
    console.log();
  }

  if (stats.topErrors.length > 0) {
    console.log(chalk.bold('❌ Top Errors'));
    console.log(chalk.gray('─'.repeat(50)));
    for (const { message, count } of stats.topErrors) {
      console.log(chalk.red(`${count}x`), message.substring(0, 100));
    }
    console.log();
  }

  if (stats.slowestOperations.length > 0) {
    console.log(chalk.bold('🐌 Slowest Operations'));
    console.log(chalk.gray('─'.repeat(50)));
    for (const { operation, duration } of stats.slowestOperations) {
      console.log(
        chalk.yellow(`${duration.toFixed(0)}ms`),
        operation.substring(0, 100)
      );
    }
    console.log();
  }
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

// CLI setup
program
  .name('log-analyze')
  .description('Analyze log patterns and metrics')
  .option('-u, --loki-url <url>', 'Loki URL', process.env.LOKI_URL || 'http://localhost:3100')
  .option('-s, --service <name>', 'Analyze specific service')
  .option('--since <duration>', 'Time range (e.g., 1h, 30m, 7d)', '1h')
  .action(async (options) => {
    await analyzeLogs(options as AnalyzeOptions);
  });

program.parse();
