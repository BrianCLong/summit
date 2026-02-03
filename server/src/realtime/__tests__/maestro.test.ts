import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Server, Socket } from 'socket.io';
import { registerMaestroHandlers } from '../maestro.js';

// Mock Socket.io structures
const mockJoin = jest.fn();
const mockLeave = jest.fn();
const mockEmit = jest.fn();
const mockOn = jest.fn();

const mockSocket: any = {
  id: 'socket-1',
  user: { id: 'user-1', email: 'test@example.com', username: 'tester' },
  tenantId: 'tenant-1',
  join: mockJoin,
  leave: mockLeave,
  emit: mockEmit,
  on: mockOn,
};

const mockIo: any = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

describe('Maestro WebSocket Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-register handlers for each test to capture callbacks
    registerMaestroHandlers(mockIo, mockSocket);
  });

  it('should register all event handlers', () => {
    expect(mockOn).toHaveBeenCalledWith('maestro:subscribe_run', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_run', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('maestro:subscribe_logs', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_logs', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('maestro:subscribe_status', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_status', expect.any(Function));
  });

  it('should handle run subscription', async () => {
    // Extract the callback for 'maestro:subscribe_run'
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];

    await subscribeCallback({ runId: 'run-123' });

    expect(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:run:run-123');
    expect(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'run', runId: 'run-123' });
  });

  it('should handle invalid run subscription (null payload)', async () => {
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];

    // Should not throw and should not join
    await subscribeCallback(null);

    expect(mockJoin).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should handle invalid run subscription (missing runId)', async () => {
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];

    await subscribeCallback({});

    expect(mockJoin).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should handle run unsubscription', async () => {
    const unsubscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:unsubscribe_run')[1];

    await unsubscribeCallback({ runId: 'run-123' });

    expect(mockLeave).toHaveBeenCalledWith('tenant:tenant-1:run:run-123');
    expect(mockEmit).toHaveBeenCalledWith('maestro:unsubscribed', { type: 'run', runId: 'run-123' });
  });

  it('should handle log subscription', async () => {
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_logs')[1];

    await subscribeCallback({ runId: 'run-123' });

    expect(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:logs:run-123');
    expect(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'logs', runId: 'run-123' });
  });

  it('should handle global status subscription', async () => {
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_status')[1];

    await subscribeCallback();

    expect(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:maestro:status');
    expect(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'status' });
  });

  it('should handle errors during subscription', async () => {
    mockJoin.mockRejectedValueOnce(new Error('Connection failed'));
    const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];

    await subscribeCallback({ runId: 'run-123' });

    expect(mockEmit).toHaveBeenCalledWith('maestro:error', expect.objectContaining({
        code: 'SUBSCRIPTION_FAILED'
    }));
  });
});
