/**
 * @jest-environment node
 */
import {
  FftAnalyzer,
  SpectralAnalyzer,
  SpectralPatternClassifier,
  haarTransform,
  reconstructFromHaar,
  designButterworthLowpass,
  designChebyshevLowpass,
  IIRFilter,
  KalmanFilter1D,
  SignalStreamingPipeline,
  computeSpectrogram,
  createWindow,
} from '../src/index.js';
import type { DataChannelLike, WebSocketLike } from '../src/types.js';

class MockSocket implements WebSocketLike {
  readyState = 1;

  sent: any[] = [];

  onmessage: ((ev: { data: any }) => void) | null = null;

  send(data: any): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  trigger(data: any): void {
    this.onmessage?.({ data });
  }
}

class MockDataChannel implements DataChannelLike {
  readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'open';

  sent: any[] = [];

  onmessage: ((ev: { data: any }) => void) | null = null;

  send(data: any): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 'closed';
  }

  trigger(data: any): void {
    this.onmessage?.({ data });
  }
}

function generateSine(freq: number, sampleRate: number, length: number): Float64Array {
  const samples = new Float64Array(length);
  for (let n = 0; n < length; n += 1) {
    samples[n] = Math.sin((2 * Math.PI * freq * n) / sampleRate);
  }
  return samples;
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('signal processing toolkit', () => {
  it('identifies dominant tone via FFT', () => {
    const sampleRate = 4096;
    const analyzer = new FftAnalyzer(1024);
    const tone = generateSine(440, sampleRate, 1024);
    const frame = analyzer.analyze(tone, sampleRate);
    const maxIndex = frame.magnitudes.reduce((idx, mag, i, arr) => (mag > arr[idx] ? i : idx), 0);
    const peakFrequency = frame.frequencies[maxIndex];
    expect(peakFrequency).toBeCloseTo(440, -1);
  });

  it('reconstructs signal from Haar wavelets', () => {
    const original = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const transformed = haarTransform(original, 3);
    const reconstructed = reconstructFromHaar(transformed);
    expect(Array.from(reconstructed)).toEqual(Array.from(original));
  });

  it('attenuates high frequencies with Butterworth and Chebyshev filters', () => {
    const sampleRate = 8000;
    const length = 512;
    const low = generateSine(200, sampleRate, length);
    const high = generateSine(2200, sampleRate, length);
    const mixed = new Float64Array(length);
    for (let i = 0; i < length; i += 1) {
      mixed[i] = low[i] + high[i];
    }

    const butter = new IIRFilter(designButterworthLowpass(4, 500, sampleRate));
    const cheby = new IIRFilter(designChebyshevLowpass(4, 500, sampleRate, 0.5));

    const butterOut = butter.processBuffer(mixed);
    const chebyOut = cheby.processBuffer(mixed);

    const rms = (arr: Float64Array) => Math.sqrt(arr.reduce((acc, v) => acc + v * v, 0) / arr.length);
    const butterRms = rms(butterOut);
    const chebyRms = rms(chebyOut);
    const lowRms = rms(low);

    expect(butterRms).toBeLessThan(lowRms * 1.2);
    expect(chebyRms).toBeLessThan(lowRms * 1.3);
  });

  it('reduces noise via Kalman filter with deterministic sequence', () => {
    const truth = 5;
    const rand = lcg(42);
    const noisy = Array.from({ length: 200 }, () => truth + (rand() - 0.5) * 2);
    const kalman = new KalmanFilter1D(truth, 0.05, 1);
    const filtered = kalman.filterSeries(noisy);
    const noisyError = noisy.reduce((acc, v) => acc + Math.abs(v - truth), 0) / noisy.length;
    const filteredError = Array.from(filtered).reduce((acc, v) => acc + Math.abs(v - truth), 0) / filtered.length;
    expect(filteredError).toBeLessThan(noisyError);
  });

  it('extracts spectral metrics', () => {
    const sampleRate = 4000;
    const analyzer = new SpectralAnalyzer(new FftAnalyzer(512));
    const tone = generateSine(1000, sampleRate, 512);
    const metrics = analyzer.analyze(tone, sampleRate, [
      { name: 'sub', fromHz: 0, toHz: 400 },
      { name: 'mid', fromHz: 400, toHz: 1600 },
      { name: 'high', fromHz: 1600, toHz: 2000 },
    ]);
    expect(metrics.dominantFrequency).toBeGreaterThan(900);
    expect(metrics.bandPower.mid).toBeGreaterThan(metrics.bandPower.sub);
    expect(metrics.bandPower.mid).toBeGreaterThan(metrics.bandPower.high);
  });

  it('reduces spectral leakage with Hann windowing', () => {
    const sampleRate = 2048;
    const size = 256;
    const freq = 333; // Non-integer bin to trigger leakage
    const signal = generateSine(freq, sampleRate, size);
    const rectangular = new FftAnalyzer(size, { window: createWindow('rectangular', size) }).analyze(signal, sampleRate);
    const hann = new FftAnalyzer(size, { window: createWindow('hann', size) }).analyze(signal, sampleRate);

    const leakage = (frame: typeof rectangular) => {
      const peak = frame.magnitudes.reduce((max, mag) => Math.max(max, mag), 0);
      const sum = frame.magnitudes.reduce((acc, mag) => acc + mag, 0);
      return sum - peak;
    };

    expect(leakage(hann)).toBeLessThan(leakage(rectangular));
  });

  it('produces time-localized spectrogram slices', () => {
    const sampleRate = 1024;
    const fftSize = 128;
    const hopSize = 64;
    const toneA = generateSine(128, sampleRate, fftSize);
    const toneB = generateSine(256, sampleRate, fftSize);
    const combined = new Float64Array([...toneA, ...toneB]);

    const spectrogram = computeSpectrogram(combined, sampleRate, fftSize, { hopSize });
    const peakFreqPerSlice = spectrogram.slices.map((slice) => {
      const maxIdx = slice.magnitudes.reduce((idx, mag, i, arr) => (mag > arr[idx] ? i : idx), 0);
      return spectrogram.frequencyBins[maxIdx];
    });

    expect(peakFreqPerSlice[0]).toBeCloseTo(128, 0);
    expect(peakFreqPerSlice[peakFreqPerSlice.length - 1]).toBeCloseTo(256, 0);
  });

  it('classifies frames via spectral signatures', () => {
    const sampleRate = 2000;
    const fft = new FftAnalyzer(256);
    const analyzer = new SpectralAnalyzer(fft);
    const bands = [
      { name: 'low', fromHz: 0, toHz: 400 },
      { name: 'mid', fromHz: 400, toHz: 800 },
      { name: 'high', fromHz: 800, toHz: 1000 },
    ];

    const classifier = new SpectralPatternClassifier(analyzer, bands);
    const signal = generateSine(500, sampleRate, 256);
    const signatures = [
      { name: 'mid-tone', bandWeights: { mid: 10, low: 1, high: 1 } },
      { name: 'low-tone', bandWeights: { low: 10, mid: 1, high: 1 } },
    ];

    const result = classifier.classify(signal, sampleRate, signatures);
    expect(result.label).toBe('mid-tone');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('routes frames across WebSocket and WebRTC data channels', () => {
    const socket = new MockSocket();
    const channel = new MockDataChannel();
    const pipeline = new SignalStreamingPipeline({
      sampleRate: 8000,
      frameSize: 8,
      processors: [
        (frame) => frame.reduce((acc, v) => acc + v, 0) / frame.length,
        (frame) => Math.max(...frame),
      ],
    });

    const events: any[] = [];
    pipeline.on('event', (event) => events.push(event));
    pipeline.attachWebSocket(socket);
    pipeline.attachDataChannel(channel);

    socket.trigger(JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]));
    const processed = pipeline.ingestFrame(Float64Array.from([2, 2, 2, 2, 2, 2, 2, 2]));

    expect(events.filter((e) => e.type === 'processed').length).toBeGreaterThanOrEqual(2);
    expect(processed.results[0]).toBeCloseTo(2);
    expect(socket.sent.length).toBeGreaterThan(0);
    expect(channel.sent.length).toBeGreaterThan(0);
    pipeline.shutdown();
  });
});
