import Redis from 'ioredis';

export async function xaddEvent(redisUrl: string, stream: string, event: any) {
  const redis = new (Redis as any)(redisUrl);
  try {
    await redis.xadd(stream, '*', 'event', JSON.stringify(event));
  } finally {
    await redis.quit();
  }
}
