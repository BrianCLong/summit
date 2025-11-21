import { NotificationProvider, NotificationChannel, NotificationPayload, NotificationResult } from '../types.js';
import { getIO } from '../../realtime/socket.js';
import { NotificationRepo } from '../repo/NotificationRepo.js';
import pino from 'pino';

const logger = pino({ name: 'InAppProvider' });

export class InAppProvider implements NotificationProvider {
  channel = NotificationChannel.IN_APP;
  private repo: NotificationRepo;

  constructor() {
    this.repo = new NotificationRepo();
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const { userId, subject, message, data, templateId, type, priority } = payload;
    const io = getIO();
    const content = message || `Template: ${templateId}`;

    let notificationId = `inapp-${Date.now()}`;

    // Persist notification
    try {
      const record = await this.repo.create({
        ...payload,
        message: content,
      });
      notificationId = record.id;
    } catch (err) {
      logger.error({ err, userId }, 'Failed to persist in-app notification');
      // Continue to emit event even if persistence fails?
      // Maybe, but reliability is key. Let's assume we want best effort.
    }

    if (io) {
      io.of('/realtime').to(`user:${userId}`).emit('notification', {
        id: notificationId,
        type,
        priority,
        subject,
        content,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      });
      logger.info({ userId, type }, 'In-app notification emitted');
    } else {
      logger.warn('Socket.IO instance not available, notification persisted but not emitted realtime');
    }

    return {
      channel: this.channel,
      success: true,
      messageId: notificationId,
    };
  }
}
