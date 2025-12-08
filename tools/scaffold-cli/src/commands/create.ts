import { Command } from 'commander';
import { prompt } from 'enquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import { z } from 'zod';
import { getTemplateDir, getOutputDir } from '../utils/paths.js';

const ServiceTypes = [
  'api-service',
  'worker',
  'batch-job',
  'data-service',
  'frontend',
  'library',
] as const;

type ServiceType = (typeof ServiceTypes)[number];

const CreateOptionsSchema = z.object({
  name: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  type: z.enum(ServiceTypes),
  description: z.string().optional(),
  team: z.string().optional(),
  tier: z.number().min(1).max(3).default(2),
  port: z.number().min(1).max(65535).default(8080),
});

type CreateOptions = z.infer<typeof CreateOptionsSchema>;

interface TemplateContext {
  SERVICE_NAME: string;
  SERVICE_TITLE: string;
  PACKAGE_NAME: string;
  DESCRIPTION: string;
  TEAM: string;
  TIER: number;
  PORT: number;
  AUTHOR: string;
  YEAR: number;
}

export const createCommand = new Command('create')
  .description('Create a new service from a Golden Path template')
  .argument('[type]', 'Service type (api-service, worker, batch-job, data-service, frontend, library)')
  .option('-n, --name <name>', 'Service name (kebab-case)')
  .option('-d, --description <description>', 'Service description')
  .option('-t, --team <team>', 'Owning team')
  .option('--tier <tier>', 'Service tier (1-3)', '2')
  .option('-p, --port <port>', 'HTTP port (API services)', '8080')
  .option('--dry-run', 'Preview without creating files')
  .action(async (type: string | undefined, options: Record<string, string>) => {
    try {
      const config = await gatherOptions(type, options);
      await createService(config, options['dryRun'] === true);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

async function gatherOptions(
  type: string | undefined,
  cliOptions: Record<string, string>
): Promise<CreateOptions> {
  const answers: Record<string, unknown> = { ...cliOptions };

  // Interactive prompts for missing options
  if (!type) {
    const response = await prompt<{ type: ServiceType }>({
      type: 'select',
      name: 'type',
      message: 'Select service type:',
      choices: ServiceTypes.map((t) => ({ name: t, value: t })),
    });
    answers['type'] = response.type;
  } else {
    answers['type'] = type;
  }

  if (!answers['name']) {
    const response = await prompt<{ name: string }>({
      type: 'input',
      name: 'name',
      message: 'Service name (kebab-case):',
      validate: (value: string) =>
        /^[a-z][a-z0-9-]*$/.test(value) || 'Must be kebab-case starting with a letter',
    });
    answers['name'] = response.name;
  }

  if (!answers['description']) {
    const response = await prompt<{ description: string }>({
      type: 'input',
      name: 'description',
      message: 'Description:',
      initial: `${answers['name']} service`,
    });
    answers['description'] = response.description;
  }

  if (!answers['team']) {
    const response = await prompt<{ team: string }>({
      type: 'input',
      name: 'team',
      message: 'Owning team:',
      initial: 'platform',
    });
    answers['team'] = response.team;
  }

  return CreateOptionsSchema.parse({
    ...answers,
    tier: parseInt(answers['tier'] as string, 10) || 2,
    port: parseInt(answers['port'] as string, 10) || 8080,
  });
}

async function createService(options: CreateOptions, dryRun: boolean): Promise<void> {
  const spinner = ora('Creating service...').start();

  const context = buildTemplateContext(options);
  const templateDir = getTemplateDir(options.type);
  const outputDir = getOutputDir(options.type, options.name);

  if (dryRun) {
    spinner.info('Dry run - files would be created:');
    await previewFiles(templateDir, outputDir, context);
    return;
  }

  // Check if output directory exists
  if (await fs.pathExists(outputDir)) {
    spinner.fail(`Directory already exists: ${outputDir}`);
    process.exit(1);
  }

  // Create output directory
  await fs.ensureDir(outputDir);

  // Copy and process template files
  spinner.text = 'Processing templates...';
  await processTemplateDirectory(templateDir, outputDir, context);

  // Generate additional files based on type
  spinner.text = 'Generating configuration files...';
  await generateConfigFiles(outputDir, options, context);

  spinner.succeed(chalk.green(`Created ${options.name} in ${outputDir}`));

  // Print next steps
  printNextSteps(options, outputDir);
}

function buildTemplateContext(options: CreateOptions): TemplateContext {
  const serviceName = options.name;
  const serviceTitle = serviceName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    SERVICE_NAME: serviceName,
    SERVICE_TITLE: serviceTitle,
    PACKAGE_NAME: `@companyos/${serviceName}`,
    DESCRIPTION: options.description || `${serviceTitle} service`,
    TEAM: options.team || 'platform',
    TIER: options.tier,
    PORT: options.port,
    AUTHOR: options.team ? `${options.team}@company.com` : 'platform@company.com',
    YEAR: new Date().getFullYear(),
  };
}

async function processTemplateDirectory(
  templateDir: string,
  outputDir: string,
  context: TemplateContext
): Promise<void> {
  if (!(await fs.pathExists(templateDir))) {
    // Use default template structure if specific template doesn't exist
    await generateDefaultStructure(outputDir, context);
    return;
  }

  const files = await fs.readdir(templateDir, { recursive: true });

  for (const file of files) {
    const sourcePath = path.join(templateDir, file.toString());
    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) continue;

    // Process filename (replace template variables)
    const processedFilename = Handlebars.compile(file.toString())(context);
    const targetPath = path.join(outputDir, processedFilename);

    await fs.ensureDir(path.dirname(targetPath));

    // Process file content
    const content = await fs.readFile(sourcePath, 'utf-8');
    const processedContent = Handlebars.compile(content)(context);

    await fs.writeFile(targetPath, processedContent);
  }
}

async function generateDefaultStructure(
  outputDir: string,
  context: TemplateContext
): Promise<void> {
  // Generate standard directory structure
  const dirs = ['src', 'src/routes', 'src/middleware', 'tests', 'tests/unit', 'slos', 'dashboards', 'policies'];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(outputDir, dir));
  }
}

