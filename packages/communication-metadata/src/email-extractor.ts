import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { EmailMetadata, CommunicationExtractionResult } from './types.js';

/**
 * Extractor for email metadata
 * Supports RFC 822/MIME formatted emails
 */
export class EmailExtractor extends BaseExtractor {
  readonly name = 'email-extractor';
  readonly supportedTypes = [
    'message/rfc822',
    'application/mbox',
    'text/plain', // .eml files
  ];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType && this.supportedTypes.includes(mimeType)) {
      return true;
    }

    // Check if content looks like an email
    const content = Buffer.isBuffer(file) ? file.toString('utf8', 0, 1000) : file.substring(0, 1000);
    return /^(From|Received|Date|Subject|To|From):/.test(content);
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<CommunicationExtractionResult>> {
    const content = Buffer.isBuffer(file) ? file.toString('utf8') : file;

    // Parse email headers
    const headers = this.parseHeaders(content);

    // Extract routing information
    const receivedPath = this.parseReceivedHeaders(headers);

    // Parse addresses
    const from = this.parseAddress(headers['from']?.[0]);
    const to = this.parseAddresses(headers['to']?.[0]);
    const cc = this.parseAddresses(headers['cc']?.[0]);
    const replyTo = this.parseAddress(headers['reply-to']?.[0]);

    // Extract message threading
    const messageId = headers['message-id']?.[0];
    const inReplyTo = headers['in-reply-to']?.[0];
    const references = headers['references']?.[0]?.split(/\s+/).filter(Boolean);

    // Extract timestamps
    const date = headers['date']?.[0] ? new Date(headers['date'][0]) : undefined;

    // Extract body preview
    const bodyPreview = this.extractBodyPreview(content);

    // Extract attachments
    const attachments = this.extractAttachments(content);

    // Extract security headers
    const spfResult = this.extractAuthResult(headers, 'spf');
    const dkimResult = this.extractAuthResult(headers, 'dkim');
    const dmarcResult = this.extractAuthResult(headers, 'dmarc');

    // Detect anomalies
    const anomalies: ExtractionResult['anomalies'] = [];

    // Check for spoofing indicators
    if (this.detectSpoofing(headers, receivedPath)) {
      anomalies.push({
        type: 'email_spoofing_suspected',
        severity: 'high',
        description: 'Email may be spoofed - sender/routing mismatch',
        evidence: { from, receivedPath },
      });
    }

    // Check authentication failures
    if (spfResult === 'fail' || dkimResult === 'fail' || dmarcResult === 'fail') {
      anomalies.push({
        type: 'authentication_failure',
        severity: 'high',
        description: 'Email failed authentication checks',
        evidence: { spfResult, dkimResult, dmarcResult },
      });
    }

    const emailMetadata: EmailMetadata = {
      messageId,
      inReplyTo,
      references,
      from,
      to,
      cc,
      replyTo,
      subject: headers['subject']?.[0],
      bodyPreview,
      date,
      receivedPath,
      returnPath: headers['return-path']?.[0],
      attachments,
      xMailer: headers['x-mailer']?.[0],
      userAgent: headers['user-agent']?.[0],
      xOrigintingIp: headers['x-originating-ip']?.[0],
      spfResult,
      dkimResult,
      dmarcResult,
      priority: this.parsePriority(headers),
      customHeaders: this.extractCustomHeaders(headers),
    };

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'email',
        confidence: 0.95,
      },
      temporal: {
        created: date,
      },
      communication: {
        email: emailMetadata,
      },
      anomalies: anomalies.length > 0 ? anomalies : undefined,
    };
  }

  private parseHeaders(content: string): Record<string, string[]> {
    const headers: Record<string, string[]> = {};
    const lines = content.split('\n');
    let currentHeader = '';
    let currentValue = '';

    for (const line of lines) {
      if (line.trim() === '') break; // End of headers

      if (line.match(/^[A-Za-z-]+:/)) {
        // New header
        if (currentHeader) {
          if (!headers[currentHeader]) headers[currentHeader] = [];
          headers[currentHeader].push(currentValue.trim());
        }

        const colonIndex = line.indexOf(':');
        currentHeader = line.substring(0, colonIndex).toLowerCase();
        currentValue = line.substring(colonIndex + 1).trim();
      } else {
        // Continuation of previous header
        currentValue += ' ' + line.trim();
      }
    }

    // Add last header
    if (currentHeader) {
      if (!headers[currentHeader]) headers[currentHeader] = [];
      headers[currentHeader].push(currentValue.trim());
    }

    return headers;
  }

  private parseReceivedHeaders(headers: Record<string, string[]>): EmailMetadata['receivedPath'] {
    const received = headers['received'] || [];
    const path: EmailMetadata['receivedPath'] = [];

    for (const line of received) {
      const fromMatch = line.match(/from\s+([^\s]+)/i);
      const byMatch = line.match(/by\s+([^\s]+)/i);
      const dateMatch = line.match(/;\s*(.+)$/);

      if (fromMatch && byMatch) {
        path.push({
          from: fromMatch[1],
          by: byMatch[1],
          timestamp: dateMatch ? new Date(dateMatch[1]) : new Date(),
        });
      }
    }

    return path.length > 0 ? path : undefined;
  }

  private parseAddress(address?: string): EmailMetadata['from'] {
    if (!address) return undefined;

    const match = address.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].replace(/^["']|["']$/g, '').trim(),
        address: match[2].trim(),
      };
    }

    return { address: address.trim() };
  }

  private parseAddresses(addresses?: string): EmailMetadata['to'] {
    if (!addresses) return undefined;

    return addresses.split(',').map(addr => {
      const parsed = this.parseAddress(addr.trim());
      return parsed!;
    }).filter(Boolean);
  }

  private extractBodyPreview(content: string): string | undefined {
    const bodyStart = content.indexOf('\n\n');
    if (bodyStart === -1) return undefined;

    const body = content.substring(bodyStart + 2);
    return body.substring(0, 200).trim();
  }

  private extractAttachments(content: string): EmailMetadata['attachments'] {
    const attachments: EmailMetadata['attachments'] = [];

    // Simple detection of Content-Disposition: attachment
    const attachmentRegex = /Content-Disposition:\s*attachment;\s*filename="([^"]+)"/gi;
    let match;

    while ((match = attachmentRegex.exec(content)) !== null) {
      attachments.push({
        filename: match[1],
        contentType: 'application/octet-stream',
        size: 0,
        inline: false,
      });
    }

    return attachments.length > 0 ? attachments : undefined;
  }

  private extractAuthResult(headers: Record<string, string[]>, type: 'spf' | 'dkim' | 'dmarc'): string | undefined {
    const authResults = headers['authentication-results'] || [];

    for (const result of authResults) {
      const regex = new RegExp(`${type}=([^;\\s]+)`, 'i');
      const match = result.match(regex);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private detectSpoofing(headers: Record<string, string[]>, receivedPath?: EmailMetadata['receivedPath']): boolean {
    // Simple spoofing detection heuristics
    const from = headers['from']?.[0] || '';
    const returnPath = headers['return-path']?.[0] || '';

    // Check if Return-Path domain matches From domain
    const fromDomain = from.match(/@([^\s>]+)/)?.[1];
    const returnDomain = returnPath.match(/@([^\s>]+)/)?.[1];

    if (fromDomain && returnDomain && fromDomain !== returnDomain) {
      return true;
    }

    return false;
  }

  private parsePriority(headers: Record<string, string[]>): EmailMetadata['priority'] {
    const priority = headers['priority']?.[0]?.toLowerCase();
    const importance = headers['importance']?.[0]?.toLowerCase();
    const xPriority = headers['x-priority']?.[0];

    if (priority === 'urgent' || importance === 'high' || xPriority === '1') {
      return 'high';
    }
    if (priority === 'non-urgent' || importance === 'low' || xPriority === '5') {
      return 'low';
    }

    return 'normal';
  }

  private extractCustomHeaders(headers: Record<string, string[]>): Record<string, string> | undefined {
    const custom: Record<string, string> = {};
    const standardHeaders = new Set([
      'from', 'to', 'cc', 'bcc', 'subject', 'date', 'message-id',
      'in-reply-to', 'references', 'received', 'return-path',
      'content-type', 'mime-version', 'x-mailer', 'user-agent',
    ]);

    for (const [key, values] of Object.entries(headers)) {
      if (!standardHeaders.has(key) && key.startsWith('x-')) {
        custom[key] = values[0];
      }
    }

    return Object.keys(custom).length > 0 ? custom : undefined;
  }
}
