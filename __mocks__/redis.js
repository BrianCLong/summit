// Mock for Redis client
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),

  // String operations
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),

  // Hash operations
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  hkeys: jest.fn().mockResolvedValue([]),

  // List operations
  lpush: jest.fn().mockResolvedValue(1),
  rpush: jest.fn().mockResolvedValue(1),
  lpop: jest.fn().mockResolvedValue(null),
  rpop: jest.fn().mockResolvedValue(null),
  llen: jest.fn().mockResolvedValue(0),

  // Set operations
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),

  // Events
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),

  // Connection state
  isReady: true,
  isOpen: true,
};

const createClient = jest.fn().mockReturnValue(mockRedisClient);

module.exports = {
  createClient,
  RedisClient: jest.fn().mockImplementation(() => mockRedisClient),
  default: {
    createClient,
  },
};