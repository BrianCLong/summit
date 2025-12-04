/**
 * SIGINT Dashboard Type Definitions
 * Signals Intelligence types for waveform visualization, MASINT overlays,
 * and agentic demodulation interfaces.
 */

/** Signal frequency band classification */
export type FrequencyBand = 'VLF' | 'LF' | 'MF' | 'HF' | 'VHF' | 'UHF' | 'SHF' | 'EHF';

/** Modulation types for signal classification */
export type ModulationType =
  | 'AM'
  | 'FM'
  | 'PM'
  | 'ASK'
  | 'FSK'
  | 'PSK'
  | 'QAM'
  | 'OFDM'
  | 'SPREAD_SPECTRUM'
  | 'UNKNOWN';

/** Signal classification confidence levels */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';

/** Real-time signal sample from Redis stream */
export interface SignalSample {
  timestamp: number;
  frequency: number;
  amplitude: number;
  phase: number;
  iq: { i: number; q: number };
}

/** Waveform data point for WebGL rendering */
export interface WaveformPoint {
  x: number;
  y: number;
  intensity: number;
  frequency: number;
}

/** Complete signal stream with metadata */
export interface SignalStream {
  id: string;
  name: string;
  band: FrequencyBand;
  centerFrequency: number;
  bandwidth: number;
  sampleRate: number;
  modulation: ModulationType;
  confidence: ConfidenceLevel;
  samples: SignalSample[];
  active: boolean;
  geolocation?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
}

/** MASINT sensor overlay data */
export interface MASINTOverlay {
  id: string;
  sensorType: 'RADAR' | 'ACOUSTIC' | 'SEISMIC' | 'NUCLEAR' | 'ELECTRO_OPTICAL';
  coverage: {
    center: { lat: number; lng: number };
    radiusKm: number;
  };
  detections: MASINTDetection[];
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
  lastUpdate: number;
}

/** Individual MASINT detection event */
export interface MASINTDetection {
  id: string;
  timestamp: number;
  type: string;
  location: { lat: number; lng: number };
  confidence: number;
  classification: string;
  metadata: Record<string, unknown>;
}

/** Agentic demodulation task */
export interface DemodulationTask {
  id: string;
  signalId: string;
  status: 'QUEUED' | 'ANALYZING' | 'DEMODULATING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: DemodulationResult;
  startedAt: number;
  completedAt?: number;
  agentId: string;
}

/** Result from agentic demodulation */
export interface DemodulationResult {
  modulation: ModulationType;
  symbolRate: number;
  carrierFrequency: number;
  confidence: number;
  decodedPayload?: {
    format: string;
    content: string;
    checksum: boolean;
  };
  spectralSignature: number[];
  recommendations: string[];
}

/** Dashboard filter state */
export interface SIGINTFilters {
  bands: FrequencyBand[];
  modulationTypes: ModulationType[];
  minConfidence: ConfidenceLevel;
  frequencyRange: { min: number; max: number };
  activeOnly: boolean;
  timeWindow: number; // seconds
}

/** Dashboard state for Redux */
export interface SIGINTDashboardState {
  streams: SignalStream[];
  masintOverlays: MASINTOverlay[];
  demodulationTasks: DemodulationTask[];
  selectedStreamId: string | null;
  filters: SIGINTFilters;
  isConnected: boolean;
  connectionLatency: number;
  error: string | null;
}

/** WebGL renderer configuration */
export interface WaveformRendererConfig {
  width: number;
  height: number;
  backgroundColor: string;
  waveformColor: string;
  gridColor: string;
  fftSize: number;
  smoothing: number;
  showGrid: boolean;
  showSpectrum: boolean;
  showWaterfall: boolean;
  refreshRate: number;
}

/** Performance metrics for monitoring */
export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  sampleLatency: number;
  bufferUtilization: number;
  droppedFrames: number;
}
