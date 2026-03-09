
const mockRedisStorage = new Map<string, string>();
const mockRedisSets = new Map<string, Set<string>>();
const mockRedisStreams = new Map<string, Array<[string, string[]]>>();
let mockStreamIdCounter = 0;

export const resetMockRedis = () => {
  mockRedisStorage.clear();
  mockRedisSets.clear();
  mockRedisStreams.clear();
  mockStreamIdCounter = 0;
};

export default class Redis {
  options: any;
  keyPrefix: string;
  status: string;

  constructor() {
    this.status = 'ready';
    this.options = { keyPrefix: 'summit:' };
    this.keyPrefix = 'summit:';
  }

  on(event: string, callback: () => void) {
    if (event === 'connect' || event === 'ready') {
      setTimeout(() => callback && callback(), 10);
    }
    return this;
  }

  async connect() {
    return Promise.resolve();
  }

  async ping() {
    return 'PONG';
  }

  async get(key: string) {
    return mockRedisStorage.get(key) || null;
  }

  async set(key: string, value: string) {
    mockRedisStorage.set(key, value);
    return 'OK';
  }

  async setex(key: string, _ttlSeconds: number, value: string) {
    mockRedisStorage.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]) {
    let count = 0;
    for (const key of keys) {
      if (mockRedisStorage.delete(key)) {
        count += 1;
      }
    }
    return count;
  }

  async psubscribe(pattern: string) {
    return Promise.resolve();
  }

  async keys(pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(mockRedisStorage.keys()).filter((k) => regex.test(k));
  }

  async expire() {
    return 1;
  }

  async incr() {
    return 1;
  }

  async decr() {
    return 0;
  }

  async incrbyfloat() {
    return '0';
  }

  async hmget() {
    return ['0', '0'];
  }

  async sadd(key: string, ...values: string[]) {
    if (!mockRedisSets.has(key)) mockRedisSets.set(key, new Set());
    values.forEach((v) => mockRedisSets.get(key)!.add(v));
    return values.length;
  }

  async smembers(key: string) {
    return Array.from(mockRedisSets.get(key) || []);
  }

  async zadd(key: string, _score: number, value: string) {
    if (!mockRedisSets.has(key)) mockRedisSets.set(key, new Set());
    mockRedisSets.get(key)!.add(value);
    return 1;
  }

  async zrange(key: string, _start: number, _stop: number) {
    return Array.from(mockRedisSets.get(key) || []);
  }

  async zrevrange(key: string, _start: number, _stop: number) {
    return Array.from(mockRedisSets.get(key) || []);
  }

  async zremrangebyrank(key: string, _start: number, _stop: number) {
    if (!mockRedisSets.has(key)) return 0;
    const items = Array.from(mockRedisSets.get(key) || []);
    if (items.length === 0) return 0;
    mockRedisSets.set(key, new Set());
    return items.length;
  }

  async xgroup() {
    return 'OK';
  }

  async xadd(stream: string, ...args: any[]) {
    if (!mockRedisStreams.has(stream)) mockRedisStreams.set(stream, []);
    const id = `${Date.now()}-${mockStreamIdCounter++}`;
    const starIndex = args.indexOf('*');
    const fields = (starIndex >= 0 ? args.slice(starIndex + 1) : args) as string[];
    mockRedisStreams.get(stream)!.push([id, fields]);
    return id;
  }

  async xrange(stream: string, _start: string, _end: string, ...args: any[]) {
    const entries = mockRedisStreams.get(stream) || [];
    const countIndex = args.indexOf('COUNT');
    const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
    return entries.slice(0, count);
  }

  async xrevrange(stream: string, _start: string, _end: string, ...args: any[]) {
    const entries = mockRedisStreams.get(stream) || [];
    const countIndex = args.indexOf('COUNT');
    const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
    return [...entries].reverse().slice(0, count);
  }

  async xreadgroup(..._args: any[]) {
    return [];
  }

  async xack(_stream: string, _group: string, ..._ids: string[]) {
    return 1;
  }

  async xinfo() {
    return [
      'length',
      10,
      'first-entry',
      ['123-0', ['data', 'test']],
      'last-entry',
      ['456-0', ['data', 'test']],
      'groups',
      1,
      'last-generated-id',
      '456-0',
    ];
  }

  pipeline() {
    const queued: Array<() => void> = [];
    return {
      xadd: (...args: any[]) => {
        queued.push(() => {
          void this.xadd(args[0], ...args.slice(1));
        });
        return this;
      },
      exec: async () => queued.map(() => [null, 'OK']),
    };
  }

  disconnect() {}

  async quit() {
    return Promise.resolve();
  }

  async publish(_channel: string, _message: string) {
    return 0;
  }

  async subscribe(..._channels: string[]) {
    return _channels.length;
  }

  async unsubscribe(..._channels: string[]) {
    return _channels.length;
  }

  async hget(_key: string, _field: string) {
    return null;
  }

  async hset(_key: string, _field: string, _value: string) {
    return 1;
  }

  async hdel(_key: string, ..._fields: string[]) {
    return _fields.length;
  }

  async hgetall(_key: string) {
    return {};
  }

  async exists(..._keys: string[]) {
    return 0;
  }

  async mget(..._keys: string[]) {
    return _keys.map(() => null);
  }

  async mset(..._pairs: string[]) {
    return 'OK';
  }

  async lpush(_key: string, ..._values: string[]) {
    return _values.length;
  }

  async rpush(_key: string, ..._values: string[]) {
    return _values.length;
  }

  async lrange(_key: string, _start: number, _stop: number) {
    return [];
  }

  async llen(_key: string) {
    return 0;
  }

  async lpop(_key: string) {
    return null;
  }

  async rpop(_key: string) {
    return null;
  }

  async srem(_key: string, ..._members: string[]) {
    return _members.length;
  }

  async sismember(_key: string, _member: string) {
    return 0;
  }

  async scard(_key: string) {
    return 0;
  }

  async ttl(_key: string) {
    return -1;
  }

  async pttl(_key: string) {
    return -1;
  }

  scanStream(_options?: any) {
    return {
      on: (_event: string, _callback: (keys?: string[]) => void) => {
        if (_event === 'end') {
          setTimeout(() => _callback(), 0);
        }
        return this;
      },
      pause: () => {},
      resume: () => {},
    };
  }

  duplicate() {
    return this;
  }

  defineCommand(name?: string) {
    if (name && !(this as any)[name]) {
      (this as any)[name] = async () => [1, 100, 0];
    }
    return this;
  }

  async consumeTokenBucket() {
    return [1, 100, 0];
  }
}

export { Redis };

// Cluster mock for ioredis Cluster support
export class Cluster extends Redis {
  nodes: Redis[];

  constructor(_startupNodes?: any[], _options?: any) {
    super();
    this.nodes = [this];
  }

  async connect() {
    return Promise.resolve();
  }

  getNodes() {
    return this.nodes;
  }
}