async function generateConfigFiles(
  outputDir: string,
  options: CreateOptions,
  context: TemplateContext
): Promise<void> {
  // Generate package.json
  const packageJson = generatePackageJson(context, options);
  await fs.writeJson(path.join(outputDir, 'package.json'), packageJson, { spaces: 2 });

  // Generate tsconfig.json
  const tsconfig = generateTsConfig();
  await fs.writeJson(path.join(outputDir, 'tsconfig.json'), tsconfig, { spaces: 2 });

  // Generate .eslintrc.json
  const eslintrc = generateEslintConfig();
  await fs.writeJson(path.join(outputDir, '.eslintrc.json'), eslintrc, { spaces: 2 });

  // Generate jest.config.js
  const jestConfig = generateJestConfig(options);
  await fs.writeFile(path.join(outputDir, 'jest.config.js'), jestConfig);

  // Generate source files
  await generateSourceFiles(outputDir, context, options);

  // Generate SLO file
  await generateSloFile(outputDir, context, options);

  // Generate Dockerfile
  await generateDockerfile(outputDir, context, options);

  // Generate .env.example
  await generateEnvExample(outputDir, context, options);

  // Generate README
  await generateReadme(outputDir, context, options);

  // Generate CI workflow
  await generateCiWorkflow(outputDir, context);

  // Generate OPA policy
  await generateOpaPolicy(outputDir, context);
}

function generatePackageJson(context: TemplateContext, options: CreateOptions): object {
  return {
    name: context.PACKAGE_NAME,
    version: '1.0.0',
    description: context.DESCRIPTION,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc -b',
      start: 'node dist/index.js',
      test: 'jest',
      'test:unit': 'jest --testPathPattern=unit',
      'test:integration': 'jest --testPathPattern=integration',
      'test:coverage': 'jest --coverage',
      lint: 'eslint src tests --ext .ts',
      'lint:fix': 'eslint src tests --ext .ts --fix',
      typecheck: 'tsc --noEmit',
      clean: 'rm -rf dist',
      'docker:build': `docker build -t ${context.SERVICE_NAME}:latest .`,
      'docker:run': `docker run -p ${options.port}:${options.port} ${context.SERVICE_NAME}:latest`,
    },
    dependencies: {
      express: '^4.18.0',
      helmet: '^7.1.0',
      cors: '^2.8.5',
      pino: '^8.17.0',
      'pino-http': '^9.0.0',
      'prom-client': '^15.1.0',
      zod: '^3.22.4',
      dotenv: '^16.3.1',
    },
    devDependencies: {
      '@types/express': '^4.17.21',
      '@types/cors': '^2.8.17',
      '@types/node': '^20.10.0',
      '@types/jest': '^29.5.0',
      jest: '^29.7.0',
      'ts-jest': '^29.1.0',
      supertest: '^6.3.3',
      '@types/supertest': '^6.0.2',
      tsx: '^4.7.0',
      typescript: '^5.3.3',
      eslint: '^9.0.0',
    },
    companyos: {
      team: context.TEAM,
      tier: options.tier,
      oncall: `${context.TEAM}-oncall@company.com`,
    },
    author: context.AUTHOR,
    license: 'UNLICENSED',
    private: true,
  };
}

