import Redis from 'ioredis';
const r = new Redis(process.env.REDIS_URL!);
function key(tenant: string, input: string) {
  return `ans:${tenant}:${Buffer.from(input).toString('base64url')}`;
}

export async function getCached(tenant: string, input: string) {
  return r.get(key(tenant, input));
}
export async function setCached(
  tenant: string,
  input: string,
  text: string,
  ttl = 60,
) {
  await r.setex(key(tenant, input), ttl, text);
}
