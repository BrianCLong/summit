/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SIGINTDashboard } from '../SIGINTDashboard';
import { SignalStreamList } from '../SignalStreamList';
import { MASINTOverlayPanel } from '../MASINTOverlayPanel';
import { AgenticDemodulationPanel } from '../AgenticDemodulationPanel';
import type { SignalStream, MASINTOverlay, DemodulationTask } from '../types';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = MockResizeObserver as any;

// Mock WebGL context
const mockWebGLContext = {
  createShader: jest.fn(() => ({})),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  createProgram: jest.fn(() => ({})),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  createBuffer: jest.fn(() => ({})),
  enable: jest.fn(),
  blendFunc: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  useProgram: jest.fn(),
  getUniformLocation: jest.fn(() => ({})),
  getAttribLocation: jest.fn(() => 0),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  drawArrays: jest.fn(),
  viewport: jest.fn(),
  deleteBuffer: jest.fn(),
  deleteProgram: jest.fn(),
  deleteShader: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl') return mockWebGLContext;
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      font: '',
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      arc: jest.fn(),
      fill: jest.fn(),
      scale: jest.fn(),
    };
  }
  return null;
}) as any;

// Test fixtures
const mockStreams: SignalStream[] = [
  {
    id: 'test-stream-1',
    name: 'Test Stream Alpha',
    band: 'VHF',
    centerFrequency: 150e6,
    bandwidth: 25000,
    sampleRate: 48000,
    modulation: 'FM',
    confidence: 'HIGH',
    samples: [],
    active: true,
    geolocation: { lat: 40.7128, lng: -74.006, accuracy: 25 },
  },
  {
    id: 'test-stream-2',
    name: 'Test Stream Beta',
    band: 'HF',
    centerFrequency: 14e6,
    bandwidth: 3000,
    sampleRate: 44100,
    modulation: 'AM',
    confidence: 'MEDIUM',
    samples: [],
    active: false,
  },
];

const mockMASINTOverlays: MASINTOverlay[] = [
  {
    id: 'masint-1',
    sensorType: 'RADAR',
    coverage: { center: { lat: 40.0, lng: -74.0 }, radiusKm: 100 },
    detections: [
      {
        id: 'det-1',
        timestamp: Date.now() - 30000,
        type: 'AIRCRAFT',
        location: { lat: 40.5, lng: -73.8 },
        confidence: 0.95,
        classification: 'Commercial Aircraft',
        metadata: {},
      },
    ],
    status: 'ACTIVE',
    lastUpdate: Date.now(),
  },
];

const mockDemodTasks: DemodulationTask[] = [
  {
    id: 'task-1',
    signalId: 'test-stream-1',
    status: 'ANALYZING',
    progress: 0.45,
    startedAt: Date.now() - 30000,
    agentId: 'agent-test-1',
  },
  {
    id: 'task-2',
    signalId: 'test-stream-2',
    status: 'COMPLETED',
    progress: 1,
    startedAt: Date.now() - 120000,
    completedAt: Date.now() - 60000,
    agentId: 'agent-test-2',
    result: {
      modulation: 'AM',
      symbolRate: 8000,
      carrierFrequency: 14e6,
      confidence: 0.92,
      spectralSignature: [],
      recommendations: ['Continue monitoring'],
    },
  },
];

describe('SIGINTDashboard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SIGINTDashboard />);
    expect(screen.getByText(/SIGINT/i)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('displays connection status', () => {
    render(<SIGINTDashboard />);
    // Initially shows disconnected since mock socket doesn't trigger connect
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  it('renders view mode selector', () => {
    render(<SIGINTDashboard />);
    expect(screen.getByText('Waveform')).toBeInTheDocument();
    expect(screen.getByText('Spectrum')).toBeInTheDocument();
    expect(screen.getByText('Combined')).toBeInTheDocument();
  });

  it('switches view modes on click', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SIGINTDashboard />);

    const spectrumBtn = screen.getByText('Spectrum');
    await user.click(spectrumBtn);

    // Spectrum button should now be active (has cyan background)
    expect(spectrumBtn).toHaveClass('bg-cyan-600');
  });

  it('displays status bar with metrics', () => {
    render(<SIGINTDashboard />);
    expect(screen.getByText(/active streams/i)).toBeInTheDocument();
    expect(screen.getByText(/MASINT detections/i)).toBeInTheDocument();
    expect(screen.getByText(/demod tasks running/i)).toBeInTheDocument();
  });
});

describe('SignalStreamList', () => {
  it('renders stream list correctly', () => {
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    expect(screen.getByText('Signal Streams')).toBeInTheDocument();
    expect(screen.getByText('Test Stream Alpha')).toBeInTheDocument();
    expect(screen.getByText('Test Stream Beta')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    const user = userEvent.setup();
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search streams...');
    await user.type(searchInput, 'Alpha');

    expect(screen.getByText('Test Stream Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Test Stream Beta')).not.toBeInTheDocument();
  });

  it('filters by frequency band', async () => {
    const user = userEvent.setup();
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    const bandSelect = screen.getByRole('combobox');
    await user.selectOptions(bandSelect, 'HF');

    expect(screen.queryByText('Test Stream Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Test Stream Beta')).toBeInTheDocument();
  });

  it('filters active only', async () => {
    const user = userEvent.setup();
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    const activeCheckbox = screen.getByLabelText('Active only');
    await user.click(activeCheckbox);

    expect(screen.getByText('Test Stream Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Test Stream Beta')).not.toBeInTheDocument();
  });

  it('calls onSelectStream when stream clicked', async () => {
    const user = userEvent.setup();
    const onSelectStream = jest.fn();
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={onSelectStream}
      />
    );

    await user.click(screen.getByText('Test Stream Alpha'));
    expect(onSelectStream).toHaveBeenCalledWith(mockStreams[0]);
  });

  it('shows geolocation when available', () => {
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    expect(screen.getByText(/40\.7128.*-74\.006/)).toBeInTheDocument();
  });

  it('handles subscribe/unsubscribe', async () => {
    const user = userEvent.setup();
    const onSubscribe = jest.fn();
    const onUnsubscribe = jest.fn();

    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
        onSubscribe={onSubscribe}
        onUnsubscribe={onUnsubscribe}
        subscribedIds={new Set()}
      />
    );

    // Find and click subscribe button
    const subscribeButtons = screen.getAllByTitle('Subscribe');
    await user.click(subscribeButtons[0]);

    expect(onSubscribe).toHaveBeenCalledWith('test-stream-1');
  });
});

