# @intelgraph/signal-processing

A real-time signal processing toolkit with FFT analysis (fft.js), Haar wavelets, Butterworth/Chebyshev IIR filter design, Kalman denoising, spectral metrics, spectrogram generation, spectral classification, and a WebSocket/WebRTC-friendly streaming pipeline.

## Features
- **FFT**: Windowed FFT with Hann/Hamming/rectangular options plus magnitudes, phases, PSD, and frequency bins via `fft.js`.
- **Wavelets**: Multi-level Haar transform with lossless reconstruction helpers.
- **Digital filters**: Low-pass Butterworth and Chebyshev Type-I designers mapped through the bilinear transform and an IIR runtime.
- **Denoising**: Lightweight 1D Kalman filter for streaming estimates.
- **Spectral analytics**: Dominant frequency, centroid, bandwidth, flatness, band power utilities, and STFT-based spectrograms.
- **Pattern recognition**: Band-power signature classifier for quick matching against spectral templates.
- **Streaming**: WebSocket/DataChannel-aware pipeline that runs processors on incoming frames and rebroadcasts processed payloads.

## Usage
```ts
import {
  FftAnalyzer,
  SpectralAnalyzer,
  haarTransform,
  reconstructFromHaar,
  designButterworthLowpass,
  IIRFilter,
  KalmanFilter1D,
  SignalStreamingPipeline,
} from '@intelgraph/signal-processing';

const fft = new FftAnalyzer(1024);
const spectrum = fft.analyze(samples, sampleRate);
const spectral = new SpectralAnalyzer(fft).analyze(samples, sampleRate);

const filter = new IIRFilter(designButterworthLowpass(4, 500, 8000));
const filtered = filter.processBuffer(samples);

const kalman = new KalmanFilter1D(0, 0.01, 1);
const smoothed = kalman.filterSeries(samples);

// Spectrogram (time-frequency) and classification
const spectrogram = computeSpectrogram(samples, 8000, 256, { hopSize: 128 });
const classifier = new SpectralPatternClassifier(
  new SpectralAnalyzer(new FftAnalyzer(256)),
  [
    { name: 'low', fromHz: 0, toHz: 400 },
    { name: 'mid', fromHz: 400, toHz: 1600 },
  ],
);
const signature = classifier.classify(samples, 8000, [{ name: 'example', bandWeights: { mid: 10, low: 1 } }]);

const pipeline = new SignalStreamingPipeline({
  sampleRate: 8000,
  frameSize: 1024,
  processors: [(frame) => new SpectralAnalyzer(fft).analyze(frame, 8000)],
});
pipeline.attachWebSocket(webSocketInstance);
pipeline.attachDataChannel(dataChannelInstance);
```

## Testing
Run the dedicated suite:
```bash
npx jest --runTestsByPath packages/signal-processing/__tests__/signal-processing.test.ts
```
