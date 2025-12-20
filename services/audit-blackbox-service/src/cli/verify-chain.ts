#!/usr/bin/env node
import { Pool } from 'pg';
import { IntegrityVerifier } from '../verification/integrity-verifier.js';
import { DEFAULT_CONFIG, type BlackBoxServiceConfig } from '../core/types.js';

interface CliOptions {
  from?: Date;
  to?: Date;
  startSequence?: bigint;
  endSequence?: bigint;
  json?: boolean;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--from':
        options.from = new Date(argv[++i]);
        break;
      case '--to':
        options.to = new Date(argv[++i]);
        break;
      case '--start-seq':
        options.startSequence = BigInt(argv[++i]);
        break;
      case '--end-seq':
        options.endSequence = BigInt(argv[++i]);
        break;
      case '--json':
        options.json = true;
        break;
      default:
        break;
    }
  }

  return options;
}

function buildConfig(): BlackBoxServiceConfig {
  return {
    ...DEFAULT_CONFIG,
    postgres: {
      ...DEFAULT_CONFIG.postgres,
      host: process.env.POSTGRES_HOST || DEFAULT_CONFIG.postgres.host,
      port: parseInt(process.env.POSTGRES_PORT || `${DEFAULT_CONFIG.postgres.port}`, 10),
      database:
        process.env.POSTGRES_DATABASE || DEFAULT_CONFIG.postgres.database,
      user: process.env.POSTGRES_USER || DEFAULT_CONFIG.postgres.user,
      password: process.env.POSTGRES_PASSWORD || DEFAULT_CONFIG.postgres.password,
      ssl: DEFAULT_CONFIG.postgres.ssl,
    },
    signingKey: process.env.AUDIT_SIGNING_KEY || DEFAULT_CONFIG.signingKey,
    publicKeyId: process.env.AUDIT_PUBLIC_KEY_ID || DEFAULT_CONFIG.publicKeyId,
    logLevel: (process.env.LOG_LEVEL as BlackBoxServiceConfig['logLevel'])
      || DEFAULT_CONFIG.logLevel,
    apiHost: DEFAULT_CONFIG.apiHost,
    apiPort: DEFAULT_CONFIG.apiPort,
    maxBufferSize: DEFAULT_CONFIG.maxBufferSize,
    flushIntervalMs: DEFAULT_CONFIG.flushIntervalMs,
    batchSize: DEFAULT_CONFIG.batchSize,
    merkleCheckpointInterval: DEFAULT_CONFIG.merkleCheckpointInterval,
  } as BlackBoxServiceConfig;
}

async function run(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const config = buildConfig();
  const pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    ssl: config.postgres.ssl,
    max: config.postgres.poolSize || 10,
  });

  const verifier = new IntegrityVerifier(pool, config);

  try {
    const report = await verifier.verify({
      startTime: options.from,
      endTime: options.to,
      startSequence: options.startSequence,
      endSequence: options.endSequence,
    });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(
        `Audit chain valid: ${report.valid}. Events=${report.summary.totalEvents}, issues=${report.issues.length}`,
      );
    }

    if (!report.valid) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Verification failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
