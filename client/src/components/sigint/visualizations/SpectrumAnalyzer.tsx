/**
 * SpectrumAnalyzer - FFT-based frequency spectrum display
 * Real-time spectrum analysis with peak detection and markers.
 */
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { SignalSample, FrequencyBand } from '../types';

interface SpectrumAnalyzerProps {
  samples: SignalSample[];
  fftSize?: number;
  minDecibels?: number;
  maxDecibels?: number;
  smoothing?: number;
  showPeaks?: boolean;
  frequencyRange?: { min: number; max: number };
  className?: string;
}

const FREQUENCY_BANDS: Record<FrequencyBand, { min: number; max: number; color: string }> = {
  VLF: { min: 3, max: 30000, color: '#ff6b6b' },
  LF: { min: 30000, max: 300000, color: '#ffa502' },
  MF: { min: 300000, max: 3000000, color: '#ffd43b' },
  HF: { min: 3000000, max: 30000000, color: '#69db7c' },
  VHF: { min: 30000000, max: 300000000, color: '#4dabf7' },
  UHF: { min: 300000000, max: 3000000000, color: '#9775fa' },
  SHF: { min: 3000000000, max: 30000000000, color: '#f783ac' },
  EHF: { min: 30000000000, max: 300000000000, color: '#e599f7' },
};

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  samples,
  fftSize = 2048,
  minDecibels = -90,
  maxDecibels = -10,
  smoothing = 0.8,
  showPeaks = true,
  frequencyRange,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const prevSpectrumRef = useRef<Float32Array | null>(null);
  const peaksRef = useRef<{ freq: number; db: number; x: number }[]>([]);

  // Perform FFT on sample data
  const computeFFT = useCallback(
    (data: Float32Array): Float32Array => {
      const n = Math.min(data.length, fftSize);
      const real = new Float32Array(n);
      const imag = new Float32Array(n);

      // Apply Hann window
      for (let i = 0; i < n; i++) {
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
        real[i] = (data[i] || 0) * window;
      }

      // Simple DFT (for real-time, use Web Audio API's AnalyserNode in production)
      const spectrum = new Float32Array(n / 2);
      for (let k = 0; k < n / 2; k++) {
        let sumReal = 0;
        let sumImag = 0;
        for (let t = 0; t < n; t++) {
          const angle = (2 * Math.PI * k * t) / n;
          sumReal += real[t] * Math.cos(angle);
          sumImag -= real[t] * Math.sin(angle);
        }
        const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag) / n;
        spectrum[k] = 20 * Math.log10(magnitude + 1e-10);
      }

      return spectrum;
    },
    [fftSize]
  );

  // Detect peaks in spectrum
  const detectPeaks = useCallback(
    (spectrum: Float32Array, canvasWidth: number): { freq: number; db: number; x: number }[] => {
      const peaks: { freq: number; db: number; x: number }[] = [];
      const threshold = maxDecibels - 20;
      const minPeakDistance = 10;

      for (let i = 2; i < spectrum.length - 2; i++) {
        const val = spectrum[i];
        if (
          val > threshold &&
          val > spectrum[i - 1] &&
          val > spectrum[i + 1] &&
          val > spectrum[i - 2] &&
          val > spectrum[i + 2]
        ) {
          const x = (i / spectrum.length) * canvasWidth;
          const freq = (i / spectrum.length) * 22050; // Assuming 44.1kHz sample rate

          // Skip if too close to existing peak
          if (peaks.length > 0 && x - peaks[peaks.length - 1].x < minPeakDistance) {
            if (val > peaks[peaks.length - 1].db) {
              peaks[peaks.length - 1] = { freq, db: val, x };
            }
            continue;
          }

          peaks.push({ freq, db: val, x });
        }
      }

      return peaks.slice(0, 10); // Limit to top 10 peaks
    },
    [maxDecibels]
  );

  // Render spectrum
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const dbRange = maxDecibels - minDecibels;

    // Clear canvas
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#1e2832';
    ctx.lineWidth = 1;

    // Horizontal grid lines (dB)
    for (let db = minDecibels; db <= maxDecibels; db += 10) {
      const y = height - ((db - minDecibels) / dbRange) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = '#4a5568';
      ctx.font = '10px monospace';
      ctx.fillText(`${db} dB`, 4, y - 2);
    }

    // Vertical grid lines (frequency)
    const freqMarkers = [100, 500, 1000, 5000, 10000, 20000];
    freqMarkers.forEach((freq) => {
      const x = (freq / 22050) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = '#4a5568';
      ctx.fillText(formatFreq(freq), x + 2, height - 4);
    });

    if (samples.length === 0) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Convert samples to Float32Array for FFT
    const sampleData = new Float32Array(samples.map((s) => s.amplitude));
    let spectrum = computeFFT(sampleData);

    // Apply smoothing with previous frame
    if (prevSpectrumRef.current && prevSpectrumRef.current.length === spectrum.length) {
      for (let i = 0; i < spectrum.length; i++) {
        spectrum[i] = smoothing * prevSpectrumRef.current[i] + (1 - smoothing) * spectrum[i];
      }
    }
    prevSpectrumRef.current = spectrum.slice();

    // Draw spectrum bars with gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.5, '#00ccff');
    gradient.addColorStop(1, '#ff6b6b');

    const barWidth = Math.max(1, width / spectrum.length);

    ctx.fillStyle = gradient;
    for (let i = 0; i < spectrum.length; i++) {
      const db = Math.max(minDecibels, Math.min(maxDecibels, spectrum[i]));
      const barHeight = ((db - minDecibels) / dbRange) * height;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth - 0.5, barHeight);
    }

    // Draw peaks if enabled
    if (showPeaks) {
      peaksRef.current = detectPeaks(spectrum, width);

      ctx.fillStyle = '#ff6b6b';
      ctx.strokeStyle = '#ff6b6b';
      peaksRef.current.forEach((peak) => {
        const y = height - ((peak.db - minDecibels) / dbRange) * height;

        // Peak marker
        ctx.beginPath();
        ctx.arc(peak.x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Peak label
        ctx.font = '9px monospace';
        ctx.fillText(`${formatFreq(peak.freq)}`, peak.x - 15, y - 8);
      });
    }

    animationRef.current = requestAnimationFrame(render);
  }, [samples, fftSize, minDecibels, maxDecibels, smoothing, showPeaks, computeFFT, detectPeaks]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const observer = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    handleResize();

    return () => observer.disconnect();
  }, []);

  // Start/stop animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div className={`relative w-full h-full min-h-[150px] ${className || ''}`}>
      <canvas ref={canvasRef} className="w-full h-full rounded-lg" />
      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-2">
        {showPeaks && peaksRef.current.length > 0 && (
          <span className="text-xs font-mono text-red-400 bg-black/60 px-2 py-0.5 rounded">
            {peaksRef.current.length} peaks
          </span>
        )}
      </div>
    </div>
  );
};

function formatFreq(hz: number): string {
  if (hz >= 1000000) return `${(hz / 1000000).toFixed(1)}MHz`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)}kHz`;
  return `${hz}Hz`;
}

export default SpectrumAnalyzer;
