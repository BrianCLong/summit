"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @jest-environment jsdom
 */
const react_1 = require("@testing-library/react");
const socket_io_client_1 = require("socket.io-client");
const useRedisStream_1 = require("../hooks/useRedisStream");
// Mock socket.io-client
jest.mock('socket.io-client');
const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
};
socket_io_client_1.io.mockReturnValue(mockSocket);
describe('useRedisStream', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it('initializes with disconnected state', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        expect(result.current.isConnected).toBe(false);
        expect(result.current.samples).toEqual([]);
        expect(result.current.streams).toEqual([]);
        expect(result.current.error).toBeNull();
    });
    it('creates socket connection with correct options', () => {
        (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        expect(socket_io_client_1.io).toHaveBeenCalledWith({
            path: '/api/sigint/stream',
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 3000,
        });
    });
    it('sets up event listeners on mount', () => {
        (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('sigint:sample', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('sigint:stream', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('sigint:streams', expect.any(Function));
    });
    it('updates isConnected on connect event', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        // Simulate connect event
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        expect(result.current.isConnected).toBe(true);
    });
    it('emits join on connect', () => {
        (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('sigint:join', {
            streamKey: 'test:stream',
        });
    });
    it('updates isConnected on disconnect event', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        // Connect first
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        // Then disconnect
        const disconnectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
        (0, react_1.act)(() => {
            disconnectHandler?.();
        });
        expect(result.current.isConnected).toBe(false);
    });
    it('handles error events', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        const errorHandler = mockSocket.on.mock.calls.find(([event]) => event === 'error')?.[1];
        (0, react_1.act)(() => {
            errorHandler?.(new Error('Connection failed'));
        });
        expect(result.current.error).toBe('Connection failed');
    });
    it('processes incoming samples', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream', maxLatency: 10000 }));
        const sampleHandler = mockSocket.on.mock.calls.find(([event]) => event === 'sigint:sample')?.[1];
        const sample = {
            timestamp: Date.now(),
            frequency: 150e6,
            amplitude: 0.5,
            phase: 0,
            iq: { i: 0.5, q: 0.3 },
        };
        (0, react_1.act)(() => {
            sampleHandler?.(sample);
        });
        // Advance timers to trigger sample state update
        (0, react_1.act)(() => {
            jest.advanceTimersByTime(20);
        });
        expect(result.current.samples.length).toBeGreaterThan(0);
    });
    it('drops samples with high latency', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream', maxLatency: 100 }));
        const sampleHandler = mockSocket.on.mock.calls.find(([event]) => event === 'sigint:sample')?.[1];
        const oldSample = {
            timestamp: Date.now() - 500, // 500ms old
            frequency: 150e6,
            amplitude: 0.5,
            phase: 0,
            iq: { i: 0.5, q: 0.3 },
        };
        (0, react_1.act)(() => {
            sampleHandler?.(oldSample);
        });
        (0, react_1.act)(() => {
            jest.advanceTimersByTime(20);
        });
        expect(result.current.samples.length).toBe(0);
    });
    it('handles stream list updates', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        const streamsHandler = mockSocket.on.mock.calls.find(([event]) => event === 'sigint:streams')?.[1];
        const streams = [
            {
                id: 'stream-1',
                name: 'Test Stream',
                band: 'VHF',
                centerFrequency: 150e6,
                bandwidth: 25000,
                sampleRate: 48000,
                modulation: 'FM',
                confidence: 'HIGH',
                samples: [],
                active: true,
            },
        ];
        (0, react_1.act)(() => {
            streamsHandler?.(streams);
        });
        expect(result.current.streams).toEqual(streams);
    });
    it('provides subscribe function', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        // Connect first
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        (0, react_1.act)(() => {
            result.current.subscribe('stream-123');
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('sigint:subscribe', {
            streamId: 'stream-123',
        });
    });
    it('provides unsubscribe function', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        // Connect first
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        // Subscribe first
        (0, react_1.act)(() => {
            result.current.subscribe('stream-123');
        });
        // Then unsubscribe
        (0, react_1.act)(() => {
            result.current.unsubscribe('stream-123');
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('sigint:unsubscribe', {
            streamId: 'stream-123',
        });
    });
    it('re-subscribes on reconnect', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        // First connect
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        // Subscribe to a stream
        (0, react_1.act)(() => {
            result.current.subscribe('stream-123');
        });
        // Clear emit calls
        mockSocket.emit.mockClear();
        // Simulate reconnect
        (0, react_1.act)(() => {
            connectHandler?.();
        });
        // Should re-subscribe
        expect(mockSocket.emit).toHaveBeenCalledWith('sigint:subscribe', {
            streamId: 'stream-123',
        });
    });
    it('disconnects socket on unmount', () => {
        const { unmount } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream' }));
        unmount();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });
    it('tracks performance metrics', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream', maxLatency: 10000 }));
        const sampleHandler = mockSocket.on.mock.calls.find(([event]) => event === 'sigint:sample')?.[1];
        // Send several samples
        for (let i = 0; i < 10; i++) {
            (0, react_1.act)(() => {
                sampleHandler?.({
                    timestamp: Date.now(),
                    frequency: 150e6,
                    amplitude: 0.5,
                    phase: 0,
                    iq: { i: 0.5, q: 0.3 },
                });
            });
        }
        // Advance time to calculate FPS
        (0, react_1.act)(() => {
            jest.advanceTimersByTime(1100);
        });
        expect(result.current.metrics).toBeDefined();
        expect(result.current.metrics.bufferUtilization).toBeGreaterThan(0);
    });
    it('uses custom buffer size', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useRedisStream_1.useRedisStream)({ streamKey: 'test:stream', bufferSize: 512, maxLatency: 10000 }));
        const sampleHandler = mockSocket.on.mock.calls.find(([event]) => event === 'sigint:sample')?.[1];
        // Send more samples than buffer size
        for (let i = 0; i < 600; i++) {
            (0, react_1.act)(() => {
                sampleHandler?.({
                    timestamp: Date.now(),
                    frequency: 150e6,
                    amplitude: 0.5,
                    phase: 0,
                    iq: { i: 0.5, q: 0.3 },
                });
            });
        }
        (0, react_1.act)(() => {
            jest.advanceTimersByTime(20);
        });
        // Should be capped at buffer size
        expect(result.current.samples.length).toBeLessThanOrEqual(512);
    });
});
