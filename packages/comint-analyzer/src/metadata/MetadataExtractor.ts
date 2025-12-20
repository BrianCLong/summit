/**
 * Metadata Extractor - Communications metadata analysis
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface CommunicationMetadata {
  id: string;
  timestamp: Date;

  // Participants
  source: Identifier;
  destination: Identifier[];
  cc?: Identifier[];

  // Communication details
  channel: ChannelInfo;
  duration?: number; // seconds
  direction: 'inbound' | 'outbound' | 'internal' | 'unknown';

  // Technical metadata
  protocol: string;
  encrypted: boolean;
  encryptionType?: string;
  compression?: string;

  // Size/volume
  size: number; // bytes
  messageCount?: number;

  // Geolocation
  sourceLocation?: GeoLocation;
  destinationLocation?: GeoLocation;

  // Chain of custody
  capturePoint: string;
  processingPath: string[];

  isSimulated: boolean;
}

export interface Identifier {
  type: 'phone' | 'email' | 'ip' | 'imsi' | 'imei' | 'mac' | 'callsign' | 'username' | 'unknown';
  value: string;
  normalized?: string;
  confidence: number;
}

export interface ChannelInfo {
  type: 'voice' | 'sms' | 'email' | 'voip' | 'radio' | 'satellite' | 'data' | 'unknown';
  frequency?: number;
  bandwidth?: number;
  carrier?: string;
  technology?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  method: 'gps' | 'cell' | 'wifi' | 'ip' | 'tdoa' | 'manual' | 'simulated';
  timestamp: Date;
}

export interface CallDetailRecord {
  id: string;
  source: Identifier;
  destination: Identifier;
  startTime: Date;
  endTime?: Date;
  duration: number;
  callType: 'voice' | 'video' | 'sms' | 'mms' | 'data';
  status: 'completed' | 'missed' | 'failed' | 'busy';
  cellTowers?: Array<{
    id: string;
    location: GeoLocation;
    signalStrength: number;
  }>;
  isSimulated: boolean;
}

export class MetadataExtractor {
  private identifierNormalizers: Map<string, (value: string) => string> = new Map();

  constructor() {
    this.initializeNormalizers();
  }

  private initializeNormalizers(): void {
    // Phone number normalizer
    this.identifierNormalizers.set('phone', (value: string) => {
      return value.replace(/[\s\-().]/g, '');
    });

    // Email normalizer
    this.identifierNormalizers.set('email', (value: string) => {
      return value.toLowerCase().trim();
    });

    // IP address normalizer
    this.identifierNormalizers.set('ip', (value: string) => {
      return value.trim();
    });
  }

  /**
   * Extract metadata from raw communication data
   */
  extractMetadata(rawData: {
    headers?: Record<string, string>;
    content?: string;
    binary?: Uint8Array;
    protocol?: string;
  }): CommunicationMetadata {
    const source = this.extractIdentifier(rawData.headers?.['from'] || rawData.headers?.['source']);
    const destinations = this.extractDestinations(rawData.headers?.['to'] || rawData.headers?.['destination']);

    const metadata: CommunicationMetadata = {
      id: uuid(),
      timestamp: new Date(rawData.headers?.['date'] || Date.now()),
      source,
      destination: destinations,
      cc: rawData.headers?.['cc'] ? this.extractDestinations(rawData.headers['cc']) : undefined,
      channel: this.inferChannel(rawData),
      direction: this.inferDirection(source),
      protocol: rawData.protocol || 'unknown',
      encrypted: this.detectEncryption(rawData),
      encryptionType: this.detectEncryptionType(rawData),
      size: rawData.content?.length || rawData.binary?.length || 0,
      capturePoint: 'TRAINING-SIMULATOR',
      processingPath: ['MetadataExtractor'],
      isSimulated: true
    };

    return metadata;
  }

  /**
   * Generate simulated CDRs for training
   */
  generateSimulatedCDR(params?: {
    sourceType?: Identifier['type'];
    callType?: CallDetailRecord['callType'];
  }): CallDetailRecord {
    const startTime = new Date(Date.now() - Math.random() * 86400000);
    const duration = Math.floor(10 + Math.random() * 600);

    return {
      id: uuid(),
      source: this.generateSimulatedIdentifier(params?.sourceType || 'phone'),
      destination: this.generateSimulatedIdentifier(params?.sourceType || 'phone'),
      startTime,
      endTime: new Date(startTime.getTime() + duration * 1000),
      duration,
      callType: params?.callType || 'voice',
      status: 'completed',
      cellTowers: this.generateSimulatedCellTowers(),
      isSimulated: true
    };
  }

  /**
   * Extract and normalize identifier
   */
  private extractIdentifier(value?: string): Identifier {
    if (!value) {
      return { type: 'unknown', value: 'unknown', confidence: 0 };
    }

    const type = this.inferIdentifierType(value);
    const normalizer = this.identifierNormalizers.get(type);

    return {
      type,
      value,
      normalized: normalizer ? normalizer(value) : value,
      confidence: 0.8 + Math.random() * 0.15
    };
  }

  private extractDestinations(value?: string): Identifier[] {
    if (!value) return [];

    // Handle comma-separated destinations
    const parts = value.split(',').map(p => p.trim()).filter(p => p);
    return parts.map(p => this.extractIdentifier(p));
  }

  private inferIdentifierType(value: string): Identifier['type'] {
    if (/@/.test(value)) return 'email';
    if (/^\+?\d{7,}$/.test(value.replace(/[\s\-().]/g, ''))) return 'phone';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return 'ip';
    if (/^[A-F0-9]{2}(:[A-F0-9]{2}){5}$/i.test(value)) return 'mac';
    if (/^\d{15}$/.test(value)) return 'imei';
    if (/^\d{15,16}$/.test(value)) return 'imsi';
    return 'unknown';
  }

  private inferChannel(rawData: Record<string, unknown>): ChannelInfo {
    const protocol = (rawData.protocol as string)?.toLowerCase() || '';

    if (protocol.includes('sip') || protocol.includes('voip')) {
      return { type: 'voip', technology: 'SIP' };
    }
    if (protocol.includes('smtp') || protocol.includes('email')) {
      return { type: 'email', technology: 'SMTP' };
    }
    if (protocol.includes('sms')) {
      return { type: 'sms', technology: 'GSM' };
    }

    return { type: 'unknown' };
  }

  private inferDirection(_source: Identifier): CommunicationMetadata['direction'] {
    // Would use network topology in real implementation
    return 'unknown';
  }

  private detectEncryption(rawData: Record<string, unknown>): boolean {
    const headers = rawData.headers as Record<string, string> | undefined;
    if (headers?.['content-type']?.includes('encrypted')) return true;
    if (headers?.['x-encryption']) return true;
    return false;
  }

  private detectEncryptionType(rawData: Record<string, unknown>): string | undefined {
    const headers = rawData.headers as Record<string, string> | undefined;
    return headers?.['x-encryption-type'];
  }

  private generateSimulatedIdentifier(type: Identifier['type']): Identifier {
    let value: string;

    switch (type) {
      case 'phone':
        value = `+1${Math.floor(2000000000 + Math.random() * 7999999999)}`;
        break;
      case 'email':
        value = `user${Math.floor(Math.random() * 10000)}@training.example`;
        break;
      case 'ip':
        value = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        break;
      default:
        value = `ENTITY-${uuid().slice(0, 8)}`;
    }

    return {
      type,
      value,
      normalized: value,
      confidence: 0.95
    };
  }

  private generateSimulatedCellTowers(): CallDetailRecord['cellTowers'] {
    const count = 1 + Math.floor(Math.random() * 3);
    const towers: NonNullable<CallDetailRecord['cellTowers']> = [];

    for (let i = 0; i < count; i++) {
      towers.push({
        id: `TOWER-${Math.floor(Math.random() * 100000)}`,
        location: {
          latitude: 38 + Math.random() * 2,
          longitude: -77 + Math.random() * 2,
          accuracy: 100 + Math.random() * 500,
          method: 'simulated',
          timestamp: new Date()
        },
        signalStrength: -50 - Math.random() * 50
      });
    }

    return towers;
  }
}
