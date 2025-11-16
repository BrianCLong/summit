import { Request, Response, NextFunction } from 'express';

// Basic in-memory rate limiter (for demonstration purposes)
const requestCounts = new Map<string, { count: number; lastReset: number }>();
const WINDOW_SIZE_MS = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 100; // 100 RPS

export function rpsLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip; // Or tenantId for adaptive limiting
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 0, lastReset: now });
  }

  const clientData = requestCounts.get(ip)!;

  if (now - clientData.lastReset > WINDOW_SIZE_MS) {
    clientData.count = 0;
    clientData.lastReset = now;
  }

  clientData.count++;

  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    // S2.2 RPS Limiter Tuning: Proper 429 + Retry-After
    res
      .status(429)
      .set(
        'Retry-After',
        String(Math.ceil((clientData.lastReset + WINDOW_SIZE_MS - now) / 1000)),
      )
      .send('Too Many Requests');
    return;
  }

  // S2.2 RPS Limiter Tuning: Adaptive limiting by tenant weight (placeholder)
  // This would involve looking up tenant-specific limits and adjusting MAX_REQUESTS_PER_WINDOW dynamically.
  // For now, a simple log.
  console.log('Applying adaptive limiting by tenant weight (placeholder).');

  next();
}
