import https from 'https';
import axios from 'axios';
import { SIEMEvent } from '../../siem/types.js';
import { SIEMSink, SIEMSinkConfig } from '../../siem/sink.js';
import logger from '../../utils/logger.js';

const BLOCKED_SPLUNK_HOSTS = new Set([
  'localhost',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '169.254.169.254',
  'metadata.google.internal',
]);

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function validateSplunkEndpoint(endpoint: string): string {
  const parsed = new URL(endpoint);
  const allowInsecure = process.env.SPLUNK_ALLOW_INSECURE_HTTP === 'true';
  if (parsed.protocol !== 'https:' && !(allowInsecure && parsed.protocol === 'http:')) {
    throw new Error('Splunk endpoint must use https');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Splunk endpoint must not include URL credentials');
  }
  const host = parsed.hostname.toLowerCase();
  const allowPrivate = process.env.SPLUNK_ALLOW_PRIVATE_ENDPOINT === 'true';
  if (!allowPrivate && (BLOCKED_SPLUNK_HOSTS.has(host) || isPrivateHost(host))) {
    throw new Error('Splunk endpoint host is not allowed');
  }
  return parsed.toString();
}

export class SplunkSIEMSink implements SIEMSink {
  private config: SIEMSinkConfig;

  constructor(config: SIEMSinkConfig) {
    this.config = config;
  }

  async send(events: SIEMEvent[]): Promise<void> {
    if (!this.config.enabled) return;
    const endpoint = validateSplunkEndpoint(this.config.endpoint);

    // Transform events to Splunk HEC format
    const payload = events.map(e => ({
      time: e.timestamp.getTime() / 1000,
      host: e.source, // or hostname
      source: this.config.source || 'switchboard',
      sourcetype: this.config.sourcetype || '_json',
      index: this.config.index || 'main',
      event: e
    })).map(e => JSON.stringify(e)).join('\n'); // HEC supports batching with newlines

    try {
      await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json' // HEC expects this, or generic text
        },
        timeout: 5000,
        httpsAgent: new https.Agent({
            rejectUnauthorized: this.config.verifySsl !== false
        })
      });
    } catch (error: any) {
      logger.error('Failed to export to Splunk', { error: error.message });
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
       const endpoint = validateSplunkEndpoint(this.config.endpoint);
       // Send a dummy health check event
       await axios.post(endpoint, JSON.stringify({ event: { message: "connection check" } }), {
         headers: { 'Authorization': `Splunk ${this.config.token}` },
         timeout: 5000,
         httpsAgent: new https.Agent({
            rejectUnauthorized: this.config.verifySsl !== false
        })
       });
       return true;
    } catch (error: any) {
      return false;
    }
  }
}

export const EXPORT_COMPRESSION = process.env.EXPORT_COMPRESSION !== 'false';
export const EXPORT_SENSITIVE = process.env.ENABLE_SENSITIVE_EXPORTS === 'true';

// Legacy stub
export function exportToSplunk(payload: any) {
  if (EXPORT_SENSITIVE) {
    // send full payload
  }
}
