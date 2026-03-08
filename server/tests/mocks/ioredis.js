"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cluster = exports.Redis = exports.resetMockRedis = void 0;
const ioredis_1 = require("ioredis");
const isMockEnabled = process.env.ZERO_FOOTPRINT !== 'false';
const mockRedisStorage = new Map();
const mockRedisSets = new Map();
const mockRedisStreams = new Map();
let mockStreamIdCounter = 0;
const resetMockRedis = () => {
    mockRedisStorage.clear();
    mockRedisSets.clear();
    mockRedisStreams.clear();
    mockStreamIdCounter = 0;
};
exports.resetMockRedis = resetMockRedis;
class RedisMock {
    options;
    keyPrefix;
    status;
    constructor() {
        this.status = 'ready';
        this.options = { keyPrefix: 'summit:' };
        this.keyPrefix = 'summit:';
    }
    on(event, callback) {
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
    async get(key) {
        return mockRedisStorage.get(key) || null;
    }
    async set(key, value) {
        mockRedisStorage.set(key, value);
        return 'OK';
    }
    async setex(key, _ttlSeconds, value) {
        mockRedisStorage.set(key, value);
        return 'OK';
    }
    async del(...keys) {
        let count = 0;
        for (const key of keys) {
            if (mockRedisStorage.delete(key)) {
                count += 1;
            }
        }
        return count;
    }
    async psubscribe(pattern) {
        return Promise.resolve();
    }
    async keys(pattern) {
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
    async sadd(key, ...values) {
        if (!mockRedisSets.has(key))
            mockRedisSets.set(key, new Set());
        values.forEach((v) => mockRedisSets.get(key).add(v));
        return values.length;
    }
    async smembers(key) {
        return Array.from(mockRedisSets.get(key) || []);
    }
    async zadd(key, _score, value) {
        if (!mockRedisSets.has(key))
            mockRedisSets.set(key, new Set());
        mockRedisSets.get(key).add(value);
        return 1;
    }
    async zrange(key, _start, _stop) {
        return Array.from(mockRedisSets.get(key) || []);
    }
    async zrevrange(key, _start, _stop) {
        return Array.from(mockRedisSets.get(key) || []);
    }
    async zremrangebyrank(key, _start, _stop) {
        if (!mockRedisSets.has(key))
            return 0;
        const items = Array.from(mockRedisSets.get(key) || []);
        if (items.length === 0)
            return 0;
        mockRedisSets.set(key, new Set());
        return items.length;
    }
    async xgroup() {
        return 'OK';
    }
    async xadd(stream, ...args) {
        if (!mockRedisStreams.has(stream))
            mockRedisStreams.set(stream, []);
        const id = `${Date.now()}-${mockStreamIdCounter++}`;
        const starIndex = args.indexOf('*');
        const fields = (starIndex >= 0 ? args.slice(starIndex + 1) : args);
        mockRedisStreams.get(stream).push([id, fields]);
        return id;
    }
    async xrange(stream, _start, _end, ...args) {
        const entries = mockRedisStreams.get(stream) || [];
        const countIndex = args.indexOf('COUNT');
        const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
        return entries.slice(0, count);
    }
    async xrevrange(stream, _start, _end, ...args) {
        const entries = mockRedisStreams.get(stream) || [];
        const countIndex = args.indexOf('COUNT');
        const count = countIndex >= 0 ? Number(args[countIndex + 1]) : entries.length;
        return [...entries].reverse().slice(0, count);
    }
    async xreadgroup(..._args) {
        return [];
    }
    async xack(_stream, _group, ..._ids) {
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
        const queued = [];
        return {
            xadd: (...args) => {
                queued.push(() => {
                    void this.xadd(args[0], ...args.slice(1));
                });
                return this;
            },
            exec: async () => queued.map(() => [null, 'OK']),
        };
    }
    disconnect() { }
    async quit() {
        return Promise.resolve();
    }
    async publish(_channel, _message) {
        return 0;
    }
    async subscribe(..._channels) {
        return _channels.length;
    }
    async unsubscribe(..._channels) {
        return _channels.length;
    }
    async hget(_key, _field) {
        return null;
    }
    async hset(_key, _field, _value) {
        return 1;
    }
    async hdel(_key, ..._fields) {
        return _fields.length;
    }
    async hgetall(_key) {
        return {};
    }
    async exists(..._keys) {
        return 0;
    }
    async mget(..._keys) {
        return _keys.map(() => null);
    }
    async mset(..._pairs) {
        return 'OK';
    }
    async lpush(_key, ..._values) {
        return _values.length;
    }
    async rpush(_key, ..._values) {
        return _values.length;
    }
    async lrange(_key, _start, _stop) {
        return [];
    }
    async llen(_key) {
        return 0;
    }
    async lpop(_key) {
        return null;
    }
    async rpop(_key) {
        return null;
    }
    async srem(_key, ..._members) {
        return _members.length;
    }
    async sismember(_key, _member) {
        return 0;
    }
    async scard(_key) {
        return 0;
    }
    async ttl(_key) {
        return -1;
    }
    async pttl(_key) {
        return -1;
    }
    scanStream(_options) {
        return {
            on: (_event, _callback) => {
                if (_event === 'end') {
                    setTimeout(() => _callback(), 0);
                }
                return this;
            },
            pause: () => { },
            resume: () => { },
        };
    }
    duplicate() {
        return this;
    }
    defineCommand(name) {
        if (name && !this[name]) {
            this[name] = async () => [1, 100, 0];
        }
        return this;
    }
    async consumeTokenBucket() {
        return [1, 100, 0];
    }
}
exports.Redis = isMockEnabled ? RedisMock : ioredis_1.Redis;
// Cluster mock for ioredis Cluster support
class ClusterMock extends RedisMock {
    nodes;
    constructor(_startupNodes, _options) {
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
exports.Cluster = isMockEnabled ? ClusterMock : ioredis_1.Cluster;
exports.default = exports.Redis;
