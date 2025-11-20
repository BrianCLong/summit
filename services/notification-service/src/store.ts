import {
  NotificationJob,
  NotificationTemplate,
  NotificationPreference,
  NotificationStatus,
  NotificationChannel
} from './types';
import { NotificationStore } from './NotificationService';

export class InMemoryNotificationStore implements NotificationStore {
  private jobs = new Map<string, NotificationJob>();
  private templates = new Map<string, NotificationTemplate>();
  private templatesByType = new Map<string, NotificationTemplate>();
  private preferences = new Map<string, NotificationPreference>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    // Task assigned template
    const taskAssigned: NotificationTemplate = {
      id: 'task-assigned',
      name: 'Task Assigned',
      type: 'task.assigned',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      subject: 'New task assigned: {{taskTitle}}',
      emailTemplate: `
        <h2>New Task Assigned</h2>
        <p>You have been assigned a new task:</p>
        <h3>{{taskTitle}}</h3>
        <p>{{taskDescription}}</p>
        <p><strong>Priority:</strong> {{priority}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><a href="{{taskUrl}}">View Task</a></p>
      `,
      slackTemplate: `
        :clipboard: *New Task Assigned*
        *{{taskTitle}}*
        {{taskDescription}}
        Priority: {{priority}} | Due: {{dueDate}}
        <{{taskUrl}}|View Task>
      `,
      inAppTemplate: 'New task assigned: {{taskTitle}}',
      variables: ['taskTitle', 'taskDescription', 'priority', 'dueDate', 'taskUrl'],
      createdAt: new Date()
    };

    // Comment mention template
    const commentMention: NotificationTemplate = {
      id: 'comment-mention',
      name: 'Comment Mention',
      type: 'comment.mention',
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      subject: '{{authorName}} mentioned you in a comment',
      emailTemplate: `
        <h2>You were mentioned in a comment</h2>
        <p><strong>{{authorName}}</strong> mentioned you:</p>
        <blockquote>{{commentText}}</blockquote>
        <p><a href="{{commentUrl}}">View Comment</a></p>
      `,
      slackTemplate: `
        :speech_balloon: *{{authorName}}* mentioned you in a comment:
        > {{commentText}}
        <{{commentUrl}}|View Comment>
      `,
      inAppTemplate: '{{authorName}} mentioned you in a comment',
      variables: ['authorName', 'commentText', 'commentUrl'],
      createdAt: new Date()
    };

    // Workspace invite template
    const workspaceInvite: NotificationTemplate = {
      id: 'workspace-invite',
      name: 'Workspace Invite',
      type: 'workspace.invite',
      channels: [NotificationChannel.EMAIL],
      subject: 'You\'ve been invited to {{workspaceName}}',
      emailTemplate: `
        <h2>Workspace Invitation</h2>
        <p>You've been invited to join <strong>{{workspaceName}}</strong> by {{inviterName}}.</p>
        <p>Role: {{role}}</p>
        <p><a href="{{inviteUrl}}">Accept Invitation</a></p>
      `,
      variables: ['workspaceName', 'inviterName', 'role', 'inviteUrl'],
      createdAt: new Date()
    };

    // Digest template
    const digest: NotificationTemplate = {
      id: 'digest',
      name: 'Digest',
      type: 'digest',
      channels: [NotificationChannel.EMAIL],
      subject: 'Your {{period}} digest - {{total}} notifications',
      emailTemplate: `
        <h2>Your {{period}} Digest</h2>
        <p>You have {{total}} notifications:</p>
        {{#each summary.byType}}
        <p><strong>{{type}}:</strong> {{count}}</p>
        {{/each}}
        <hr>
        {{#each notifications}}
        <div style="margin-bottom: 20px;">
          <p><strong>{{type}}</strong> - {{timestamp}}</p>
          <p>{{data.message}}</p>
        </div>
        {{/each}}
      `,
      variables: ['period', 'total', 'summary', 'notifications'],
      createdAt: new Date()
    };

    // Store templates
    [taskAssigned, commentMention, workspaceInvite, digest].forEach(template => {
      this.templates.set(template.id, template);
      this.templatesByType.set(template.type, template);
    });
  }

  async saveJob(job: NotificationJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async getJob(id: string): Promise<NotificationJob | null> {
    return this.jobs.get(id) || null;
  }

  async updateJobStatus(
    id: string,
    status: NotificationStatus,
    error?: string
  ): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = status;
      if (error) {
        job.error = error;
      }
      if (status === NotificationStatus.SENT) {
        job.sentAt = new Date();
      } else if (status === NotificationStatus.FAILED) {
        job.failedAt = new Date();
        job.retryCount++;
      } else if (status === NotificationStatus.DELIVERED) {
        job.deliveredAt = new Date();
      }
      this.jobs.set(id, job);
    }
  }

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplateByType(type: string): Promise<NotificationTemplate | null> {
    return this.templatesByType.get(type) || null;
  }

  async getUserPreferences(
    userId: string,
    workspaceId: string
  ): Promise<NotificationPreference | null> {
    const key = `${userId}:${workspaceId}`;
    return this.preferences.get(key) || null;
  }

  async updateUserPreferences(
    userId: string,
    workspaceId: string,
    prefs: Partial<NotificationPreference>
  ): Promise<void> {
    const key = `${userId}:${workspaceId}`;
    const existing = this.preferences.get(key) || {
      userId,
      workspaceId,
      channels: {},
      types: {}
    };

    this.preferences.set(key, { ...existing, ...prefs });
  }

  async getPendingDigestNotifications(userId: string): Promise<NotificationJob[]> {
    return Array.from(this.jobs.values()).filter(
      job =>
        job.userId === userId &&
        job.status === NotificationStatus.SENT &&
        !job.metadata?.digested
    );
  }

  async markAsDigested(jobIds: string[]): Promise<void> {
    for (const id of jobIds) {
      const job = this.jobs.get(id);
      if (job) {
        job.metadata = { ...job.metadata, digested: true };
        this.jobs.set(id, job);
      }
    }
  }
}
