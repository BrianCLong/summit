
// @ts-nocheck
import {
  NotificationPayload,
  NotificationResult,
  NotificationChannel,
  NotificationProvider,
  UserPreferences,
  Notification,
  NotificationPreference,
  CreateNotificationInput,
  NotificationType
} from './types.js';
import { ConsoleProvider } from './providers/ConsoleProvider.js';
import { InAppProvider } from './providers/InAppProvider.js';
import { WebhookProvider } from './providers/WebhookProvider.js';
import { TemplateEngine } from './TemplateEngine.js';
import { NotificationPreferenceRepo } from './preferences/NotificationPreferenceRepo.js';
import { NotificationRepo } from './repo/NotificationRepo.js';
import { NotificationQueue } from './queue/NotificationQueue.js';
import pino from 'pino';

// @ts-ignore
const logger = pino({ name: 'NotificationService' });

export class NotificationService {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();
  private templateEngine: TemplateEngine;
  private preferenceRepo: NotificationPreferenceRepo;
  private repo: NotificationRepo;
  private queue?: NotificationQueue;

  constructor(redisConnection?: any) {
    this.templateEngine = new TemplateEngine();
    this.preferenceRepo = new NotificationPreferenceRepo();
    this.repo = new NotificationRepo();

    if (redisConnection) {
        this.queue = new NotificationQueue(this, redisConnection);
    }

    // Initialize providers
    this.registerProvider(new ConsoleProvider(NotificationChannel.EMAIL));
    this.registerProvider(new ConsoleProvider(NotificationChannel.SMS));
    this.registerProvider(new ConsoleProvider(NotificationChannel.PUSH));
    this.registerProvider(new InAppProvider());
    this.registerProvider(new WebhookProvider());
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  setPreferenceRepo(repo: NotificationPreferenceRepo) {
    this.preferenceRepo = repo;
  }

  setNotificationRepo(repo: NotificationRepo) {
    this.repo = repo;
  }

  async getPreferences(userId: string) {
    return this.preferenceRepo.getPreferences(userId);
  }

  async savePreferences(userId: string, preferences: any) {
    return this.preferenceRepo.setPreferences(userId, { userId, ...preferences });
  }

  async sendAsync(payload: NotificationPayload) {
    if (this.queue) {
        return this.queue.add(payload);
    } else {
        logger.warn('Queue not configured, sending synchronously');
        return this.send(payload);
    }
  }

  async processDigest(userId: string) {
    // Placeholder for digest logic
    return true;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const { userId, channels, templateId, data } = payload;
    let effectiveChannels = channels || [];
    if (effectiveChannels.length === 0) {
      try {
        const prefs = await this.preferenceRepo.getPreferences(userId);
        if (prefs) {
          Object.entries(prefs.channels).forEach(([channel, enabled]) => {
            if (enabled) {
              effectiveChannels.push(channel as NotificationChannel);
            }
          });
        }
      } catch (err) {
        logger.error({ userId, err }, 'Error fetching preferences, defaulting to IN_APP');
      }

      if (effectiveChannels.length === 0) {
        effectiveChannels = [NotificationChannel.IN_APP];
      }
    }

    if (templateId) {
      const rendered = this.templateEngine.render(templateId, data || {});
      payload.message = rendered;
    }

    const results: NotificationResult[] = [];

    for (const channel of effectiveChannels) {
      const provider = this.providers.get(channel);
      if (provider) {
        try {
          const result = await provider.send(payload);
          results.push(result);
        } catch (error: any) {
          logger.error({ userId, channel, error: error.message }, 'Failed to send notification');
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      } else {
        results.push({
          channel,
          success: false,
          error: 'No provider registered',
        });
      }
    }

    return results;
  }

  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[][]> {
    return Promise.all(payloads.map(p => this.send(p)));
  }

  // --- New Methods ---

  async listNotifications(tenantId: string, userId: string, unreadOnly: boolean, cursor?: string): Promise<Notification[]> {
    return this.repo.list(tenantId, userId, unreadOnly, cursor);
  }

  async markAsReadV2(id: string, tenantId: string, userId: string): Promise<void> {
    await this.repo.markAsReadV2(id, tenantId, userId);
  }

  async getTypePreferences(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepo.getTypePreferences(tenantId, userId);
  }

  async updateTypePreference(tenantId: string, userId: string, type: string, enabled: boolean): Promise<void> {
    await this.preferenceRepo.setTypePreference(tenantId, userId, type, enabled);
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification | null> {
    // Check type preference
    const prefs = await this.preferenceRepo.getTypePreferences(input.tenantId, input.userId);
    const typePref = prefs.find(p => p.type === input.type);

    // Default enabled if no preference exists.
    if (typePref && typePref.enabled === false) {
      return null;
    }

    return this.repo.createV2(input);
  }

  async handleCommentMention(tenantId: string, authorId: string, commentContent: string, mentionedUserIds: string[], commentId: string) {
     for (const userId of mentionedUserIds) {
         if (userId === authorId) continue;

         await this.createNotification({
             tenantId,
             userId,
             type: NotificationType.MENTION,
             payload: {
                 subject: 'You were mentioned in a comment',
                 message: `${authorId} mentioned you: "${commentContent.substring(0, 50)}..."`,
                 data: { commentId, authorId },
                 targetUrl: `/comments/${commentId}`
             }
         });
     }
  }
}
