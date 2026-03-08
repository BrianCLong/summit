"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment jsdom
 */
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const SIGINTDashboard_1 = require("../SIGINTDashboard");
const SignalStreamList_1 = require("../SignalStreamList");
const MASINTOverlayPanel_1 = require("../MASINTOverlayPanel");
const AgenticDemodulationPanel_1 = require("../AgenticDemodulationPanel");
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
global.ResizeObserver = MockResizeObserver;
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
    if (contextType === 'webgl')
        return mockWebGLContext;
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
});
// Test fixtures
const mockStreams = [
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
const mockMASINTOverlays = [
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
const mockDemodTasks = [
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
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        expect(react_2.screen.getByText(/SIGINT/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
    it('displays connection status', () => {
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        // Initially shows disconnected since mock socket doesn't trigger connect
        expect(react_2.screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });
    it('renders view mode selector', () => {
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        expect(react_2.screen.getByText('Waveform')).toBeInTheDocument();
        expect(react_2.screen.getByText('Spectrum')).toBeInTheDocument();
        expect(react_2.screen.getByText('Combined')).toBeInTheDocument();
    });
    it('switches view modes on click', async () => {
        const user = user_event_1.default.setup({ advanceTimers: jest.advanceTimersByTime });
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        const spectrumBtn = react_2.screen.getByText('Spectrum');
        await user.click(spectrumBtn);
        // Spectrum button should now be active (has cyan background)
        expect(spectrumBtn).toHaveClass('bg-cyan-600');
    });
    it('displays status bar with metrics', () => {
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        expect(react_2.screen.getByText(/active streams/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/MASINT detections/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/demod tasks running/i)).toBeInTheDocument();
    });
});
describe('SignalStreamList', () => {
    it('renders stream list correctly', () => {
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        expect(react_2.screen.getByText('Signal Streams')).toBeInTheDocument();
        expect(react_2.screen.getByText('Test Stream Alpha')).toBeInTheDocument();
        expect(react_2.screen.getByText('Test Stream Beta')).toBeInTheDocument();
    });
    it('filters by search query', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        const searchInput = react_2.screen.getByPlaceholderText('Search streams...');
        await user.type(searchInput, 'Alpha');
        expect(react_2.screen.getByText('Test Stream Alpha')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Test Stream Beta')).not.toBeInTheDocument();
    });
    it('filters by frequency band', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        const bandSelect = react_2.screen.getByRole('combobox');
        await user.selectOptions(bandSelect, 'HF');
        expect(react_2.screen.queryByText('Test Stream Alpha')).not.toBeInTheDocument();
        expect(react_2.screen.getByText('Test Stream Beta')).toBeInTheDocument();
    });
    it('filters active only', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        const activeCheckbox = react_2.screen.getByLabelText('Active only');
        await user.click(activeCheckbox);
        expect(react_2.screen.getByText('Test Stream Alpha')).toBeInTheDocument();
        expect(react_2.screen.queryByText('Test Stream Beta')).not.toBeInTheDocument();
    });
    it('calls onSelectStream when stream clicked', async () => {
        const user = user_event_1.default.setup();
        const onSelectStream = jest.fn();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={onSelectStream}/>);
        await user.click(react_2.screen.getByText('Test Stream Alpha'));
        expect(onSelectStream).toHaveBeenCalledWith(mockStreams[0]);
    });
    it('shows geolocation when available', () => {
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        expect(react_2.screen.getByText(/40\.7128.*-74\.006/)).toBeInTheDocument();
    });
    it('handles subscribe/unsubscribe', async () => {
        const user = user_event_1.default.setup();
        const onSubscribe = jest.fn();
        const onUnsubscribe = jest.fn();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()} onSubscribe={onSubscribe} onUnsubscribe={onUnsubscribe} subscribedIds={new Set()}/>);
        // Find and click subscribe button
        const subscribeButtons = react_2.screen.getAllByTitle('Subscribe');
        await user.click(subscribeButtons[0]);
        expect(onSubscribe).toHaveBeenCalledWith('test-stream-1');
    });
});
describe('MASINTOverlayPanel', () => {
    it('renders overlays correctly', () => {
        (0, react_2.render)(<MASINTOverlayPanel_1.MASINTOverlayPanel overlays={mockMASINTOverlays}/>);
        expect(react_2.screen.getByText('MASINT Overlays')).toBeInTheDocument();
        expect(react_2.screen.getByText(/RADAR/i)).toBeInTheDocument();
        expect(react_2.screen.getByText('masint-1')).toBeInTheDocument();
    });
    it('displays detection count', () => {
        (0, react_2.render)(<MASINTOverlayPanel_1.MASINTOverlayPanel overlays={mockMASINTOverlays}/>);
        expect(react_2.screen.getByText('1 detections')).toBeInTheDocument();
    });
    it('shows status indicators', () => {
        (0, react_2.render)(<MASINTOverlayPanel_1.MASINTOverlayPanel overlays={mockMASINTOverlays}/>);
        expect(react_2.screen.getByText('active')).toBeInTheDocument();
    });
    it('expands to show detections on click', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<MASINTOverlayPanel_1.MASINTOverlayPanel overlays={mockMASINTOverlays} onSelectOverlay={jest.fn()}/>);
        await user.click(react_2.screen.getByText('masint-1'));
        expect(react_2.screen.getByText('Commercial Aircraft')).toBeInTheDocument();
    });
    it('shows empty state when no overlays', () => {
        (0, react_2.render)(<MASINTOverlayPanel_1.MASINTOverlayPanel overlays={[]}/>);
        expect(react_2.screen.getByText('No MASINT overlays available')).toBeInTheDocument();
    });
});
describe('AgenticDemodulationPanel', () => {
    it('renders tasks correctly', () => {
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams}/>);
        expect(react_2.screen.getByText('Agentic Demodulation')).toBeInTheDocument();
        expect(react_2.screen.getByText('test-stream-1')).toBeInTheDocument();
    });
    it('shows active vs completed tasks', () => {
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams}/>);
        expect(react_2.screen.getByText(/Active Tasks/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Recent Results/i)).toBeInTheDocument();
    });
    it('displays task progress', () => {
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams}/>);
        expect(react_2.screen.getByText('Analyzing')).toBeInTheDocument();
    });
    it('shows demodulation results', () => {
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams}/>);
        expect(react_2.screen.getByText('AM')).toBeInTheDocument();
        expect(react_2.screen.getByText('92%')).toBeInTheDocument();
    });
    it('opens new task dialog', async () => {
        const user = user_event_1.default.setup();
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams} onStartDemodulation={jest.fn()}/>);
        await user.click(react_2.screen.getByText('New Task'));
        expect(react_2.screen.getByText('Select signal stream:')).toBeInTheDocument();
    });
    it('calls onStartDemodulation with selected stream', async () => {
        const user = user_event_1.default.setup();
        const onStartDemodulation = jest.fn();
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={[]} availableStreams={mockStreams} onStartDemodulation={onStartDemodulation}/>);
        await user.click(react_2.screen.getByText('New Task'));
        const select = react_2.screen.getByRole('combobox');
        await user.selectOptions(select, 'test-stream-1');
        await user.click(react_2.screen.getByText('Start'));
        expect(onStartDemodulation).toHaveBeenCalledWith('test-stream-1');
    });
    it('calls onCancelTask when cancel clicked', async () => {
        const user = user_event_1.default.setup();
        const onCancelTask = jest.fn();
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={mockDemodTasks} availableStreams={mockStreams} onCancelTask={onCancelTask}/>);
        const cancelButtons = react_2.screen.getAllByTitle('Cancel task');
        await user.click(cancelButtons[0]);
        expect(onCancelTask).toHaveBeenCalledWith('task-1');
    });
    it('shows empty state when no tasks', () => {
        (0, react_2.render)(<AgenticDemodulationPanel_1.AgenticDemodulationPanel tasks={[]} availableStreams={mockStreams}/>);
        expect(react_2.screen.getByText('No demodulation tasks')).toBeInTheDocument();
    });
});
describe('Performance', () => {
    it('renders within acceptable time for large datasets', () => {
        const largeStreams = Array.from({ length: 100 }, (_, i) => ({
            id: `stream-${i}`,
            name: `Stream ${i}`,
            band: 'VHF',
            centerFrequency: 150e6 + i * 25000,
            bandwidth: 25000,
            sampleRate: 48000,
            modulation: 'FM',
            confidence: 'HIGH',
            samples: [],
            active: i % 2 === 0,
        }));
        const startTime = performance.now();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={largeStreams} onSelectStream={jest.fn()}/>);
        const renderTime = performance.now() - startTime;
        // Should render under 500ms (p95 target)
        expect(renderTime).toBeLessThan(500);
    });
});
describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={jest.fn()}/>);
        expect(react_2.screen.getByRole('combobox')).toBeInTheDocument();
        expect(react_2.screen.getByRole('textbox')).toBeInTheDocument();
    });
    it('supports keyboard navigation', async () => {
        const user = user_event_1.default.setup();
        const onSelectStream = jest.fn();
        (0, react_2.render)(<SignalStreamList_1.SignalStreamList streams={mockStreams} onSelectStream={onSelectStream}/>);
        const searchInput = react_2.screen.getByPlaceholderText('Search streams...');
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
        (0, react_2.render)(<SIGINTDashboard_1.SIGINTDashboard />);
        expect(react_2.screen.getByText(/SIGINT/i)).toBeInTheDocument();
    });
});
