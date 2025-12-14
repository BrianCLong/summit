export type NumericArray = Float32Array | Float64Array | number[];

export type WindowKind = 'rectangular' | 'hann' | 'hamming';

export interface WindowFunction {
  kind: WindowKind;
  values: Float64Array;
}

export interface FrequencyDomainFrame {
  frequencies: Float64Array;
  magnitudes: Float64Array;
  phases: Float64Array;
  powerSpectralDensity: Float64Array;
}

export interface SpectralMetrics {
  dominantFrequency: number;
  spectralCentroid: number;
  spectralBandwidth: number;
  spectralFlatness: number;
  bandPower: Record<string, number>;
}

export interface WaveletLevel {
  approximation: Float64Array;
  detail: Float64Array;
}

export interface WaveletResult {
  levels: WaveletLevel[];
  residual: Float64Array;
}

export interface SpectrogramSlice {
  timeMs: number;
  magnitudes: Float64Array;
}

export interface Spectrogram {
  frequencyBins: Float64Array;
  slices: SpectrogramSlice[];
}

export interface FilterDesign {
  numerator: number[];
  denominator: number[];
}

export interface SignalProcessor {
  (frame: Float64Array): unknown;
}

export interface WebSocketLike {
  readyState: number;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  onmessage: ((ev: { data: any }) => void) | null;
  close(code?: number, reason?: string): void;
}

export interface DataChannelLike {
  readyState: 'connecting' | 'open' | 'closing' | 'closed';
  send(data: string | ArrayBuffer | ArrayBufferView | Blob): void;
  onmessage: ((ev: { data: any }) => void) | null;
  close(): void;
}

export interface PipelineEvent<T> {
  type: 'raw' | 'processed';
  payload: T;
  timestamp: number;
}

export interface SpectralSignature {
  name: string;
  bandWeights: Record<string, number>;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
  distances: Record<string, number>;
}
