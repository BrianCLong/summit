import IORedis from 'ioredis';
import crypto from 'crypto';
export const redis = new IORedis(process.env.REDIS_URL || 'redis://redis:6379');

export function answerKey(question:string, roles:string[], tenant:string) {
  const h = crypto.createHash('sha256').update(`${tenant}|${roles.join(',')}|${question}`).digest('hex');
  return `ans:${h}`;
}