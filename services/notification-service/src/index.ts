import Fastify from 'fastify';
import cors from '@fastify/cors';
import { NotificationService } from './NotificationService';
import { InMemoryNotificationStore } from './store';
import { NotificationChannel, NotificationPriority } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3011;
const HOST = process.env.HOST || '0.0.0.0';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
  const fastify = Fastify({
    logger: true
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // Initialize store and service
  const store = new InMemoryNotificationStore();
  const notificationService = new NotificationService(
    store,
    {
      email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        },
        from: process.env.SMTP_FROM || 'noreply@intelgraph.com'
      },
      slack: process.env.SLACK_TOKEN
        ? {
            token: process.env.SLACK_TOKEN,
            defaultChannel: process.env.SLACK_DEFAULT_CHANNEL
          }
        : undefined,
      webhook: process.env.WEBHOOK_URL
        ? {
            url: process.env.WEBHOOK_URL,
            method: 'POST'
          }
        : undefined
    },
    REDIS_URL
  );

  // Routes
  fastify.post('/api/notifications/send', async (request, reply) => {
    const { userId, workspaceId, templateType, data, priority, scheduledFor, channels } =
      request.body as any;

    const job = await notificationService.send(userId, workspaceId, templateType, data, {
      priority,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      channels
    });

    return job;
  });

  fastify.post('/api/notifications/batch', async (request, reply) => {
    const { notifications } = request.body as any;

    const jobs = await notificationService.batchSend(notifications);

    return { jobs, count: jobs.length };
  });

  fastify.delete('/api/notifications/:jobId', async (request, reply) => {
    const { jobId } = request.params as any;

    await notificationService.cancel(jobId);

    return { success: true };
  });

  fastify.get('/api/notifications/stats', async (request, reply) => {
    const stats = await notificationService.getQueueStats();

    return stats;
  });

  fastify.get('/api/notifications/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as any;

    const job = await store.getJob(jobId);

    if (!job) {
      reply.code(404);
      return { error: 'Job not found' };
    }

    return job;
  });

  // User preferences
  fastify.get('/api/users/:userId/preferences', async (request, reply) => {
    const { userId } = request.params as any;
    const { workspaceId } = request.query as any;

    const preferences = await store.getUserPreferences(userId, workspaceId);

    return preferences || { channels: {}, types: {} };
  });

  fastify.put('/api/users/:userId/preferences', async (request, reply) => {
    const { userId } = request.params as any;
    const { workspaceId, ...preferences } = request.body as any;

    await store.updateUserPreferences(userId, workspaceId, preferences);

    return { success: true };
  });

  // Templates
  fastify.post('/api/templates', async (request, reply) => {
    const template = request.body as any;
    // Would save template to store
    return template;
  });

  fastify.get('/api/templates/:id', async (request, reply) => {
    const { id } = request.params as any;
    const template = await store.getTemplate(id);

    if (!template) {
      reply.code(404);
      return { error: 'Template not found' };
    }

    return template;
  });

  // Health check
  fastify.get('/health', async () => {
    const stats = await notificationService.getQueueStats();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: stats
    };
  });

  // Listen for events from notification service
  notificationService.on('notification:sent', ({ jobId, data }) => {
    fastify.log.info({ jobId, userId: data.userId }, 'Notification sent');
  });

  notificationService.on('notification:failed', ({ jobId, error }) => {
    fastify.log.error({ jobId, error }, 'Notification failed');
  });

  // Graceful shutdown
  const shutdown = async () => {
    await notificationService.shutdown();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Notification service listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
