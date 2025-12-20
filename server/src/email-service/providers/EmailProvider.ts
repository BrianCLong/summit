/**
 * Email Provider Interface
 *
 * Abstract interface for email delivery providers
 */

import { EmailMessage, EmailSendResult } from '../types.js';

export abstract class EmailProvider {
  abstract initialize(): Promise<void>;
  abstract send(message: EmailMessage): Promise<EmailSendResult>;
  abstract shutdown(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}
