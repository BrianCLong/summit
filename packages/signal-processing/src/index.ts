export { FftAnalyzer, type FftOptions } from './fft.js';
export { haarTransform, reconstructFromHaar } from './wavelet.js';
export {
  designButterworthLowpass,
  designChebyshevLowpass,
  IIRFilter,
} from './filters.js';
export { KalmanFilter1D } from './kalman.js';
export { SpectralAnalyzer, type BandDefinition } from './spectral.js';
export { SignalStreamingPipeline, type PipelineOptions, type ProcessedFrame } from './streaming.js';
export { computeSpectrogram, type SpectrogramOptions } from './stft.js';
export { SpectralPatternClassifier } from './pattern.js';
export {
  createWindow,
  applyWindow,
  normalizeFrame as normalizeFrameToSize,
} from './window.js';
export type {
  FrequencyDomainFrame,
  SpectralMetrics,
  WaveletResult,
  WaveletLevel,
  NumericArray,
  WindowFunction,
  WindowKind,
  Spectrogram,
  SpectralSignature,
  ClassificationResult,
  SpectrogramSlice,
} from './types.js';
