/**
 * SIGINT Dashboard Components
 * Signals Intelligence analysis dashboard with real-time waveforms,
 * MASINT overlays, and agentic demodulation capabilities.
 */

// Main dashboard
export { SIGINTDashboard } from './SIGINTDashboard';
export { default } from './SIGINTDashboard';

// Visualization components
export { WaveformRenderer } from './visualizations/WaveformRenderer';
export { SpectrumAnalyzer } from './visualizations/SpectrumAnalyzer';

// Panel components
export { MASINTOverlayPanel } from './MASINTOverlayPanel';
export { AgenticDemodulationPanel } from './AgenticDemodulationPanel';
export { SignalStreamList } from './SignalStreamList';

// Hooks
export { useRedisStream } from './hooks/useRedisStream';

// Types
export type {
  FrequencyBand,
  ModulationType,
  ConfidenceLevel,
  SignalSample,
  WaveformPoint,
  SignalStream,
  MASINTOverlay,
  MASINTDetection,
  DemodulationTask,
  DemodulationResult,
  SIGINTFilters,
  SIGINTDashboardState,
  WaveformRendererConfig,
  PerformanceMetrics,
} from './types';
