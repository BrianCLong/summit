import baseLogger from '../config/logger';

const logger = baseLogger.child({ name: 'temporal' });

export async function startTemporalWorker() {
  if (process.env.TEMPORAL_ENABLED !== 'true') {
    logger.info('Temporal disabled');
    return { stop: async () => {} };
  }
  try {
    // Lazy import to avoid hard dependency when disabled
    const temporal = await import('temporalio/worker');
    const { activities } = await import('./lib/activities.js');
    const { default: workflowsPath } = await import('./lib/workflows-path.js');

    const worker = await temporal.Worker.create({
      workflowsPath,
      activities,
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'maestro-core',
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      connection: await (
        await import('temporalio')
      ).Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      }),
    });
    logger.info('Temporal worker created');
    const runPromise = worker.run();
    return {
      stop: async () => {
        try {
          await worker.shutdown();
        } catch {}
        try {
          await runPromise;
        } catch {}
      },
    };
  } catch (e: any) {
    logger.warn(
      { err: e?.message || String(e) },
      'Temporal not available; continuing without it',
    );
    return { stop: async () => {} };
  }
}

export async function getTemporalClient() {
  if (process.env.TEMPORAL_ENABLED !== 'true') return null;
  try {
    const { Connection, Client } = await import('temporalio');
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });
    return new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });
  } catch (e) {
    logger.warn('Temporal client not available');
    return null;
  }
}
