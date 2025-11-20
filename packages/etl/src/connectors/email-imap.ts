import Imap from 'imap';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { BaseConnector, ConnectorMetadata } from './base.js';
import type { ConnectorConfig } from '../types.js';

/**
 * Email IMAP Connector Configuration
 */
export interface EmailImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
  tlsOptions?: {
    rejectUnauthorized?: boolean;
  };
  mailbox?: string; // Default: 'INBOX'
  searchCriteria?: string[]; // IMAP search criteria (e.g., ['UNSEEN'], ['SINCE', 'May 20, 2023'])
  markAsSeen?: boolean;
  fetchAttachments?: boolean;
  attachmentFilter?: {
    extensions?: string[]; // e.g., ['.csv', '.json', '.pdf']
    maxSizeBytes?: number;
  };
  deleteAfterFetch?: boolean;
}

/**
 * Parsed Email Message
 */
export interface EmailMessage {
  messageId: string;
  subject?: string;
  from?: {
    name?: string;
    address?: string;
  };
  to?: Array<{
    name?: string;
    address?: string;
  }>;
  cc?: Array<{
    name?: string;
    address?: string;
  }>;
  date?: Date;
  text?: string;
  html?: string;
  headers: Map<string, string | string[]>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
}

/**
 * Email IMAP Connector
 * Supports IMAP/POP3 email ingestion with attachment extraction
 */
export class EmailImapConnector extends BaseConnector {
  private emailConfig: EmailImapConfig;
  private imap?: Imap;

  constructor(config: ConnectorConfig) {
    super(config);
    this.emailConfig = config.config as EmailImapConfig;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap({
          user: this.emailConfig.user,
          password: this.emailConfig.password,
          host: this.emailConfig.host,
          port: this.emailConfig.port,
          tls: this.emailConfig.tls ?? true,
          tlsOptions: this.emailConfig.tlsOptions
        });

        this.imap.once('ready', () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        });

        this.imap.once('error', (err: Error) => {
          this.handleError(err);
          reject(err);
        });

        this.imap.connect();
      } catch (error) {
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.imap) {
        this.imap.once('end', () => {
          this.connected = false;
          this.emit('disconnected');
          resolve();
        });
        this.imap.end();
      } else {
        resolve();
      }
    });
  }

  async test(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async *fetch(options?: Record<string, unknown>): AsyncGenerator<EmailMessage, void, unknown> {
    if (!this.connected || !this.imap) {
      await this.connect();
    }

    const mailbox = this.emailConfig.mailbox || 'INBOX';
    const searchCriteria = this.emailConfig.searchCriteria || ['ALL'];

    yield* this.fetchMessages(mailbox, searchCriteria);

    this.finish();
  }

  /**
   * Fetch messages from mailbox
   */
  private async *fetchMessages(
    mailbox: string,
    searchCriteria: string[]
  ): AsyncGenerator<EmailMessage, void, unknown> {
    if (!this.imap) {
      throw new Error('IMAP connection not established');
    }

    return new Promise<void>((resolve, reject) => {
      this.imap!.openBox(mailbox, false, (err, box) => {
        if (err) {
          this.handleError(err);
          reject(err);
          return;
        }

        this.imap!.search(searchCriteria, async (searchErr, uids) => {
          if (searchErr) {
            this.handleError(searchErr);
            reject(searchErr);
            return;
          }

          if (!uids || uids.length === 0) {
            resolve();
            return;
          }

          const fetch = this.imap!.fetch(uids, {
            bodies: '',
            markSeen: this.emailConfig.markAsSeen ?? false
          });

          const messages: EmailMessage[] = [];

          fetch.on('message', (msg, seqno) => {
            let buffer = Buffer.alloc(0);

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                const emailMessage = this.parseEmail(parsed);
                messages.push(emailMessage);
              } catch (error) {
                this.handleError(error as Error);
              }
            });
          });

          fetch.once('error', (fetchErr) => {
            this.handleError(fetchErr);
            reject(fetchErr);
          });

          fetch.once('end', async () => {
            // Yield all messages
            for (const message of messages) {
              yield message;
              this.emitProgress(this.stats.recordsRead + 1, this.stats.bytesRead);
            }

            // Delete messages if configured
            if (this.emailConfig.deleteAfterFetch && uids.length > 0) {
              try {
                await this.deleteMessages(uids);
              } catch (error) {
                this.handleError(error as Error);
              }
            }

            resolve();
          });
        });
      });
    });
  }

  /**
   * Parse email message
   */
  private parseEmail(parsed: ParsedMail): EmailMessage {
    const message: EmailMessage = {
      messageId: parsed.messageId || '',
      subject: parsed.subject,
      from: parsed.from?.value[0]
        ? {
            name: parsed.from.value[0].name,
            address: parsed.from.value[0].address
          }
        : undefined,
      to: parsed.to?.value.map((addr) => ({
        name: addr.name,
        address: addr.address
      })),
      cc: parsed.cc?.value.map((addr) => ({
        name: addr.name,
        address: addr.address
      })),
      date: parsed.date,
      text: parsed.text,
      html: parsed.html ? parsed.html.toString() : undefined,
      headers: parsed.headers
    };

    // Process attachments if configured
    if (this.emailConfig.fetchAttachments && parsed.attachments?.length > 0) {
      message.attachments = this.filterAttachments(parsed.attachments);
    }

    return message;
  }

  /**
   * Filter attachments based on configuration
   */
  private filterAttachments(attachments: Attachment[]): Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }> {
    return attachments
      .filter((attachment) => {
        // Filter by extension if configured
        if (this.emailConfig.attachmentFilter?.extensions) {
          const ext = attachment.filename?.toLowerCase().match(/\.[^.]+$/)?.[0];
          if (!ext || !this.emailConfig.attachmentFilter.extensions.includes(ext)) {
            return false;
          }
        }

        // Filter by size if configured
        if (this.emailConfig.attachmentFilter?.maxSizeBytes) {
          if (attachment.size > this.emailConfig.attachmentFilter.maxSizeBytes) {
            return false;
          }
        }

        return true;
      })
      .map((attachment) => ({
        filename: attachment.filename || 'unknown',
        contentType: attachment.contentType,
        size: attachment.size,
        content: attachment.content
      }));
  }

  /**
   * Delete messages from mailbox
   */
  private async deleteMessages(uids: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP connection not established'));
        return;
      }

      this.imap.addFlags(uids, ['\\Deleted'], (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.imap!.expunge((expungeErr) => {
          if (expungeErr) {
            reject(expungeErr);
            return;
          }
          resolve();
        });
      });
    });
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Email IMAP Connector',
      type: 'EMAIL_IMAP',
      version: '1.0.0',
      description: 'Ingests emails from IMAP/POP3 servers with attachment extraction',
      capabilities: [
        'imap',
        'attachment_extraction',
        'search_criteria',
        'mark_as_seen',
        'delete_after_fetch'
      ],
      requiredConfig: ['host', 'port', 'user', 'password']
    };
  }
}
