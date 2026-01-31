import { SIEMEvent } from './types.js';

export interface SIEMSinkConfig {
  type: 'splunk' | 'elastic' | 'stub';
  enabled: boolean;
  endpoint: string;
  token?: string; // Splunk HEC token or API Key
  index?: string;
  source?: string;
  sourcetype?: string;
  verifySsl?: boolean;
}

export interface SIEMSink {
  send(events: SIEMEvent[]): Promise<void>;
  testConnection(): Promise<boolean>;
}