function generateTsConfig(): object {
  return {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: 'dist',
      rootDir: 'src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };
}

function generateEslintConfig(): object {
  return {
    extends: ['../../.eslintrc.cjs'],
    parserOptions: {
      project: './tsconfig.json',
    },
    rules: {},
  };
}

function generateJestConfig(options: CreateOptions): string {
  const coverageThreshold = options.tier === 1 ? 90 : options.tier === 2 ? 80 : 70;

  return `/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: ${coverageThreshold - 5},
      functions: ${coverageThreshold},
      lines: ${coverageThreshold},
      statements: ${coverageThreshold},
    },
  },
  testMatch: ['**/tests/**/*.test.ts'],
};
`;
}

async function generateSourceFiles(
  outputDir: string,
  context: TemplateContext,
  options: CreateOptions
): Promise<void> {
  // index.ts
  const indexTs = `import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, '${context.SERVICE_TITLE} started');
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
`;
  await fs.writeFile(path.join(outputDir, 'src/index.ts'), indexTs);

  // app.ts
  const appTs = `import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { healthRouter } from './routes/health.js';
import { metricsMiddleware, metricsRouter } from './metrics.js';
import { logger } from './logger.js';
import { config } from './config.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.NODE_ENV === 'production' ? config.ALLOWED_ORIGINS : '*',
  }));

  // Logging middleware
  app.use(pinoHttp({ logger }));

  // Metrics middleware
  app.use(metricsMiddleware);

  // Body parsing
  app.use(express.json());

  // Routes
  app.use('/', healthRouter);
  app.use('/metrics', metricsRouter);

  // TODO: Add your routes here

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, path: req.path }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
`;
  await fs.writeFile(path.join(outputDir, 'src/app.ts'), appTs);

  // config.ts
  const configTs = `import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(${options.port}),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')).default(''),
  OTEL_SERVICE_NAME: z.string().default('${context.SERVICE_NAME}'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);
`;
  await fs.writeFile(path.join(outputDir, 'src/config.ts'), configTs);

  // logger.ts
  const loggerTs = `import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  name: '${context.SERVICE_NAME}',
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
`;
  await fs.writeFile(path.join(outputDir, 'src/logger.ts'), loggerTs);

  // metrics.ts
  const metricsTs = `import { Router, Request, Response, NextFunction } from 'express';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

export const registry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry });

// HTTP request metrics
export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [registry],
});

// Middleware to track metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip metrics endpoint
  if (req.path === '/metrics') {
    return next();
  }

  httpRequestsInFlight.inc();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    httpRequestsInFlight.dec();
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode.toString(),
    };

    httpRequestTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
}

// Metrics endpoint router
export const metricsRouter = Router();

metricsRouter.get('/', async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
`;
  await fs.writeFile(path.join(outputDir, 'src/metrics.ts'), metricsTs);

  // routes/health.ts
  const healthTs = `import { Router, Request, Response } from 'express';

export const healthRouter = Router();

// Basic health check
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: '${context.SERVICE_NAME}',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Readiness check - verifies dependencies
healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = {};

  // TODO: Add dependency checks (database, redis, etc.)
  // Example:
  // try {
  //   await db.query('SELECT 1');
  //   checks.database = true;
  // } catch {
  //   checks.database = false;
  // }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Liveness check - basic process health
healthRouter.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
`;
  await fs.writeFile(path.join(outputDir, 'src/routes/health.ts'), healthTs);

  // tests/unit/app.test.ts
  const appTestTs = `import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('${context.SERVICE_TITLE}', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('${context.SERVICE_NAME}');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.text).toContain('http_requests_total');
    });
  });
});
`;
  await fs.writeFile(path.join(outputDir, 'tests/unit/app.test.ts'), appTestTs);
}

async function generateSloFile(
  outputDir: string,
  context: TemplateContext,
  options: CreateOptions
): Promise<void> {
  const objective = options.tier === 1 ? 99.95 : options.tier === 2 ? 99.9 : 99.5;

  const sloYaml = `# SLO definitions for ${context.SERVICE_NAME}
# See: https://sloth.dev/

apiVersion: sloth.slok.dev/v1
kind: PrometheusServiceLevel
metadata:
  name: ${context.SERVICE_NAME}-slos
  labels:
    team: ${context.TEAM}
    tier: "${options.tier}"
spec:
  service: "${context.SERVICE_NAME}"
  labels:
    team: ${context.TEAM}

  slos:
    # Availability SLO
    - name: "availability"
      objective: ${objective}
      description: "${context.SERVICE_TITLE} HTTP availability"
      sli:
        events:
          errorQuery: |
            sum(rate(http_requests_total{service="${context.SERVICE_NAME}",status=~"5.."}[{{.window}}]))
          totalQuery: |
            sum(rate(http_requests_total{service="${context.SERVICE_NAME}"}[{{.window}}]))
      alerting:
        name: "${context.SERVICE_NAME}HighErrorRate"
        labels:
          team: ${context.TEAM}
          severity: critical
        annotations:
          summary: "High error rate for ${context.SERVICE_NAME}"
          runbook: "https://docs.company.com/runbooks/${context.SERVICE_NAME}"
        pageAlert:
          labels:
            severity: critical
        ticketAlert:
          labels:
            severity: warning

    # Latency SLO (p99 < 500ms)
    - name: "latency-p99"
      objective: 99.0
      description: "${context.SERVICE_TITLE} p99 latency under 500ms"
      sli:
        events:
          errorQuery: |
            sum(rate(http_request_duration_seconds_bucket{service="${context.SERVICE_NAME}",le="0.5"}[{{.window}}]))
          totalQuery: |
            sum(rate(http_request_duration_seconds_count{service="${context.SERVICE_NAME}"}[{{.window}}]))
      alerting:
        name: "${context.SERVICE_NAME}HighLatency"
        labels:
          team: ${context.TEAM}
        annotations:
          summary: "High latency for ${context.SERVICE_NAME}"
`;
  await fs.writeFile(path.join(outputDir, 'slos/slos.yaml'), sloYaml);
}

async function generateDockerfile(
  outputDir: string,
  context: TemplateContext,
  _options: CreateOptions
): Promise<void> {
  const dockerfile = `# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Security: run as non-root user
USER node

# Expose port
EXPOSE ${context.PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${context.PORT}/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
`;
  await fs.writeFile(path.join(outputDir, 'Dockerfile'), dockerfile);
}

async function generateEnvExample(
  outputDir: string,
  context: TemplateContext,
  options: CreateOptions
): Promise<void> {
  const envExample = `# ${context.SERVICE_TITLE} Environment Configuration
# Copy this file to .env and update values as needed

# Environment
NODE_ENV=development

# Server
PORT=${options.port}
LOG_LEVEL=info

# CORS (comma-separated origins for production)
ALLOWED_ORIGINS=http://localhost:3000

# OpenTelemetry
OTEL_SERVICE_NAME=${context.SERVICE_NAME}
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Add service-specific configuration below
# DATABASE_URL=postgres://user:pass@localhost:5432/db
# REDIS_URL=redis://localhost:6379
`;
  await fs.writeFile(path.join(outputDir, '.env.example'), envExample);
}

async function generateReadme(
  outputDir: string,
  context: TemplateContext,
  options: CreateOptions
): Promise<void> {
  const readme = `# ${context.SERVICE_TITLE}

${context.DESCRIPTION}

## Quick Start

\`\`\`bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
\`\`\`

## Service Information

| Attribute | Value |
|-----------|-------|
| **Team** | ${context.TEAM} |
| **Tier** | ${options.tier} |
| **Port** | ${options.port} |
| **On-call** | ${context.TEAM}-oncall@company.com |

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/health\` | GET | Basic health check |
| \`/health/ready\` | GET | Readiness check (with dependencies) |
| \`/health/live\` | GET | Liveness check |
| \`/metrics\` | GET | Prometheus metrics |

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for containerized development)

### Running Locally

\`\`\`bash
# Copy environment template
cp .env.example .env

# Start development server with hot reload
pnpm dev
\`\`\`

### Testing

\`\`\`bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test -- --watch
\`\`\`

### Docker

\`\`\`bash
# Build image
pnpm docker:build

# Run container
pnpm docker:run
\`\`\`

## Observability

### Metrics

This service exports Prometheus metrics at \`/metrics\`:

- \`http_requests_total\` - Total HTTP requests (counter)
- \`http_request_duration_seconds\` - Request duration (histogram)
- \`http_requests_in_flight\` - In-flight requests (gauge)

### SLOs

See \`slos/slos.yaml\` for SLO definitions:

- **Availability**: ${options.tier === 1 ? '99.95%' : options.tier === 2 ? '99.9%' : '99.5%'}
- **Latency (p99)**: < 500ms

### Dashboard

Import \`dashboards/grafana.json\` into Grafana for service visualization.

## Related Documentation

- [Platform Blueprint](../../../docs/golden-path-platform/PLATFORM_BLUEPRINT.md)
- [CI/CD Pipeline](../../../docs/golden-path-platform/CICD_PIPELINE.md)
- [Onboarding Checklist](../../../docs/golden-path-platform/ONBOARDING_CHECKLIST.md)
`;
  await fs.writeFile(path.join(outputDir, 'README.md'), readme);
}

async function generateCiWorkflow(outputDir: string, context: TemplateContext): Promise<void> {
  const ciYaml = `name: ${context.SERVICE_TITLE} CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'services/${context.SERVICE_NAME}/**'
      - '.github/workflows/${context.SERVICE_NAME}-ci.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'services/${context.SERVICE_NAME}/**'

jobs:
  pipeline:
    uses: ./.github/workflows/_golden-path-pipeline.yml
    with:
      service: ${context.SERVICE_NAME}
      working-directory: services/${context.SERVICE_NAME}
    secrets: inherit
`;

  await fs.ensureDir(path.join(outputDir, '.github/workflows'));
  await fs.writeFile(path.join(outputDir, '.github/workflows/ci.yml'), ciYaml);
}

async function generateOpaPolicy(outputDir: string, context: TemplateContext): Promise<void> {
  const policy = `# Authorization policy for ${context.SERVICE_NAME}
package ${context.SERVICE_NAME.replace(/-/g, '_')}.authz

default allow = false

# Health endpoints are public
allow {
  input.path == "/health"
}

allow {
  input.path == "/health/ready"
}

allow {
  input.path == "/health/live"
}

# Metrics endpoint is internal only
allow {
  input.path == "/metrics"
  input.source.internal == true
}

# All other endpoints require valid JWT
allow {
  input.jwt.valid == true
  input.jwt.exp > time.now_ns() / 1000000000
}

# Role-based access example
# Uncomment and modify as needed:
# allow {
#   input.jwt.valid == true
#   input.jwt.roles[_] == "admin"
#   input.method == "DELETE"
# }
`;
  await fs.writeFile(path.join(outputDir, 'policies/authz.rego'), policy);
}

async function previewFiles(
  templateDir: string,
  outputDir: string,
  context: TemplateContext
): Promise<void> {
  console.log(chalk.cyan('\nFiles that would be created:\n'));

  const files = [
    'package.json',
    'tsconfig.json',
    'jest.config.js',
    '.eslintrc.json',
    'Dockerfile',
    '.env.example',
    'README.md',
    'src/index.ts',
    'src/app.ts',
    'src/config.ts',
    'src/logger.ts',
    'src/metrics.ts',
    'src/routes/health.ts',
    'tests/unit/app.test.ts',
    'slos/slos.yaml',
    'policies/authz.rego',
    '.github/workflows/ci.yml',
  ];

  for (const file of files) {
    console.log(chalk.gray(`  ${outputDir}/${file}`));
  }

  console.log(chalk.cyan(`\nTemplate context:`));
  console.log(chalk.gray(JSON.stringify(context, null, 2)));
}

function printNextSteps(options: CreateOptions, outputDir: string): void {
  console.log(chalk.cyan('\nNext steps:\n'));
  console.log(chalk.white(`  1. cd ${outputDir}`));
  console.log(chalk.white('  2. Review .env.example and create .env'));
  console.log(chalk.white("  3. Run 'pnpm install' to install dependencies"));
  console.log(chalk.white("  4. Run 'pnpm dev' to start development server"));
  console.log(chalk.white('  5. Update README.md with service-specific documentation'));
  console.log(chalk.white("  6. Run 'pnpm test' to verify test setup\n"));

  console.log(chalk.cyan('Documentation:'));
  console.log(chalk.gray('  - Platform Blueprint: docs/golden-path-platform/PLATFORM_BLUEPRINT.md'));
  console.log(chalk.gray('  - CI/CD Pipeline: docs/golden-path-platform/CICD_PIPELINE.md'));
  console.log(chalk.gray('  - Onboarding Checklist: docs/golden-path-platform/ONBOARDING_CHECKLIST.md\n'));
}
