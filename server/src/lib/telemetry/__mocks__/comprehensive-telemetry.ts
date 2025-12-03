export const telemetry = {
  subsystems: {
    database: {
      queries: { add: jest.fn() },
      errors: { add: jest.fn() },
      latency: { record: jest.fn() },
    },
    cache: {
      hits: { add: jest.fn() },
      misses: { add: jest.fn() },
      sets: { add: jest.fn() },
      dels: { add: jest.fn() },
    },
    api: {
      requests: { add: jest.fn() },
      errors: { add: jest.fn() },
    },
  },
  requestDuration: { record: jest.fn() },
  incrementActiveConnections: jest.fn(),
  decrementActiveConnections: jest.fn(),
  recordRequest: jest.fn(),
};
