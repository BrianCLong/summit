import Bull from 'bull';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import {
  NotificationJob,
  NotificationTemplate,
  NotificationPreference,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  DigestNotification
} from './types';
import { NotificationChannelManager, ChannelConfig } from './channels';
import { nanoid } from 'nanoid';

export interface NotificationStore {
  saveJob(job: NotificationJob): Promise<void>;
  getJob(id: string): Promise<NotificationJob | null>;
  updateJobStatus(id: string, status: NotificationStatus, error?: string): Promise<void>;

  getTemplate(id: string): Promise<NotificationTemplate | null>;
  getTemplateByType(type: string): Promise<NotificationTemplate | null>;

  getUserPreferences(userId: string, workspaceId: string): Promise<NotificationPreference | null>;
  updateUserPreferences(userId: string, workspaceId: string, prefs: Partial<NotificationPreference>): Promise<void>;

  getPendingDigestNotifications(userId: string): Promise<NotificationJob[]>;
  markAsDigested(jobIds: string[]): Promise<void>;
}

export class NotificationService extends EventEmitter {
  private queue: Bull.Queue;
  private channelManager: NotificationChannelManager;
  private digestScheduler?: NodeJS.Timeout;

  constructor(
    private store: NotificationStore,
    private channelConfig: ChannelConfig,
    redisUrl: string = 'redis://localhost:6379'
  ) {
    super();

    // Initialize Redis queue
    const redis = new Redis(redisUrl);
    this.queue = new Bull('notifications', {
      redis: redisUrl,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });

    // Initialize channel manager
    this.channelManager = new NotificationChannelManager(channelConfig);

    // Setup queue processors
    this.setupQueueProcessors();

    // Setup digest scheduler
    this.setupDigestScheduler();
  }

  private setupQueueProcessors() {
    // Process notifications by priority
    this.queue.process('urgent', 10, async (job) => {
      return this.processNotification(job.data);
    });

    this.queue.process('high', 5, async (job) => {
      return this.processNotification(job.data);
    });

    this.queue.process('normal', 3, async (job) => {
      return this.processNotification(job.data);
    });

    this.queue.process('low', 1, async (job) => {
      return this.processNotification(job.data);
    });

    // Process digest notifications
    this.queue.process('digest', async (job) => {
      return this.processDigest(job.data);
    });

    // Event handlers
    this.queue.on('completed', (job) => {
      this.emit('notification:sent', { jobId: job.id, data: job.data });
    });

    this.queue.on('failed', (job, err) => {
      this.emit('notification:failed', { jobId: job?.id, error: err.message });
    });
  }

  private setupDigestScheduler() {
    // Check for digest notifications every hour
    this.digestScheduler = setInterval(() => {
      this.processPendingDigests().catch(console.error);
    }, 60 * 60 * 1000);
  }

  async send(
    userId: string,
    workspaceId: string,
    templateType: string,
    data: Record<string, any>,
    options?: {
      priority?: NotificationPriority;
      scheduledFor?: Date;
      channels?: NotificationChannel[];
    }
  ): Promise<NotificationJob> {
    // Get template
    const template = await this.store.getTemplateByType(templateType);
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }

    // Get user preferences
    const preferences = await this.store.getUserPreferences(userId, workspaceId);

    // Determine channels based on preferences
    let channels = options?.channels || template.channels;
    if (preferences?.types[templateType]) {
      const typePrefs = preferences.types[templateType];
      if (!typePrefs.enabled) {
        // User has disabled this notification type
        channels = [NotificationChannel.IN_APP]; // Always send in-app
      } else if (typePrefs.channels.length > 0) {
        // User has custom channel preferences
        channels = typePrefs.channels;
      }
    }

    // Check quiet hours
    if (preferences?.quietHours?.enabled) {
      const now = new Date();
      const isQuietHours = this.isInQuietHours(now, preferences.quietHours);
      if (isQuietHours && options?.priority !== NotificationPriority.URGENT) {
        // Queue for digest instead
        channels = [NotificationChannel.IN_APP];
      }
    }

    // Create notification job
    const job: NotificationJob = {
      id: nanoid(),
      userId,
      workspaceId,
      templateId: template.id,
      channels,
      priority: options?.priority || NotificationPriority.NORMAL,
      data,
      status: NotificationStatus.PENDING,
      scheduledFor: options?.scheduledFor,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    };

    // Save to store
    await this.store.saveJob(job);

