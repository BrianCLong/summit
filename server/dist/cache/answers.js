import Redis from 'ioredis';
const r = new Redis(process.env.REDIS_URL);
function key(tenant, input) {
    return `ans:${tenant}:${Buffer.from(input).toString('base64url')}`;
}
export async function getCached(tenant, input) {
    return r.get(key(tenant, input));
}
export async function setCached(tenant, input, text, ttl = 60) {
    await r.setex(key(tenant, input), ttl, text);
}
//# sourceMappingURL=answers.js.map