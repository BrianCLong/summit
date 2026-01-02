/**
 * Notification System - Multi-channel alerts
 *
 * Supports Slack, Discord, Email, and webhook notifications
 */

import { RunMetrics } from './metrics.js';
import { State } from './types.js';

export interface NotificationConfig {
  enabled: boolean;
  channels: {
    slack?: SlackConfig;
    discord?: DiscordConfig;
    email?: EmailConfig;
    webhook?: WebhookConfig;
  };
  triggers: {
    onRunComplete: boolean;
    onRunFailure: boolean;
    onHighFailureRate: boolean;
    onPRCreated: boolean;
    onMilestone: boolean;
  };
  thresholds: {
    failureRateWarning: number; // 0-100
    processedMilestone: number; // every N issues
  };
}

interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  from: string;
  to: string[];
}

interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
}

/**
 * Send notification to configured channels
 */
export async function sendNotification(
  type: 'run_complete' | 'run_failure' | 'high_failure_rate' | 'pr_created' | 'milestone',
  data: any,
  config: NotificationConfig
): Promise<void> {
  if (!config.enabled) return;

  // Check if this trigger is enabled
  const triggerMap = {
    run_complete: config.triggers.onRunComplete,
    run_failure: config.triggers.onRunFailure,
    high_failure_rate: config.triggers.onHighFailureRate,
    pr_created: config.triggers.onPRCreated,
    milestone: config.triggers.onMilestone,
  };

  if (!triggerMap[type]) return;

  const message = formatMessage(type, data);

  // Send to all enabled channels
  const promises: Promise<void>[] = [];

  if (config.channels.slack) {
    promises.push(sendSlackNotification(message, config.channels.slack));
  }

  if (config.channels.discord) {
    promises.push(sendDiscordNotification(message, config.channels.discord));
  }

  if (config.channels.email) {
    promises.push(sendEmailNotification(message, config.channels.email));
  }

  if (config.channels.webhook) {
    promises.push(sendWebhookNotification(message, config.channels.webhook));
  }

  await Promise.allSettled(promises);
}

/**
 * Format message based on notification type
 */
function formatMessage(
  type: string,
  data: any
): { title: string; text: string; color?: string; fields?: Array<{ name: string; value: string; inline?: boolean }> } {
  switch (type) {
    case 'run_complete':
      return formatRunCompleteMessage(data);
    case 'run_failure':
      return formatRunFailureMessage(data);
    case 'high_failure_rate':
      return formatHighFailureRateMessage(data);
    case 'pr_created':
      return formatPRCreatedMessage(data);
    case 'milestone':
      return formatMilestoneMessage(data);
    default:
      return { title: 'Issue Sweeper Notification', text: JSON.stringify(data) };
  }
}

function formatRunCompleteMessage(data: { metrics: RunMetrics; state: State }): any {
  const { metrics, state } = data;
  const successRate = metrics.successRate.toFixed(1);
  const color = metrics.successRate >= 70 ? '#00ff00' : metrics.successRate >= 40 ? '#ffaa00' : '#ff0000';

  return {
    title: '✅ Issue Sweeper Run Completed',
    text: `Successfully processed ${metrics.issuesProcessed} issues with ${successRate}% success rate`,
    color,
    fields: [
      { name: 'Issues Processed', value: metrics.issuesProcessed.toString(), inline: true },
      { name: 'Issues Fixed', value: metrics.issuesFixed.toString(), inline: true },
      { name: 'PRs Created', value: metrics.prsCreated.toString(), inline: true },
      { name: 'Success Rate', value: `${successRate}%`, inline: true },
      { name: 'Duration', value: formatDuration(metrics.duration), inline: true },
      { name: 'Avg Time/Issue', value: `${(metrics.averageTimePerIssue / 1000).toFixed(1)}s`, inline: true },
      { name: 'Failures', value: metrics.failures.toString(), inline: true },
      { name: 'Total Progress', value: `${state.total_processed} issues processed overall`, inline: false },
    ],
  };
}

function formatRunFailureMessage(data: { error: string; state: State }): any {
  return {
    title: '❌ Issue Sweeper Run Failed',
    text: `Run failed with error: ${data.error}`,
    color: '#ff0000',
    fields: [
      { name: 'Error', value: data.error, inline: false },
      { name: 'Last Issue Processed', value: `#${data.state.last_issue_number}`, inline: true },
      { name: 'Total Processed', value: data.state.total_processed.toString(), inline: true },
    ],
  };
}

