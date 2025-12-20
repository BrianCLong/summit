import {
  NotificationPayload,
  NotificationResult,
  NotificationChannel,
  NotificationProvider,
  UserPreferences
} from './types.js';
import { ConsoleProvider } from './providers/ConsoleProvider.js';
import { InAppProvider } from './providers/InAppProvider.js';
import { WebhookProvider } from './providers/WebhookProvider.js';
import { TemplateEngine } from './TemplateEngine.js';
import { NotificationPreferenceRepo } from './preferences/NotificationPreferenceRepo.js';
import { NotificationRepo } from './repo/NotificationRepo.js';
import { NotificationQueue } from './queue/NotificationQueue.js';
import pino from 'pino';

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

  // Used for tests mainly, or manual override
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
    // Validate or transform preferences if needed
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
    // Placeholder for digest processing logic.
    // 1. Fetch pending notifications for user that are marked for digest.
    // 2. Aggregate them.
    // 3. Send single email via send() method.
    // 4. Mark original notifications as handled/read.
    logger.info({ userId }, 'Processing digest for user');

    // Example implementation (mocked interactions)
    const prefs = await this.preferenceRepo.getPreferences(userId);
    if (!prefs || prefs.digestFrequency === 'NONE') {
        logger.info({ userId }, 'No digest preferences found or disabled');
        return;
    }

    // Logic to fetch and aggregate would go here.
    // For now, we simulate fetching unread notifications and sending a digest email.
    try {
      const unread = await this.repo.getUnread(userId);
      if (unread.length > 0) {
        const digestContent = `You have ${unread.length} unread notifications:\n` +
                              unread.map(n => `- ${n.subject || n.type}`).join('\n');

        await this.send({
          userId,
          type: 'digest',
          subject: 'Your Daily Digest',
          message: digestContent,
          channels: [NotificationChannel.EMAIL]
        });

        // Mark processed notifications as read
        await Promise.all(unread.map(n => this.repo.markAsRead(n.id, userId)));
      }
    } catch (err) {
      logger.error({ err, userId }, 'Failed to process digest');
      return false;
    }

    return true;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const { userId, channels, templateId, data } = payload;

    // Determine effective channels
    let effectiveChannels = channels || [];

    // If no channels specified, use user preferences or defaults
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
        // Default to IN_APP if no preferences found or empty
        effectiveChannels = [NotificationChannel.IN_APP];
      }
    }

    // Render message if template is provided
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
        logger.warn({ channel }, 'No provider registered for channel');
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
}
