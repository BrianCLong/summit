import { z } from 'zod';
import baseLogger from '../../config/logger.js';
import { userFeedbackRepository, FeedbackStatus } from '../../db/repositories/userFeedback.js';
import { getRedisClient } from '../../db/redis.js';

const logger = baseLogger.child({ name: 'FeedbackResolver' });

const SubmitFeedbackZ = z.object({
  category: z.enum(['BUG', 'FEATURE', 'OTHER']),
  title: z.string().min(4).max(200),
  description: z.string().max(5000).optional(),
  contact: z.string().max(320).optional(),
  metadata: z.record(z.any()).optional(),
});

const FeedbackFilterZ = z
  .object({
    status: z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED']).optional(),
    category: z.enum(['BUG', 'FEATURE', 'OTHER']).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .optional();

const UpdateStatusZ = z.object({
  id: z.string().uuid(),
  status: z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED']),
});

const redis = (() => {
  try {
    return getRedisClient();
  } catch (error) {
    logger.warn('Redis unavailable for feedback notifications', { error });
    return null;
  }
})();

async function queueFeedbackNotification(feedback: any, contact?: string | null) {
  const notifyTo = process.env.FEEDBACK_NOTIFICATION_EMAIL;
  if (!notifyTo || !redis) {
    return;
  }

  try {
    const emailPayload = {
      to: [notifyTo],
      subject: `New ${feedback.category.toLowerCase()} feedback received`,
      body: `A new piece of feedback was submitted.\n\nTitle: ${feedback.title}\nCategory: ${feedback.category}\nSubmitted By: ${
        feedback.userEmail || feedback.userId || 'anonymous'
      }\nContact: ${contact || 'not provided'}\n\nDetails:\n${feedback.description || 'n/a'}\n`,
      metadata: {
        feedbackId: feedback.id,
        tenantId: feedback.tenantId,
        status: feedback.status,
      },
    };
    await redis.lpush('email_queue', JSON.stringify(emailPayload));
  } catch (error) {
    logger.warn('Failed to queue feedback notification', { error, feedbackId: feedback.id });
  }
}

function requireAdmin(ctx: any) {
  const role = ctx?.user?.role || 'VIEWER';
  if (role !== 'ADMIN') {
    throw new Error('forbidden');
  }
}

function resolveTenantId(ctx: any): string | null {
  return (
    ctx?.user?.tenantId ||
    ctx?.tenantId ||
    ctx?.req?.headers?.['x-tenant-id'] ||
    null
  );
}

export const feedbackResolvers = {
  Query: {
    async feedbackSubmissions(_parent: unknown, args: { filter?: unknown }, ctx: any) {
      requireAdmin(ctx);
      const parsedFilter = FeedbackFilterZ.parse(args.filter);
      const tenantId = resolveTenantId(ctx);

      const result = await userFeedbackRepository.listFeedback({
        ...(parsedFilter || {}),
        tenantId: tenantId || undefined,
      });

      return {
        total: result.total,
        items: result.items,
      };
    },
  },
  Mutation: {
    async submitFeedback(_parent: unknown, args: { input: unknown }, ctx: any) {
      const parsed = SubmitFeedbackZ.parse(args.input);
      const tenantId = resolveTenantId(ctx);
      const userId = ctx?.user?.id || null;
      const userEmail = ctx?.user?.email || null;

      const metadata = {
        ...(parsed.metadata || {}),
        ...(parsed.contact ? { contact: parsed.contact } : {}),
        submittedFrom: 'dashboard',
      };

      const record = await userFeedbackRepository.createFeedback({
        tenantId: tenantId || null,
        userId,
        userEmail,
        category: parsed.category,
        title: parsed.title,
        description: parsed.description,
        metadata,
      });

      await queueFeedbackNotification(record, parsed.contact);

      return record;
    },
    async updateFeedbackStatus(_parent: unknown, args: { input: unknown }, ctx: any) {
      requireAdmin(ctx);
      const parsed = UpdateStatusZ.parse(args.input);

      const updated = await userFeedbackRepository.updateStatus(parsed.id, parsed.status as FeedbackStatus);
      if (!updated) {
        throw new Error('feedback not found');
      }

      return updated;
    },
  },
};
