const mockRedis = {
  get: jest.fn(() => Promise.resolve(null)),
  set: jest.fn(() => Promise.resolve('OK')),
  del: jest.fn(() => Promise.resolve(1)),
  exists: jest.fn(() => Promise.resolve(0)),
  expire: jest.fn(() => Promise.resolve(1)),
  ttl: jest.fn(() => Promise.resolve(-1)),
  hget: jest.fn(() => Promise.resolve(null)),
  hset: jest.fn(() => Promise.resolve(1)),
  hgetall: jest.fn(() => Promise.resolve({})),
  hdel: jest.fn(() => Promise.resolve(1)),
  lpush: jest.fn(() => Promise.resolve(1)),
  rpop: jest.fn(() => Promise.resolve(null)),
  llen: jest.fn(() => Promise.resolve(0)),
  sadd: jest.fn(() => Promise.resolve(1)),
  smembers: jest.fn(() => Promise.resolve([])),
  srem: jest.fn(() => Promise.resolve(1)),
  zadd: jest.fn(() => Promise.resolve(1)),
  zrange: jest.fn(() => Promise.resolve([])),
  zrem: jest.fn(() => Promise.resolve(1)),
  flushdb: jest.fn(() => Promise.resolve('OK')),
  quit: jest.fn(() => Promise.resolve('OK')),
  disconnect: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
};

class Redis {
  constructor() {
    Object.assign(this, mockRedis);
  }
}

module.exports = Redis;
module.exports.default = Redis;