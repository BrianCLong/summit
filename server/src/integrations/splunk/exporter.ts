import axios from 'axios';
import { SIEMEvent } from '../../siem/types.js';
import { SIEMSink, SIEMSinkConfig } from '../../siem/sink.js';
import logger from '../../utils/logger.js';

export class SplunkSIEMSink implements SIEMSink {
  private config: SIEMSinkConfig;

  constructor(config: SIEMSinkConfig) {
    this.config = config;
  }

  async send(events: SIEMEvent[]): Promise<void> {
    if (!this.config.enabled) return;

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
      await axios.post(this.config.endpoint, payload, {
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json' // HEC expects this, or generic text
        },
        timeout: 5000,
        httpsAgent: new (require('https').Agent)({
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
       // Send a dummy health check event
       await axios.post(this.config.endpoint, JSON.stringify({ event: { message: "connection check" } }), {
         headers: { 'Authorization': `Splunk ${this.config.token}` },
         timeout: 5000,
         httpsAgent: new (require('https').Agent)({
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
