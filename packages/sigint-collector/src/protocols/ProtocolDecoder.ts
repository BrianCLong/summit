/**
 * Protocol Decoder - RF protocol identification
 * TRAINING/SIMULATION ONLY
 */

import { SignalType, ModulationType } from '../types';

export interface ProtocolSignature {
  id: string;
  name: string;
  signalType: SignalType;
  modulation: ModulationType;
  frequency: {
    min: number;
    max: number;
    typical: number;
  };
  bandwidth: number;
  characteristics: {
    frameDuration?: number;
    symbolRate?: number;
    channelSpacing?: number;
    accessMethod?: 'FDMA' | 'TDMA' | 'CDMA' | 'OFDMA';
  };
  description: string;
}

export interface DecodingResult {
  protocol: string;
  confidence: number;
  parameters: Record<string, unknown>;
  rawData?: string;
  timestamp: Date;
  isSimulated: boolean;
}

export class ProtocolDecoder {
  private signatures: Map<string, ProtocolSignature> = new Map();

  constructor() {
    this.initializeSignatures();
  }

  private initializeSignatures(): void {
    const protocols: ProtocolSignature[] = [
      {
        id: 'gsm',
        name: 'GSM (2G)',
        signalType: 'CELLULAR_2G',
        modulation: 'GMSK',
        frequency: { min: 880e6, max: 960e6, typical: 900e6 },
        bandwidth: 200e3,
        characteristics: {
          frameDuration: 4.615,
          symbolRate: 270833,
          channelSpacing: 200e3,
          accessMethod: 'TDMA'
        },
        description: 'Global System for Mobile Communications'
      },
      {
        id: 'umts',
        name: 'UMTS (3G)',
        signalType: 'CELLULAR_3G',
        modulation: 'QPSK',
        frequency: { min: 1920e6, max: 2170e6, typical: 2100e6 },
        bandwidth: 5e6,
        characteristics: {
          symbolRate: 3840000,
          channelSpacing: 5e6,
          accessMethod: 'CDMA'
        },
        description: 'Universal Mobile Telecommunications System'
      },
      {
        id: 'lte',
        name: 'LTE (4G)',
        signalType: 'CELLULAR_4G',
        modulation: 'OFDM',
        frequency: { min: 700e6, max: 2600e6, typical: 1800e6 },
        bandwidth: 20e6,
        characteristics: {
          frameDuration: 10,
          channelSpacing: 15e3,
          accessMethod: 'OFDMA'
        },
        description: 'Long-Term Evolution'
      },
      {
        id: '5g-nr',
        name: '5G NR',
        signalType: 'CELLULAR_5G',
        modulation: 'OFDM',
        frequency: { min: 600e6, max: 39e9, typical: 3500e6 },
        bandwidth: 100e6,
        characteristics: {
          channelSpacing: 30e3,
          accessMethod: 'OFDMA'
        },
        description: '5G New Radio'
      },
      {
        id: 'wifi-ac',
        name: 'WiFi 802.11ac',
        signalType: 'WIFI',
        modulation: 'OFDM',
        frequency: { min: 5170e6, max: 5835e6, typical: 5500e6 },
        bandwidth: 80e6,
        characteristics: {
          channelSpacing: 312.5e3,
          accessMethod: 'OFDMA'
        },
        description: 'IEEE 802.11ac WiFi'
      },
      {
        id: 'bluetooth',
        name: 'Bluetooth',
        signalType: 'BLUETOOTH',
        modulation: 'GFSK',
        frequency: { min: 2402e6, max: 2480e6, typical: 2440e6 },
        bandwidth: 1e6,
        characteristics: {
          symbolRate: 1e6,
          channelSpacing: 1e6,
          accessMethod: 'FDMA'
        },
        description: 'Bluetooth Classic'
      },
      {
        id: 'gps',
        name: 'GPS L1',
        signalType: 'NAVIGATION',
        modulation: 'BPSK',
        frequency: { min: 1575.42e6, max: 1575.42e6, typical: 1575.42e6 },
        bandwidth: 2.046e6,
        characteristics: {
          symbolRate: 1.023e6,
          accessMethod: 'CDMA'
        },
        description: 'GPS L1 C/A Signal'
      },
      {
        id: 'adsb',
        name: 'ADS-B',
        signalType: 'TELEMETRY',
        modulation: 'PPM',
        frequency: { min: 1090e6, max: 1090e6, typical: 1090e6 },
        bandwidth: 1e6,
        characteristics: {
          frameDuration: 0.12
        },
        description: 'Automatic Dependent Surveillance-Broadcast'
      }
    ];

    protocols.forEach(p => this.signatures.set(p.id, p));
  }

  /**
   * Identify protocol from signal characteristics
   */
  identifyProtocol(params: {
    frequency: number;
    bandwidth: number;
    modulation?: ModulationType;
  }): Array<{ signature: ProtocolSignature; confidence: number }> {
    const matches: Array<{ signature: ProtocolSignature; confidence: number }> = [];

    for (const signature of this.signatures.values()) {
      let confidence = 0;

      // Check frequency match
      if (params.frequency >= signature.frequency.min &&
        params.frequency <= signature.frequency.max) {
        confidence += 0.4;

        // Bonus for typical frequency
        const typicalDiff = Math.abs(params.frequency - signature.frequency.typical);
        const freqRange = signature.frequency.max - signature.frequency.min;
        if (freqRange > 0) {
          confidence += 0.2 * (1 - typicalDiff / freqRange);
        }
      }

      // Check bandwidth match
      const bwRatio = params.bandwidth / signature.bandwidth;
      if (bwRatio > 0.5 && bwRatio < 2.0) {
        confidence += 0.2 * (1 - Math.abs(1 - bwRatio));
      }

      // Check modulation match
      if (params.modulation && params.modulation === signature.modulation) {
        confidence += 0.2;
      }

      if (confidence > 0.3) {
        matches.push({ signature, confidence: Math.min(1, confidence) });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Decode protocol data (simulated)
   */
  decodeProtocol(
    protocolId: string,
    _data: Uint8Array | Float32Array
  ): DecodingResult | null {
    const signature = this.signatures.get(protocolId);
    if (!signature) return null;

    // Generate simulated decoded data
    return {
      protocol: signature.name,
      confidence: 0.8 + Math.random() * 0.15,
      parameters: {
        ...signature.characteristics,
        frequency: signature.frequency.typical,
        bandwidth: signature.bandwidth
      },
      rawData: '[SIMULATED PROTOCOL DATA]',
      timestamp: new Date(),
      isSimulated: true
    };
  }

  /**
   * Get all protocol signatures
   */
  getSignatures(): ProtocolSignature[] {
    return Array.from(this.signatures.values());
  }

  /**
   * Get signature by ID
   */
  getSignature(id: string): ProtocolSignature | undefined {
    return this.signatures.get(id);
  }

  /**
   * Get protocols by signal type
   */
  getProtocolsByType(signalType: SignalType): ProtocolSignature[] {
    return Array.from(this.signatures.values())
      .filter(s => s.signalType === signalType);
  }
}
