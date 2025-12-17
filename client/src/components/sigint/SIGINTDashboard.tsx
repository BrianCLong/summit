/**
 * SIGINTDashboard - Main dashboard container
 * Signals Intelligence analysis dashboard with real-time waveforms,
 * MASINT overlays, and agentic demodulation capabilities.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { WaveformRenderer } from './visualizations/WaveformRenderer';
import { SpectrumAnalyzer } from './visualizations/SpectrumAnalyzer';
import { MASINTOverlayPanel } from './MASINTOverlayPanel';
import { AgenticDemodulationPanel } from './AgenticDemodulationPanel';
import { SignalStreamList } from './SignalStreamList';
import { useRedisStream } from './hooks/useRedisStream';
import type {
  SignalStream,
  MASINTOverlay,
  DemodulationTask,
  DemodulationResult,
  PerformanceMetrics,
  SIGINTFilters,
} from './types';

interface SIGINTDashboardProps {
  streamKey?: string;
  initialFilters?: Partial<SIGINTFilters>;
  onDemodulationComplete?: (result: DemodulationResult) => void;
  className?: string;
}

type ViewMode = 'waveform' | 'spectrum' | 'waterfall' | 'combined';
type PanelLayout = 'default' | 'analysis' | 'monitoring';

// Demo data generators for testing
const generateDemoStreams = (): SignalStream[] => [
  {
    id: 'sig-001',
    name: 'SAT-COMM Alpha',
    band: 'UHF',
    centerFrequency: 450e6,
    bandwidth: 25e3,
    sampleRate: 48000,
    modulation: 'FM',
    confidence: 'HIGH',
    samples: [],
    active: true,
    geolocation: { lat: 38.8977, lng: -77.0365, accuracy: 50 },
  },
  {
    id: 'sig-002',
    name: 'HF-BROADCAST Beta',
    band: 'HF',
    centerFrequency: 15e6,
    bandwidth: 6e3,
    sampleRate: 44100,
    modulation: 'AM',
    confidence: 'MEDIUM',
    samples: [],
    active: true,
  },
  {
    id: 'sig-003',
    name: 'MILSAT Gamma',
    band: 'SHF',
    centerFrequency: 8e9,
    bandwidth: 36e6,
    sampleRate: 100000,
    modulation: 'PSK',
    confidence: 'HIGH',
    samples: [],
    active: true,
    geolocation: { lat: 51.5074, lng: -0.1278, accuracy: 100 },
  },
  {
    id: 'sig-004',
    name: 'Unknown Emitter',
    band: 'VHF',
    centerFrequency: 156.8e6,
    bandwidth: 16e3,
    sampleRate: 48000,
    modulation: 'UNKNOWN',
    confidence: 'LOW',
    samples: [],
    active: false,
  },
];

const generateDemoMASINT = (): MASINTOverlay[] => [
  {
    id: 'masint-radar-01',
    sensorType: 'RADAR',
    coverage: { center: { lat: 38.9, lng: -77.0 }, radiusKm: 150 },
    detections: [
      {
        id: 'det-001',
        timestamp: Date.now() - 60000,
        type: 'AIRCRAFT',
        location: { lat: 39.1, lng: -76.8 },
        confidence: 0.92,
        classification: 'Commercial Aircraft',
        metadata: { altitude: 35000, speed: 450 },
      },
    ],
    status: 'ACTIVE',
    lastUpdate: Date.now(),
  },
  {
    id: 'masint-acoustic-01',
    sensorType: 'ACOUSTIC',
    coverage: { center: { lat: 36.8, lng: -76.0 }, radiusKm: 50 },
    detections: [
      {
        id: 'det-002',
        timestamp: Date.now() - 120000,
        type: 'VESSEL',
        location: { lat: 36.85, lng: -75.95 },
        confidence: 0.78,
        classification: 'Submarine Contact',
        metadata: { bearing: 45, range: 12 },
      },
    ],
    status: 'ACTIVE',
    lastUpdate: Date.now() - 30000,
  },
  {
    id: 'masint-seismic-01',
    sensorType: 'SEISMIC',
    coverage: { center: { lat: 37.2, lng: -115.8 }, radiusKm: 200 },
    detections: [],
    status: 'DEGRADED',
    lastUpdate: Date.now() - 300000,
  },
];

const generateDemoTasks = (): DemodulationTask[] => [
  {
    id: 'task-001',
    signalId: 'sig-001',
    status: 'DEMODULATING',
    progress: 0.67,
    startedAt: Date.now() - 45000,
    agentId: 'agent-demod-alpha',
  },
  {
    id: 'task-002',
    signalId: 'sig-002',
    status: 'COMPLETED',
    progress: 1,
    startedAt: Date.now() - 180000,
    completedAt: Date.now() - 120000,
    agentId: 'agent-demod-beta',
    result: {
      modulation: 'AM',
      symbolRate: 8000,
      carrierFrequency: 15e6,
      confidence: 0.94,
      decodedPayload: {
        format: 'RTTY',
        content: '[ENCRYPTED TRAFFIC]',
        checksum: true,
      },
      spectralSignature: [],
      recommendations: [
        'Signal matches known broadcast pattern',
        'Recommend continued monitoring',
      ],
    },
  },
];

export const SIGINTDashboard: React.FC<SIGINTDashboardProps> = ({
  streamKey = 'sigint:primary',
  initialFilters: _initialFilters,
  onDemodulationComplete,
  className,
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [panelLayout, setPanelLayout] = useState<PanelLayout>('default');
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Demo data (in production, use useRedisStream)
  const [demoStreams] = useState(generateDemoStreams);
  const [masintOverlays] = useState(generateDemoMASINT);
  const [demodTasks, setDemodTasks] = useState(generateDemoTasks);

  // Redis stream hook for real-time data
  const {
    samples,
    isConnected,
    streams: liveStreams,
    subscribe,
    unsubscribe,
  } = useRedisStream({
    streamKey,
    bufferSize: 2048,
    maxLatency: 500,
  });

  // Use live streams if available, otherwise demo data
  const streams = liveStreams.length > 0 ? liveStreams : demoStreams;

  // Selected stream data
  const selectedStream = useMemo(
    () => streams.find((s) => s.id === selectedStreamId) || null,
    [streams, selectedStreamId]
  );

  // Generate demo samples for visualization if no live data
  const displaySamples = useMemo(() => {
    if (samples.length > 0) return samples;

    // Generate synthetic waveform for demo
    const now = Date.now();
    return Array.from({ length: 1024 }, (_, i) => {
      const t = i / 1024;
      const freq1 = Math.sin(2 * Math.PI * 5 * t + now / 1000);
      const freq2 = Math.sin(2 * Math.PI * 12 * t + now / 500) * 0.5;
      const noise = (Math.random() - 0.5) * 0.2;
      return {
        timestamp: now - (1024 - i),
        frequency: 1000 + i * 10,
        amplitude: (freq1 + freq2 + noise) * 0.5,
        phase: Math.atan2(freq2, freq1),
        iq: { i: freq1, q: freq2 },
      };
    });
  }, [samples]);

  // Handlers
  const handleSelectStream = useCallback((stream: SignalStream) => {
    setSelectedStreamId(stream.id);
  }, []);

  const handleSubscribe = useCallback(
    (streamId: string) => {
      subscribe(streamId);
      setSubscribedIds((prev) => new Set([...prev, streamId]));
    },
    [subscribe]
  );

  const handleUnsubscribe = useCallback(
    (streamId: string) => {
      unsubscribe(streamId);
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        next.delete(streamId);
        return next;
      });
    },
    [unsubscribe]
  );

  const handleStartDemodulation = useCallback((streamId: string) => {
    const newTask: DemodulationTask = {
      id: `task-${Date.now()}`,
      signalId: streamId,
      status: 'QUEUED',
      progress: 0,
      startedAt: Date.now(),
      agentId: `agent-demod-${Math.random().toString(36).slice(2, 8)}`,
    };
    setDemodTasks((prev) => [newTask, ...prev]);
  }, []);

  const handleCancelTask = useCallback((taskId: string) => {
    setDemodTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleViewResult = useCallback(
    (result: DemodulationResult) => {
      onDemodulationComplete?.(result);
    },
    [onDemodulationComplete]
  );

  return (
    <div
      className={`flex flex-col h-full bg-slate-950 text-slate-100 ${className || ''}`}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-cyan-400">SIGINT</span> Dashboard
          </h1>
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded ${
              isConnected
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {metrics && (
            <span className="text-xs text-slate-400 font-mono">
              {metrics.fps} FPS | {metrics.sampleLatency.toFixed(0)}ms latency
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex items-center bg-slate-800 rounded-md p-0.5">
            {(['waveform', 'spectrum', 'combined'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Layout selector */}
          <select
            value={panelLayout}
            onChange={(e) => setPanelLayout(e.target.value as PanelLayout)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="default">Default Layout</option>
            <option value="analysis">Analysis Focus</option>
            <option value="monitoring">Monitoring</option>
          </select>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Stream list */}
        <aside className="w-80 flex-shrink-0 border-r border-slate-800 overflow-hidden">
          <SignalStreamList
            streams={streams}
            selectedStreamId={selectedStreamId}
            onSelectStream={handleSelectStream}
            onSubscribe={handleSubscribe}
            onUnsubscribe={handleUnsubscribe}
            subscribedIds={subscribedIds}
            className="h-full"
          />
        </aside>

        {/* Center - Visualizations */}
        <main className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Waveform display */}
          {(viewMode === 'waveform' || viewMode === 'combined') && (
            <div
              className={`bg-slate-900 rounded-lg border border-slate-800 overflow-hidden ${
                viewMode === 'combined' ? 'flex-1' : 'h-full'
              }`}
            >
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                <span className="text-sm font-medium">
                  Waveform {selectedStream && `- ${selectedStream.name}`}
                </span>
                {selectedStream && (
                  <span className="text-xs text-slate-400">
                    {(selectedStream.centerFrequency / 1e6).toFixed(3)} MHz |{' '}
                    {selectedStream.modulation}
                  </span>
                )}
              </div>
              <div className="h-[calc(100%-40px)]">
                <WaveformRenderer
                  samples={displaySamples}
                  onMetrics={setMetrics}
                  config={{
                    backgroundColor: '#0f172a',
                    waveformColor: '#22d3ee',
                    gridColor: '#334155',
                    showGrid: true,
                  }}
                />
              </div>
            </div>
          )}

          {/* Spectrum analyzer */}
          {(viewMode === 'spectrum' || viewMode === 'combined') && (
            <div
              className={`bg-slate-900 rounded-lg border border-slate-800 overflow-hidden ${
                viewMode === 'combined' ? 'h-48 flex-shrink-0' : 'h-full'
              }`}
            >
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                <span className="text-sm font-medium">Spectrum Analysis</span>
              </div>
              <div className="h-[calc(100%-40px)]">
                <SpectrumAnalyzer
                  samples={displaySamples}
                  showPeaks={true}
                  smoothing={0.85}
                />
              </div>
            </div>
          )}
        </main>

        {/* Right sidebar - MASINT & Demodulation */}
        <aside className="w-96 flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MASINTOverlayPanel
              overlays={masintOverlays}
              className="h-1/2 border-b border-slate-800"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <AgenticDemodulationPanel
              tasks={demodTasks}
              availableStreams={streams}
              onStartDemodulation={handleStartDemodulation}
              onCancelTask={handleCancelTask}
              onViewResult={handleViewResult}
              className="h-full"
            />
          </div>
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-cyan-400 font-medium">{streams.filter((s) => s.active).length}</span>{' '}
            active streams
          </span>
          <span>
            <span className="text-amber-400 font-medium">
              {masintOverlays.reduce((sum, o) => sum + o.detections.length, 0)}
            </span>{' '}
            MASINT detections
          </span>
          <span>
            <span className="text-purple-400 font-medium">
              {demodTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'FAILED').length}
            </span>{' '}
            demod tasks running
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Stream: {streamKey}</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono">{new Date().toISOString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default SIGINTDashboard;
