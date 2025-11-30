import axios from 'axios';
import nodemailer, { Transporter } from 'nodemailer';
import { DeliveryAttempt, DeliveryInstruction, DeliveryResult, ReportArtifact } from './types';
import { validateDeliveryInstruction } from './validation';

function buildTransporter(): Transporter {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

export class DeliveryService {
  constructor(private readonly transporter: Transporter = buildTransporter()) {}

  async deliver(
    artifact: ReportArtifact,
    instruction?: DeliveryInstruction,
  ): Promise<DeliveryResult | undefined> {
    const validated = validateDeliveryInstruction(instruction);
    if (!validated) return undefined;

    const attempts: DeliveryAttempt[] = [];
    const tasks = validated.channels.map((channel) => {
      if (channel === 'email' && validated.email) {
        return { channel, task: this.sendEmail(artifact, validated.email) } as const;
      }
      if (channel === 'slack' && validated.slack) {
        return { channel, task: this.sendSlack(artifact, validated.slack) } as const;
      }
      if (channel === 'webhook' && validated.webhook) {
        return { channel, task: this.sendWebhook(artifact, validated.webhook) } as const;
      }
      return { channel, task: Promise.reject(new Error(`Unsupported channel: ${channel}`)) } as const;
    });

    const settled = await Promise.allSettled(tasks.map((entry) => entry.task));
    settled.forEach((result, index) => {
      const channel = tasks[index]?.channel;
      if (!channel) return;
      if (result.status === 'fulfilled') {
        attempts.push({ channel, status: 'sent' });
      } else {
        attempts.push({ channel, status: 'failed', error: result.reason?.message || 'unknown error' });
      }
    });

    return { attempts };
  }

  private async sendEmail(
    artifact: ReportArtifact,
    config: Required<DeliveryInstruction>['email'],
  ): Promise<void> {
    await this.transporter.sendMail({
      to: config.to,
      cc: config.cc,
      bcc: config.bcc,
      subject: config.subject || `Report: ${artifact.fileName}`,
      text: config.body || 'Automated report delivery',
      attachments: [
        {
          filename: artifact.fileName,
          content: artifact.buffer,
          contentType: artifact.mimeType,
        },
      ],
    });
  }

  private async sendSlack(
    artifact: ReportArtifact,
    config: Required<DeliveryInstruction>['slack'],
  ): Promise<void> {
    const payload = {
      text: config.text || 'New report available',
      attachments: [
        {
          title: artifact.fileName,
          text: `Format: ${artifact.format}`,
        },
      ],
    };
    await axios.post(config.webhookUrl, payload);
  }

  private async sendWebhook(
    artifact: ReportArtifact,
    config: Required<DeliveryInstruction>['webhook'],
  ): Promise<void> {
    const payload = {
      ...config.payload,
      artifact: {
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        format: artifact.format,
        size: artifact.buffer.length,
      },
    };
    await axios.post(config.url, payload, { headers: config.headers });
  }
}
