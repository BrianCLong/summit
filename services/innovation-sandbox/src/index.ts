import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import {
  SandboxConfigSchema,
  CodeSubmissionSchema,
  MigrationConfigSchema,
  IsolationLevel,
} from './types/index.js';
import { SecureSandbox } from './sandbox/SecureSandbox.js';
import { MissionMigrator } from './migration/MissionMigrator.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('InnovationSandbox');
const app = express();
const PORT = process.env.PORT || 3100;

// In-memory sandbox registry (use Redis in production)
const sandboxes = new Map<string, SecureSandbox>();
const migrator = new MissionMigrator();

app.use(express.json({ limit: '10mb' }));

// Health endpoints
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req, res) => res.json({ ready: true }));
app.get('/health/live', (_req, res) => res.json({ live: true }));

/**
 * Create a new sandbox environment
 */
app.post('/api/v1/sandboxes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = SandboxConfigSchema.parse({
      id: randomUUID(),
      ...req.body,
    });

    const sandbox = new SecureSandbox(config);
    await sandbox.initialize();

    sandboxes.set(config.id, sandbox);

    logger.info('Sandbox created', { id: config.id, isolation: config.isolationLevel });

    res.status(201).json({
      sandboxId: config.id,
      config: sandbox.getConfig(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Execute code in a sandbox
 */
app.post('/api/v1/sandboxes/:id/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sandbox = sandboxes.get(req.params.id);
    if (!sandbox) {
      return res.status(404).json({ error: 'Sandbox not found' });
    }

    const submission = CodeSubmissionSchema.parse({
      sandboxId: req.params.id,
      ...req.body,
    });

    const result = await sandbox.execute(submission);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Get sandbox status
 */
app.get('/api/v1/sandboxes/:id', (req: Request, res: Response) => {
  const sandbox = sandboxes.get(req.params.id);
  if (!sandbox) {
    return res.status(404).json({ error: 'Sandbox not found' });
  }

  res.json(sandbox.getConfig());
});

/**
 * Terminate a sandbox
 */
app.delete('/api/v1/sandboxes/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sandbox = sandboxes.get(req.params.id);
    if (!sandbox) {
      return res.status(404).json({ error: 'Sandbox not found' });
    }

    await sandbox.terminate();
    sandboxes.delete(req.params.id);

    logger.info('Sandbox terminated', { id: req.params.id });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Initiate migration to mission platform
 */
app.post('/api/v1/sandboxes/:id/migrate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sandbox = sandboxes.get(req.params.id);
    if (!sandbox) {
      return res.status(404).json({ error: 'Sandbox not found' });
    }

    const migrationConfig = MigrationConfigSchema.parse({
      sandboxId: req.params.id,
      ...req.body,
    });

    // Get sandbox config and execution history (simplified for demo)
    const config = sandbox.getConfig();
    const fullConfig = SandboxConfigSchema.parse({
      ...config,
      ownerId: req.body.ownerId || 'system',
      tenantId: req.body.tenantId || 'default',
      quotas: {},
      allowedModules: [],
      networkAllowlist: [],
      environmentVars: {},
    });

    const status = await migrator.initiateMigration(fullConfig, [], migrationConfig);

    res.status(202).json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * Get migration status
 */
app.get('/api/v1/migrations/:id', (req: Request, res: Response) => {
  const status = migrator.getStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  res.json(status);
});

/**
 * List sandbox templates
 */
app.get('/api/v1/templates', (_req: Request, res: Response) => {
  res.json([
    {
      name: 'Standard Development',
      isolationLevel: IsolationLevel.STANDARD,
      description: 'Basic isolation for development and testing',
    },
    {
      name: 'Enhanced Security',
      isolationLevel: IsolationLevel.ENHANCED,
      description: 'Enhanced isolation with strict resource limits',
    },
    {
      name: 'Airgapped',
      isolationLevel: IsolationLevel.AIRGAPPED,
      description: 'No network access, read-only filesystem',
    },
    {
      name: 'Mission Ready',
      isolationLevel: IsolationLevel.MISSION_READY,
      description: 'Full compliance checks for mission deployment',
    },
  ]);
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Request error', { error: err.message, stack: err.stack });

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation error', details: err });
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Innovation Sandbox service listening on port ${PORT}`);
});

export { app };