describe('MASINTOverlayPanel', () => {
  it('renders overlays correctly', () => {
    render(
      <MASINTOverlayPanel
        overlays={mockMASINTOverlays}
      />
    );

    expect(screen.getByText('MASINT Overlays')).toBeInTheDocument();
    expect(screen.getByText(/RADAR/i)).toBeInTheDocument();
    expect(screen.getByText('masint-1')).toBeInTheDocument();
  });

  it('displays detection count', () => {
    render(
      <MASINTOverlayPanel
        overlays={mockMASINTOverlays}
      />
    );

    expect(screen.getByText('1 detections')).toBeInTheDocument();
  });

  it('shows status indicators', () => {
    render(
      <MASINTOverlayPanel
        overlays={mockMASINTOverlays}
      />
    );

    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('expands to show detections on click', async () => {
    const user = userEvent.setup();
    render(
      <MASINTOverlayPanel
        overlays={mockMASINTOverlays}
        onSelectOverlay={jest.fn()}
      />
    );

    await user.click(screen.getByText('masint-1'));
    expect(screen.getByText('Commercial Aircraft')).toBeInTheDocument();
  });

  it('shows empty state when no overlays', () => {
    render(
      <MASINTOverlayPanel
        overlays={[]}
      />
    );

    expect(screen.getByText('No MASINT overlays available')).toBeInTheDocument();
  });
});

describe('AgenticDemodulationPanel', () => {
  it('renders tasks correctly', () => {
    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
      />
    );

    expect(screen.getByText('Agentic Demodulation')).toBeInTheDocument();
    expect(screen.getByText('test-stream-1')).toBeInTheDocument();
  });

  it('shows active vs completed tasks', () => {
    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
      />
    );

    expect(screen.getByText(/Active Tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Results/i)).toBeInTheDocument();
  });

  it('displays task progress', () => {
    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
      />
    );

    expect(screen.getByText('Analyzing')).toBeInTheDocument();
  });

  it('shows demodulation results', () => {
    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
      />
    );

    expect(screen.getByText('AM')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('opens new task dialog', async () => {
    const user = userEvent.setup();
    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
        onStartDemodulation={jest.fn()}
      />
    );

    await user.click(screen.getByText('New Task'));
    expect(screen.getByText('Select signal stream:')).toBeInTheDocument();
  });

  it('calls onStartDemodulation with selected stream', async () => {
    const user = userEvent.setup();
    const onStartDemodulation = jest.fn();

    render(
      <AgenticDemodulationPanel
        tasks={[]}
        availableStreams={mockStreams}
        onStartDemodulation={onStartDemodulation}
      />
    );

    await user.click(screen.getByText('New Task'));

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'test-stream-1');

    await user.click(screen.getByText('Start'));
    expect(onStartDemodulation).toHaveBeenCalledWith('test-stream-1');
  });

  it('calls onCancelTask when cancel clicked', async () => {
    const user = userEvent.setup();
    const onCancelTask = jest.fn();

    render(
      <AgenticDemodulationPanel
        tasks={mockDemodTasks}
        availableStreams={mockStreams}
        onCancelTask={onCancelTask}
      />
    );

    const cancelButtons = screen.getAllByTitle('Cancel task');
    await user.click(cancelButtons[0]);

    expect(onCancelTask).toHaveBeenCalledWith('task-1');
  });

  it('shows empty state when no tasks', () => {
    render(
      <AgenticDemodulationPanel
        tasks={[]}
        availableStreams={mockStreams}
      />
    );

    expect(screen.getByText('No demodulation tasks')).toBeInTheDocument();
  });
});

describe('Performance', () => {
  it('renders within acceptable time for large datasets', () => {
    const largeStreams: SignalStream[] = Array.from({ length: 100 }, (_, i) => ({
      id: `stream-${i}`,
      name: `Stream ${i}`,
      band: 'VHF' as const,
      centerFrequency: 150e6 + i * 25000,
      bandwidth: 25000,
      sampleRate: 48000,
      modulation: 'FM' as const,
      confidence: 'HIGH' as const,
      samples: [],
      active: i % 2 === 0,
    }));

    const startTime = performance.now();
    render(
      <SignalStreamList
        streams={largeStreams}
        onSelectStream={jest.fn()}
      />
    );
    const renderTime = performance.now() - startTime;

    // Should render under 500ms (p95 target)
    expect(renderTime).toBeLessThan(500);
  });
});

describe('Accessibility', () => {
  it('has proper ARIA labels', () => {
    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={jest.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const onSelectStream = jest.fn();

    render(
      <SignalStreamList
        streams={mockStreams}
        onSelectStream={onSelectStream}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search streams...');
    await user.tab();
    expect(searchInput).toHaveFocus();
  });
});

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  it('renders on mobile viewport', () => {
    render(<SIGINTDashboard />);
    expect(screen.getByText(/SIGINT/i)).toBeInTheDocument();
  });
});
