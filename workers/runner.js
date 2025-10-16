// workers/runner.js
import Redis from 'ioredis';
const r = new Redis(process.env.REDIS_URL);
const pool = process.env.POOL_NAME; // "aws" or "oci"

(async function loop() {
  while (true) {
    const job = await r.brpop(`queue:${pool}`, 10);
    if (!job) continue;
    try {
      // process job.payload safely, idempotently
    } catch (e) {
      // requeue with backoff or park to DLQ
      await r.lpush(`queue:${pool}:retry`, job[1]);
    }
  }
})();
