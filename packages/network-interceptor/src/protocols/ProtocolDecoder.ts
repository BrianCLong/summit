/**
 * Protocol Decoder - Application layer protocol analysis
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface DecodedMessage {
  id: string;
  protocol: string;
  timestamp: Date;
  sourceIP: string;
  destinationIP: string;
  sourcePort: number;
  destinationPort: number;
  decoded: Record<string, unknown>;
  raw?: Uint8Array;
  isSimulated: boolean;
}

export interface HTTPMessage {
  type: 'request' | 'response';
  method?: string;
  uri?: string;
  statusCode?: number;
  statusText?: string;
  version: string;
  headers: Record<string, string>;
  body?: string;
  contentLength?: number;
}

export interface DNSMessage {
  type: 'query' | 'response';
  id: number;
  flags: {
    qr: boolean;
    opcode: number;
    authoritative: boolean;
    truncated: boolean;
    recursionDesired: boolean;
    recursionAvailable: boolean;
    responseCode: number;
  };
  questions: Array<{
    name: string;
    type: number;
    class: number;
  }>;
  answers: Array<{
    name: string;
    type: number;
    class: number;
    ttl: number;
    data: string;
  }>;
}

export interface SMTPMessage {
  command?: string;
  response?: { code: number; message: string };
  from?: string;
  to?: string[];
  subject?: string;
  body?: string;
}

export class ProtocolDecoder {
  /**
   * Decode HTTP message
   */
  decodeHTTP(data: Uint8Array | string): HTTPMessage | null {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const lines = text.split('\r\n');

    if (lines.length === 0) return null;

    const firstLine = lines[0];
    const isRequest = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s/.test(firstLine);

    const headers: Record<string, string> = {};
    let bodyStart = -1;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '') {
        bodyStart = i + 1;
        break;
      }
      const colonIdx = lines[i].indexOf(':');
      if (colonIdx > 0) {
        const key = lines[i].slice(0, colonIdx).trim().toLowerCase();
        const value = lines[i].slice(colonIdx + 1).trim();
        headers[key] = value;
      }
    }

    const body = bodyStart > 0 ? lines.slice(bodyStart).join('\r\n') : undefined;

    if (isRequest) {
      const [method, uri, version] = firstLine.split(' ');
      return {
        type: 'request',
        method,
        uri,
        version: version || 'HTTP/1.1',
        headers,
        body,
        contentLength: headers['content-length'] ? parseInt(headers['content-length']) : undefined
      };
    } else {
      const match = firstLine.match(/^HTTP\/(\d\.\d)\s+(\d+)\s*(.*)/);
      if (!match) return null;

      return {
        type: 'response',
        version: `HTTP/${match[1]}`,
        statusCode: parseInt(match[2]),
        statusText: match[3],
        headers,
        body,
        contentLength: headers['content-length'] ? parseInt(headers['content-length']) : undefined
      };
    }
  }

  /**
   * Decode DNS message
   */
  decodeDNS(data: Uint8Array): DNSMessage | null {
    if (data.length < 12) return null;

    const id = (data[0] << 8) | data[1];
    const flags = (data[2] << 8) | data[3];
    const qdCount = (data[4] << 8) | data[5];
    const anCount = (data[6] << 8) | data[7];

    const message: DNSMessage = {
      type: (flags & 0x8000) ? 'response' : 'query',
      id,
      flags: {
        qr: (flags & 0x8000) !== 0,
        opcode: (flags >> 11) & 0x0F,
        authoritative: (flags & 0x0400) !== 0,
        truncated: (flags & 0x0200) !== 0,
        recursionDesired: (flags & 0x0100) !== 0,
        recursionAvailable: (flags & 0x0080) !== 0,
        responseCode: flags & 0x000F
      },
      questions: [],
      answers: []
    };

    let offset = 12;

    // Parse questions
    for (let i = 0; i < qdCount && offset < data.length; i++) {
      const { name, newOffset } = this.parseDNSName(data, offset);
      offset = newOffset;

      if (offset + 4 <= data.length) {
        const qtype = (data[offset] << 8) | data[offset + 1];
        const qclass = (data[offset + 2] << 8) | data[offset + 3];
        offset += 4;

        message.questions.push({ name, type: qtype, class: qclass });
      }
    }

    // Parse answers
    for (let i = 0; i < anCount && offset < data.length; i++) {
      const { name, newOffset } = this.parseDNSName(data, offset);
      offset = newOffset;

      if (offset + 10 <= data.length) {
        const atype = (data[offset] << 8) | data[offset + 1];
        const aclass = (data[offset + 2] << 8) | data[offset + 3];
        const ttl = (data[offset + 4] << 24) | (data[offset + 5] << 16) |
          (data[offset + 6] << 8) | data[offset + 7];
        const rdlength = (data[offset + 8] << 8) | data[offset + 9];
        offset += 10;

        let rdata = '';
        if (atype === 1 && rdlength === 4) {
          // A record
          rdata = `${data[offset]}.${data[offset + 1]}.${data[offset + 2]}.${data[offset + 3]}`;
        } else if (atype === 28 && rdlength === 16) {
          // AAAA record
          const parts: string[] = [];
          for (let j = 0; j < 16; j += 2) {
            parts.push(((data[offset + j] << 8) | data[offset + j + 1]).toString(16));
          }
          rdata = parts.join(':');
        }

        offset += rdlength;
        message.answers.push({ name, type: atype, class: aclass, ttl, data: rdata });
      }
    }

    return message;
  }

  private parseDNSName(data: Uint8Array, offset: number): { name: string; newOffset: number } {
    const labels: string[] = [];
    let jumped = false;
    let jumpOffset = offset;

    while (offset < data.length) {
      const len = data[offset];

      if (len === 0) {
        offset++;
        break;
      }

      if ((len & 0xC0) === 0xC0) {
        // Compression pointer
        if (!jumped) jumpOffset = offset + 2;
        offset = ((len & 0x3F) << 8) | data[offset + 1];
        jumped = true;
        continue;
      }

      offset++;
      const label = new TextDecoder().decode(data.slice(offset, offset + len));
      labels.push(label);
      offset += len;
    }

    return {
      name: labels.join('.'),
      newOffset: jumped ? jumpOffset : offset
    };
  }

  /**
   * Decode SMTP message
   */
  decodeSMTP(data: Uint8Array | string): SMTPMessage {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const lines = text.split('\r\n');
    const message: SMTPMessage = {};

    for (const line of lines) {
      // Response
      const responseMatch = line.match(/^(\d{3})\s*(.*)/);
      if (responseMatch) {
        message.response = {
          code: parseInt(responseMatch[1]),
          message: responseMatch[2]
        };
        continue;
      }

      // Commands
      if (line.startsWith('MAIL FROM:')) {
        message.command = 'MAIL FROM';
        message.from = line.slice(10).trim().replace(/[<>]/g, '');
      } else if (line.startsWith('RCPT TO:')) {
        message.command = 'RCPT TO';
        message.to = message.to || [];
        message.to.push(line.slice(8).trim().replace(/[<>]/g, ''));
      } else if (line.startsWith('Subject:')) {
        message.subject = line.slice(8).trim();
      } else if (/^(HELO|EHLO|DATA|QUIT|RSET|NOOP|AUTH)/.test(line)) {
        message.command = line.split(' ')[0];
      }
    }

    return message;
  }

  /**
   * Generate simulated decoded messages for training
   */
  generateSimulatedMessages(protocol: string, count: number): DecodedMessage[] {
    const messages: DecodedMessage[] = [];

    for (let i = 0; i < count; i++) {
      const msg: DecodedMessage = {
        id: uuid(),
        protocol,
        timestamp: new Date(),
        sourceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        destinationIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        sourcePort: 1024 + Math.floor(Math.random() * 64000),
        destinationPort: this.getDefaultPort(protocol),
        decoded: this.generateProtocolData(protocol),
        isSimulated: true
      };

      messages.push(msg);
    }

    return messages;
  }

  private getDefaultPort(protocol: string): number {
    const ports: Record<string, number> = {
      HTTP: 80,
      HTTPS: 443,
      DNS: 53,
      SMTP: 25,
      FTP: 21,
      SSH: 22
    };
    return ports[protocol.toUpperCase()] || 80;
  }

  private generateProtocolData(protocol: string): Record<string, unknown> {
    switch (protocol.toUpperCase()) {
      case 'HTTP':
        return {
          method: ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)],
          uri: '/api/training/simulation',
          version: 'HTTP/1.1',
          headers: {
            'host': 'training.example.com',
            'user-agent': 'SIGINT-Training/1.0',
            'content-type': 'application/json'
          },
          body: '[SIMULATED HTTP BODY]'
        };
      case 'DNS':
        return {
          type: 'query',
          id: Math.floor(Math.random() * 65535),
          questions: [{
            name: 'training.example.com',
            type: 1,
            class: 1
          }]
        };
      case 'SMTP':
        return {
          command: 'MAIL FROM',
          from: 'training@example.com',
          to: ['recipient@example.com']
        };
      default:
        return { data: '[SIMULATED PROTOCOL DATA]' };
    }
  }
}
