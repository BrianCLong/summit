import { Router, Request, Response } from 'express';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    latency?: number;
  }[];
}

const startTime = Date.now();
const VERSION = process.env.npm_package_version || '1.0.0';

// Health check functions
const healthChecks = {
  memory: (): { status: 'pass' | 'fail'; message: string } => {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const percentUsed = (used.heapUsed / used.heapTotal) * 100;

    if (percentUsed > 90) {
      return { status: 'fail', message: `High memory usage: ${heapUsedMB}/${heapTotalMB}MB (${percentUsed.toFixed(1)}%)` };
    }
    return { status: 'pass', message: `${heapUsedMB}/${heapTotalMB}MB (${percentUsed.toFixed(1)}%)` };
  },

  eventLoop: async (): Promise<{ status: 'pass' | 'fail'; latency: number }> => {
    const start = Date.now();
    await new Promise((resolve) => setImmediate(resolve));
    const latency = Date.now() - start;

    if (latency > 100) {
      return { status: 'fail', latency };
    }
    return { status: 'pass', latency };
  },
};

export function createHealthRouter(): Router {
  const router = Router();

  // Simple liveness probe
  router.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness probe with basic checks
  router.get('/health/ready', async (_req: Request, res: Response) => {
    const memCheck = healthChecks.memory();
    const isReady = memCheck.status === 'pass';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      checks: { memory: memCheck },
    });
  });

  // Detailed health status
  router.get('/health', async (_req: Request, res: Response) => {
    const checks: HealthStatus['checks'] = [];

    // Memory check
    const memCheck = healthChecks.memory();
    checks.push({ name: 'memory', status: memCheck.status, message: memCheck.message });

    // Event loop check
    const loopCheck = await healthChecks.eventLoop();
    checks.push({ name: 'event_loop', status: loopCheck.status, latency: loopCheck.latency });

    const allPassing = checks.every((c) => c.status === 'pass');
    const anyFailing = checks.some((c) => c.status === 'fail');

    const status: HealthStatus = {
      status: allPassing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
      service: 'citizen-service',
      version: VERSION,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      checks,
    };

    res.status(allPassing ? 200 : 503).json(status);
  });

  // Detailed health with all dependency checks
  router.get('/health/detailed', async (_req: Request, res: Response) => {
    const checks: HealthStatus['checks'] = [];

    // Memory check
    const memCheck = healthChecks.memory();
    checks.push({ name: 'memory', status: memCheck.status, message: memCheck.message });

    // Event loop check
    const loopCheck = await healthChecks.eventLoop();
    checks.push({ name: 'event_loop', status: loopCheck.status, latency: loopCheck.latency });

    // TODO: Add Neo4j, Redis, etc. checks when integrated

    const allPassing = checks.every((c) => c.status === 'pass');

    const status: HealthStatus = {
      status: allPassing ? 'healthy' : 'degraded',
      service: 'citizen-service',
      version: VERSION,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      checks,
    };

    res.status(allPassing ? 200 : 503).json(status);
  });

  return router;
}
