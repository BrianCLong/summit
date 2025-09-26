import {
  dispatchNotification,
  getUnreadCount,
  listPreferencesForUser,
  mapNotification,
  updatePreference,
} from '../../services/NotificationDispatcher';
import {
  listNotifications,
  markNotificationRead as markNotificationReadRepo,
} from '../../db/repositories/notifications';
import { notificationChannel, notificationPubSub } from '../../notifications/pubsub';

function requireUserId(ctx: any): string {
  const id = ctx?.user?.id || ctx?.user?.sub || ctx?.req?.user?.id || ctx?.req?.user?.sub;
  if (!id) {
    throw new Error('User context is required for notifications');
  }
  return id;
}

const notificationResolvers = {
  Query: {
    async notificationPreferences(_: unknown, __: unknown, ctx: any) {
      const userId = requireUserId(ctx);
      return listPreferencesForUser(userId);
    },
    async notifications(_: unknown, args: { limit?: number; onlyUnread?: boolean }, ctx: any) {
      const userId = requireUserId(ctx);
      const records = await listNotifications(userId, args || {});
      return records.map(mapNotification);
    },
    async unreadNotificationCount(_: unknown, __: unknown, ctx: any) {
      const userId = requireUserId(ctx);
      return getUnreadCount(userId);
    },
  },
  Mutation: {
    async updateNotificationPreference(
      _: unknown,
      args: { input: { eventType: string; channels: { inApp: boolean; email: boolean; sms: boolean }; email?: string; phoneNumber?: string } },
      ctx: any,
    ) {
      const userId = requireUserId(ctx);
      return updatePreference(
        userId,
        args.input.eventType,
        args.input.channels,
        { email: args.input.email, phoneNumber: args.input.phoneNumber },
      );
    },
    async markNotificationRead(_: unknown, args: { id: string }, ctx: any) {
      const userId = requireUserId(ctx);
      const record = await markNotificationReadRepo(userId, args.id);
      if (!record) {
        throw new Error('Notification not found');
      }
      return mapNotification(record);
    },
    async notifyIngestionComplete(
      _: unknown,
      args: { ingestionId: string; message: string; title?: string | null; metadata?: any },
      ctx: any,
    ) {
      const userId = requireUserId(ctx);
      const record = await dispatchNotification({
        userId,
        eventType: 'INGESTION_COMPLETE',
        title: args.title || 'Ingestion Complete',
        message: args.message,
        severity: 'success',
        metadata: { ...args.metadata, ingestionId: args.ingestionId },
      });
      if (!record) {
        throw new Error('Failed to dispatch ingestion completion notification');
      }
      return mapNotification(record);
    },
    async notifyMlJobStatus(
      _: unknown,
      args: { jobId: string; status: string; message: string; metadata?: any },
      ctx: any,
    ) {
      const userId = requireUserId(ctx);
      const severity = args.status === 'failed' ? 'error' : args.status === 'completed' ? 'success' : 'info';
      const record = await dispatchNotification({
        userId,
        eventType: 'ML_JOB_STATUS',
        title: `ML job ${args.status}`,
        message: args.message,
        severity: severity as any,
        metadata: { ...args.metadata, jobId: args.jobId, status: args.status },
      });
      if (!record) {
        throw new Error('Failed to dispatch ML job status notification');
      }
      return mapNotification(record);
    },
  },
  Subscription: {
    notificationUpdates: {
      subscribe: async (_: unknown, __: unknown, ctx: any) => {
        const userId = requireUserId(ctx);
        return notificationPubSub.asyncIterator([notificationChannel(userId)]);
      },
    },
  },
};

export default notificationResolvers;
