import Redis from 'ioredis';
export class RedisService {
    pub;
    sub;
    constructor(urlOrOpts = process.env.REDIS_URL ||
        'redis://localhost:6379') {
        const url = typeof urlOrOpts === 'string' ? urlOrOpts : urlOrOpts.url;
        this.pub = new Redis(url);
        this.sub = new Redis(url);
    }
    getClient() {
        return this.sub;
    }
    async publish(channel, message) {
        return this.pub.publish(channel, message);
    }
    async hgetall(key) {
        return this.sub.hgetall(key);
    }
    async hincrby(key, field, increment) {
        return this.sub.hincrby(key, field, increment);
    }
    async hdel(key, field) {
        return this.sub.hdel(key, field);
    }
    async get(key) {
        return this.sub.get(key);
    }
    async setex(key, seconds, value) {
        return this.sub.setex(key, seconds, value);
    }
    async ping() {
        return this.sub.ping();
    }
    async close() {
        await Promise.all([this.pub.quit(), this.sub.quit()]);
    }
    async del(key) {
        return this.sub.del(key);
    }
}
//# sourceMappingURL=redis.js.map