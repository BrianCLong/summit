export interface Signal {
  id: string;
  timestamp: Date;
  frequency: number; // Hz
  bandwidth: number; // Hz
  power: number; // dBm
  snr: number; // dB
  duration: number; // ms
  data?: Buffer; // Raw I/Q data snippet
  modulationType?: ModulationType;
  protocol?: string;
  content?: string; // Decoded content (if applicable)
  emitterId?: string;
  classification?: ClassificationResult;
  geolocation?: GeolocationResult;
  metadata?: Record<string, any>;
}

export type ModulationType = 'AM' | 'FM' | 'PSK' | 'FSK' | 'QAM' | 'OFDM' | 'CSS' | 'UNKNOWN';

export interface ClassificationResult {
  label: string;
  confidence: number;
  tags: string[];
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number; // meters
  method: 'TDOA' | 'FDOA' | 'AOA' | 'RSSI';
}

export interface Emitter {
  id: string;
  name: string;
  type: string; // e.g., 'Radar', 'Comms', 'Jammer'
  status: 'ACTIVE' | 'INACTIVE';
  lastSeen: Date;
  frequencyRange: { min: number; max: number };
  detectedModulations: ModulationType[];
  location?: GeolocationResult;
}

export interface SpectrumScanResult {
    timestamp: Date;
    startFrequency: number;
    stopFrequency: number;
    peaks: Array<{ frequency: number; power: number }>;
}