    // Queue for processing
    await this.queue.add(
      job.priority,
      job,
      {
        priority: this.getPriorityValue(job.priority),
        delay: options?.scheduledFor
          ? options.scheduledFor.getTime() - Date.now()
          : 0
      }
    );

    this.emit('notification:queued', { job });

    return job;
  }

  private async processNotification(job: NotificationJob): Promise<void> {
    try {
      // Update status
      await this.store.updateJobStatus(job.id, NotificationStatus.QUEUED);

      // Get template
      const template = await this.store.getTemplate(job.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Get user info (would fetch from user service)
      const userEmail = job.data.userEmail || 'user@example.com';
      const slackUserId = job.data.slackUserId;

      // Send through channels
      const results = await this.channelManager.send(
        job,
        template,
        userEmail,
        slackUserId
      );

      // Check if any delivery succeeded
      const hasSuccess = results.some(r => r.success);

      if (hasSuccess) {
        await this.store.updateJobStatus(job.id, NotificationStatus.SENT);
      } else {
        const errors = results.map(r => r.error).filter(Boolean).join(', ');
        await this.store.updateJobStatus(job.id, NotificationStatus.FAILED, errors);
        throw new Error(`All delivery channels failed: ${errors}`);
      }
    } catch (error: any) {
      await this.store.updateJobStatus(job.id, NotificationStatus.FAILED, error.message);
      throw error;
    }
  }

  private async processDigest(digest: DigestNotification): Promise<void> {
    // Group notifications by type
    const grouped = new Map<string, NotificationJob[]>();
    for (const notification of digest.notifications) {
      const type = notification.templateId;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(notification);
    }

    // Generate digest content
    const digestContent = {
      userId: digest.userId,
      workspaceId: digest.workspaceId,
      period: digest.period,
      summary: {
        total: digest.notifications.length,
        byType: Array.from(grouped.entries()).map(([type, items]) => ({
          type,
          count: items.length
        }))
      },
      notifications: digest.notifications.map(n => ({
        type: n.templateId,
        data: n.data,
        timestamp: n.createdAt
      }))
    };

    // Send digest email
    const template = await this.store.getTemplateByType('digest');
    if (template?.emailTemplate) {
      const userEmail = digest.notifications[0]?.data.userEmail || 'user@example.com';
      await this.channelManager.sendEmail(
        userEmail,
        `Your ${digest.period} digest - ${digest.notifications.length} notifications`,
        template.emailTemplate,
        digestContent
      );
    }

    // Mark notifications as digested
    await this.store.markAsDigested(digest.notifications.map(n => n.id));
  }

  private async processPendingDigests(): Promise<void> {
    // This would be called periodically to generate digests
    // Implementation would fetch users with digest preferences
    // and generate digest notifications for them
  }

  async batchSend(
    notifications: Array<{
      userId: string;
      workspaceId: string;
      templateType: string;
      data: Record<string, any>;
    }>
  ): Promise<NotificationJob[]> {
    const jobs: NotificationJob[] = [];

    for (const notification of notifications) {
      const job = await this.send(
        notification.userId,
        notification.workspaceId,
        notification.templateType,
        notification.data
      );
      jobs.push(job);
    }

    return jobs;
  }

  async cancel(jobId: string): Promise<void> {
    const bullJob = await this.queue.getJob(jobId);
    if (bullJob) {
      await bullJob.remove();
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  private isInQuietHours(
    now: Date,
    quietHours: NonNullable<NotificationPreference['quietHours']>
  ): boolean {
    if (!quietHours.start || !quietHours.end) return false;

    // Simple time comparison (would need proper timezone handling in production)
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const nowTime = nowHours * 60 + nowMinutes;

    const [startHours, startMinutes] = quietHours.start.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;

    const [endHours, endMinutes] = quietHours.end.split(':').map(Number);
    const endTime = endHours * 60 + endMinutes;

    if (startTime < endTime) {
      return nowTime >= startTime && nowTime < endTime;
    } else {
      // Crosses midnight
      return nowTime >= startTime || nowTime < endTime;
    }
  }

  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 1;
      case NotificationPriority.HIGH:
        return 2;
      case NotificationPriority.NORMAL:
        return 3;
      case NotificationPriority.LOW:
        return 4;
      default:
        return 3;
    }
  }

  async shutdown(): Promise<void> {
    if (this.digestScheduler) {
      clearInterval(this.digestScheduler);
    }
    await this.queue.close();
  }
}
