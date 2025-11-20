import {
  AlertDistributor,
  Alert,
  AlertChannel,
  EscalationRule,
  NotificationChain,
  AlertStatus,
} from './types';

export class MultiChannelAlertDistributor implements AlertDistributor {
  private channels: Map<AlertChannel, ChannelHandler> = new Map();

  registerChannel(channel: AlertChannel, handler: ChannelHandler): void {
    this.channels.set(channel, handler);
  }

  async distribute(alert: Alert): Promise<void> {
    const results: Promise<ChannelResult>[] = [];

    for (const channel of alert.channels) {
      const handler = this.channels.get(channel);
      if (handler) {
        results.push(
          handler
            .send(alert)
            .then((success) => ({ channel, success, error: null }))
            .catch((error) => ({ channel, success: false, error }))
        );
      }
    }

    const channelResults = await Promise.all(results);

    // Log results
    const failed = channelResults.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error('Failed to send alerts on channels:', failed);
    }
  }

  getChannels(): AlertChannel[] {
    return Array.from(this.channels.keys());
  }
}

export interface ChannelHandler {
  send(alert: Alert): Promise<boolean>;
}

export class SMSHandler implements ChannelHandler {
  constructor(private apiKey: string, private fromNumber: string) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, integrate with Twilio, AWS SNS, or similar
    console.log(`Sending SMS alert: ${alert.title}`);

    // Placeholder for SMS sending logic
    // await twilioClient.messages.create({
    //   body: alert.message,
    //   from: this.fromNumber,
    //   to: recipients
    // });

    return true;
  }
}

export class EmailHandler implements ChannelHandler {
  constructor(private smtpConfig: any) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, integrate with SendGrid, AWS SES, or similar
    console.log(`Sending email alert: ${alert.title}`);

    // Placeholder for email sending logic
    return true;
  }
}

export class PushNotificationHandler implements ChannelHandler {
  constructor(private fcmKey: string) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, integrate with Firebase Cloud Messaging, OneSignal, etc.
    console.log(`Sending push notification: ${alert.title}`);

    // Placeholder for push notification logic
    return true;
  }
}

export class VoiceHandler implements ChannelHandler {
  constructor(private apiKey: string) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, integrate with Twilio Voice API
    console.log(`Making voice call for alert: ${alert.title}`);

    // Placeholder for voice call logic
    return true;
  }
}

export class SirenHandler implements ChannelHandler {
  constructor(private sirenSystemEndpoint: string) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, integrate with emergency siren control systems
    console.log(`Activating siren for alert: ${alert.title}`);

    // Placeholder for siren activation logic
    return true;
  }
}

export class SocialMediaHandler implements ChannelHandler {
  constructor(private credentials: Record<string, string>) {}

  async send(alert: Alert): Promise<boolean> {
    // In production, post to Twitter, Facebook, etc.
    console.log(`Posting to social media: ${alert.title}`);

    // Placeholder for social media posting logic
    return true;
  }
}

export class AlertEscalationManager {
  private rules: EscalationRule[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  addRule(rule: EscalationRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  scheduleEscalation(
    alert: Alert,
    callback: (alert: Alert) => Promise<void>
  ): void {
    const applicableRules = this.getApplicableRules(alert);

    for (const rule of applicableRules) {
      const timeoutId = setTimeout(async () => {
        if (alert.status === AlertStatus.PENDING || alert.status === AlertStatus.ACTIVE) {
          alert.escalationLevel = (alert.escalationLevel || 0) + 1;
          await callback(alert);
        }
        this.escalationTimers.delete(alert.id);
      }, rule.delayMinutes * 60 * 1000);

      this.escalationTimers.set(alert.id, timeoutId);
    }
  }

  cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private getApplicableRules(alert: Alert): EscalationRule[] {
    return this.rules.filter((rule) => {
      if (!rule.enabled) return false;

      if (!rule.crisisTypes.includes(alert.crisisType)) return false;

      if (this.compareSeverity(alert.severity, rule.minSeverity) < 0) return false;

      return true;
    });
  }

  private compareSeverity(a: string, b: string): number {
    const order = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CATASTROPHIC'];
    return order.indexOf(a) - order.indexOf(b);
  }
}

export class NotificationChainExecutor {
  private chains: Map<string, NotificationChain> = new Map();

  addChain(chain: NotificationChain): void {
    this.chains.set(chain.id, chain);
  }

  async executeChain(
    chainId: string,
    alert: Alert,
    distributor: AlertDistributor
  ): Promise<void> {
    const chain = this.chains.get(chainId);
    if (!chain || !chain.enabled) {
      throw new Error(`Notification chain not found or disabled: ${chainId}`);
    }

    for (const step of chain.steps.sort((a, b) => a.order - b.order)) {
      // Wait for delay
      if (step.delayMinutes > 0) {
        await this.delay(step.delayMinutes * 60 * 1000);
      }

      // Send to recipients on specified channels
      const stepAlert = {
        ...alert,
        channels: step.channels,
      };

      await distributor.distribute(stepAlert);

      // If acknowledgement required, wait for timeout or acknowledgement
      if (step.requireAcknowledgement && step.timeoutMinutes) {
        const acknowledged = await this.waitForAcknowledgement(
          alert.id,
          step.timeoutMinutes * 60 * 1000
        );

        if (acknowledged) {
          // Stop chain execution if acknowledged
          break;
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForAcknowledgement(
    alertId: string,
    timeoutMs: number
  ): Promise<boolean> {
    // In production, this would check a database or cache for acknowledgement
    // For now, just wait for timeout
    await this.delay(timeoutMs);
    return false;
  }
}

interface ChannelResult {
  channel: AlertChannel;
  success: boolean;
  error: Error | null;
}
