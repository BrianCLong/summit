jest.mock('socket.io-client', () => {
  const mockState = {
    listeners: {},
    socket: null,
  };

  return {
    io: jest.fn(() => {
      mockState.listeners = {};
      mockState.socket = {
        on: jest.fn((event, cb) => {
          mockState.listeners[event] = cb;
        }),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        auth: {},
      };
      return mockState.socket;
    }),
    __mockState: mockState,
  };
});

const buildLocalStorage = () => ({
  store: { token: 'test-token' },
  getItem(key) {
    return this.store[key];
  },
  setItem(key, value) {
    this.store[key] = value;
  },
  removeItem(key) {
    delete this.store[key];
  },
});

describe('socket service reconnection', () => {
  beforeEach(() => {
    jest.resetModules();
    global.localStorage = buildLocalStorage();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('uses exponential backoff calculation without jitter when disabled', async () => {
    jest.isolateModules(() => {
      const { calculateBackoffDelay } = require('./socket');
      const delay = calculateBackoffDelay(3, {
        baseMs: 100,
        factor: 2,
        maxMs: 5000,
        jitter: false,
      });
      expect(delay).toBe(800);
      const capped = calculateBackoffDelay(8, {
        baseMs: 100,
        factor: 3,
        maxMs: 5000,
        jitter: false,
      });
      expect(capped).toBe(5000);
    });
  });

  test('schedules reconnect with exponential backoff after disconnect', async () => {
    jest.isolateModules(() => {
      const socketClient = require('./socket');
      const { __mockState } = require('socket.io-client');

      const s = socketClient.getSocket();
      expect(s).toBe(__mockState.socket);
      expect(__mockState.socket.connect).toHaveBeenCalledTimes(1);

      const listeners = __mockState.listeners;
      listeners.disconnect?.('transport close');

      jest.advanceTimersByTime(700);
      expect(__mockState.socket.connect).toHaveBeenCalledTimes(2);
    });
  });

  test('manual disconnect clears reconnection attempts', async () => {
    jest.isolateModules(() => {
      const socketClient = require('./socket');
      const { __mockState } = require('socket.io-client');

      socketClient.getSocket();
      const initialConnects = __mockState.socket.connect.mock.calls.length;

      socketClient.disconnectSocket();

      const listeners = __mockState.listeners;
      listeners.disconnect?.('transport close');
      jest.runOnlyPendingTimers();

      expect(__mockState.socket.connect).toHaveBeenCalledTimes(
        initialConnects,
      );
    });
  });
});