function formatHighFailureRateMessage(data: { failureRate: number; failures: number; total: number }): any {
  return {
    title: '⚠️ High Failure Rate Detected',
    text: `Failure rate is ${data.failureRate.toFixed(1)}% (${data.failures}/${data.total} issues)`,
    color: '#ff6600',
    fields: [
      { name: 'Failure Rate', value: `${data.failureRate.toFixed(1)}%`, inline: true },
      { name: 'Failed Issues', value: data.failures.toString(), inline: true },
      { name: 'Total Issues', value: data.total.toString(), inline: true },
    ],
  };
}

function formatPRCreatedMessage(data: { issueNumber: number; prUrl: string; title: string }): any {
  return {
    title: '🔗 New PR Created',
    text: `Created PR for issue #${data.issueNumber}: ${data.title}`,
    color: '#0066ff',
    fields: [
      { name: 'Issue', value: `#${data.issueNumber}`, inline: true },
      { name: 'PR', value: data.prUrl, inline: false },
    ],
  };
}

function formatMilestoneMessage(data: { milestone: number; totalProcessed: number }): any {
  return {
    title: '🎉 Milestone Reached!',
    text: `Processed ${data.totalProcessed} issues total (milestone: ${data.milestone})`,
    color: '#00ff00',
    fields: [
      { name: 'Milestone', value: data.milestone.toString(), inline: true },
      { name: 'Total Processed', value: data.totalProcessed.toString(), inline: true },
    ],
  };
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(message: any, config: SlackConfig): Promise<void> {
  const payload = {
    channel: config.channel,
    username: config.username || 'Issue Sweeper',
    icon_emoji: config.iconEmoji || ':robot_face:',
    attachments: [
      {
        title: message.title,
        text: message.text,
        color: message.color || '#0066ff',
        fields: message.fields || [],
        footer: 'Issue Sweeper',
        footer_icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Slack notification failed:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification(message: any, config: DiscordConfig): Promise<void> {
  const payload = {
    username: config.username || 'Issue Sweeper',
    avatar_url: config.avatarUrl,
    embeds: [
      {
        title: message.title,
        description: message.text,
        color: parseInt(message.color?.replace('#', '') || '0066ff', 16),
        fields: message.fields?.map((f: any) => ({
          name: f.name,
          value: f.value,
          inline: f.inline || false,
        })),
        footer: {
          text: 'Issue Sweeper',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord notification failed:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

/**
 * Send Email notification
 */
async function sendEmailNotification(message: any, config: EmailConfig): Promise<void> {
  // Email implementation would require nodemailer or similar
  // This is a placeholder for the structure
  console.log('Email notification would be sent here');
  console.log('To:', config.to);
  console.log('Subject:', message.title);
  console.log('Body:', message.text);
}

/**
 * Send generic webhook notification
 */
async function sendWebhookNotification(message: any, config: WebhookConfig): Promise<void> {
  const payload = {
    type: 'issue_sweeper_notification',
    timestamp: new Date().toISOString(),
    data: message,
  };

  try {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Webhook notification failed:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

/**
 * Load notification configuration
 */
export function loadNotificationConfig(): NotificationConfig | null {
  // Try environment variables first
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

  if (!slackWebhook && !discordWebhook && !webhookUrl) {
    return null;
  }

  return {
    enabled: true,
    channels: {
      slack: slackWebhook ? { webhookUrl: slackWebhook } : undefined,
      discord: discordWebhook ? { webhookUrl: discordWebhook } : undefined,
      webhook: webhookUrl ? { url: webhookUrl, method: 'POST' } : undefined,
    },
    triggers: {
      onRunComplete: true,
      onRunFailure: true,
      onHighFailureRate: true,
      onPRCreated: process.env.NOTIFY_ON_PR === 'true',
      onMilestone: true,
    },
    thresholds: {
      failureRateWarning: parseInt(process.env.FAILURE_RATE_WARNING || '30'),
      processedMilestone: parseInt(process.env.MILESTONE_INTERVAL || '100'),
    },
  };
}

/**
 * Check if failure rate exceeds threshold
 */
export function checkFailureRate(state: State, config: NotificationConfig): boolean {
  if (state.total_processed === 0) return false;

  const failureRate = (state.stats.not_solved / state.total_processed) * 100;
  return failureRate > config.thresholds.failureRateWarning;
}

/**
 * Check if milestone reached
 */
export function checkMilestone(state: State, config: NotificationConfig): number | null {
  const milestone = config.thresholds.processedMilestone;
  const currentMilestone = Math.floor(state.total_processed / milestone) * milestone;
  const previousMilestone = Math.floor((state.total_processed - 1) / milestone) * milestone;

  if (currentMilestone > previousMilestone && currentMilestone > 0) {
    return currentMilestone;
  }

  return null;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
