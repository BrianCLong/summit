#!/usr/bin/env node

/**
 * Log Query Tool
 *
 * CLI tool for querying logs from Loki
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import dayjs from 'dayjs';

const program = new Command();

interface QueryOptions {
  lokiUrl: string;
  service?: string;
  level?: string;
  correlationId?: string;
  traceId?: string;
  userId?: string;
  since?: string;
  limit?: number;
  follow?: boolean;
  format?: 'json' | 'text';
}

/**
 * Build LogQL query from options
 */
function buildQuery(options: QueryOptions): string {
  const labels: string[] = [];

  if (options.service) {
    labels.push(`service="${options.service}"`);
  }

  if (options.level) {
    labels.push(`level="${options.level}"`);
  }

  const labelSelector = labels.length > 0 ? `{${labels.join(',')}}` : '{}';

  const filters: string[] = [];

  if (options.correlationId) {
    filters.push(`| json | correlationId="${options.correlationId}"`);
  }

  if (options.traceId) {
    filters.push(`| json | traceId="${options.traceId}"`);
  }

  if (options.userId) {
    filters.push(`| json | userId="${options.userId}"`);
  }

  return `${labelSelector} ${filters.join(' ')}`;
}

/**
 * Query logs from Loki
 */
async function queryLogs(options: QueryOptions): Promise<void> {
  const query = buildQuery(options);
  const since = options.since || '1h';
  const limit = options.limit || 100;

  console.log(chalk.blue(`Querying Loki: ${options.lokiUrl}`));
  console.log(chalk.gray(`Query: ${query}`));
  console.log(chalk.gray(`Since: ${since}, Limit: ${limit}\n`));

  try {
    const response = await axios.get(`${options.lokiUrl}/loki/api/v1/query_range`, {
      params: {
        query,
        limit,
        start: dayjs().subtract(parseDuration(since), 'millisecond').unix() * 1000000000,
        end: dayjs().unix() * 1000000000,
      },
    });

    const data = response.data;

    if (!data.data || !data.data.result || data.data.result.length === 0) {
      console.log(chalk.yellow('No logs found'));
      return;
    }

    const streams = data.data.result;
    let totalLogs = 0;

    for (const stream of streams) {
      const labels = stream.stream;
      const values = stream.values;

      for (const [timestamp, log] of values) {
        totalLogs++;

        if (options.format === 'json') {
          console.log(JSON.stringify({ timestamp, labels, log }, null, 2));
        } else {
          // Parse timestamp
          const ts = dayjs(parseInt(timestamp) / 1000000);
          const formattedTime = ts.format('YYYY-MM-DD HH:mm:ss.SSS');

          // Try to parse log as JSON
          try {
            const logData = JSON.parse(log);
            const level = logData.level || 'info';
            const levelColor =
              level === 'error'
                ? chalk.red
                : level === 'warn'
                ? chalk.yellow
                : level === 'debug'
                ? chalk.gray
                : chalk.green;

            console.log(
              chalk.gray(formattedTime),
              levelColor(`[${level.toUpperCase()}]`),
              chalk.cyan(logData.service || labels.service || 'unknown'),
              logData.message
            );

            // Show additional context
            if (logData.correlationId) {
              console.log(chalk.gray(`  ↳ Correlation ID: ${logData.correlationId}`));
            }
            if (logData.traceId) {
              console.log(chalk.gray(`  ↳ Trace ID: ${logData.traceId}`));
            }
            if (logData.error) {
              console.log(chalk.red(`  ↳ Error: ${logData.error}`));
            }
            if (logData.duration) {
              console.log(chalk.gray(`  ↳ Duration: ${logData.duration}ms`));
            }
          } catch {
            // Plain text log
            console.log(chalk.gray(formattedTime), log);
          }
        }
      }
    }

    console.log(chalk.gray(`\n${totalLogs} log entries found`));
  } catch (error: any) {
    console.error(chalk.red('Error querying Loki:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response:'), error.response.data);
    }
    process.exit(1);
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
  .name('log-query')
  .description('Query logs from Loki')
  .option('-u, --loki-url <url>', 'Loki URL', process.env.LOKI_URL || 'http://localhost:3100')
  .option('-s, --service <name>', 'Filter by service name')
  .option('-l, --level <level>', 'Filter by log level (error, warn, info, debug)')
  .option('-c, --correlation-id <id>', 'Filter by correlation ID')
  .option('-t, --trace-id <id>', 'Filter by trace ID')
  .option('--user-id <id>', 'Filter by user ID')
  .option('--since <duration>', 'Time range (e.g., 1h, 30m, 7d)', '1h')
  .option('--limit <number>', 'Maximum number of logs', '100')
  .option('-f, --follow', 'Follow logs (tail mode)', false)
  .option('--format <format>', 'Output format (json, text)', 'text')
  .action(async (options) => {
    await queryLogs(options as QueryOptions);
  });

program.parse();
