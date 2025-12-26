import { freezeTime } from '../testkit/clock/clock.js';

describe('time sensitive behaviors with TestClock', () => {
  test('token expiry uses deterministic clock', () => {
    const clock = freezeTime(0);
    const ttl = 60_000;
    const issuedAt = clock.now();
    const isExpired = (now: number) => now > issuedAt + ttl;
    expect(isExpired(clock.now())).toBe(false);
    clock.advanceBy(ttl + 1);
    expect(isExpired(clock.now())).toBe(true);
  });

  test('rate limit refill simulated without sleep', () => {
    const clock = freezeTime(0);
    const refillRate = 10; // tokens per minute
    const capacity = 20;
    const calculateTokens = (now: number) =>
      Math.min(capacity, Math.floor((now / 60_000) * refillRate));
    expect(calculateTokens(clock.now())).toBe(0);
    clock.advanceBy(30_000);
    expect(calculateTokens(clock.now())).toBe(5);
    clock.advanceBy(30_000);
    expect(calculateTokens(clock.now())).toBe(10);
  });

  test('audit sampling toggles at deterministic interval', () => {
    const clock = freezeTime(0);
    const shouldSample = (now: number) => now % 2_000 === 0;
    expect(shouldSample(clock.now())).toBe(true);
    clock.advanceBy(1_000);
    expect(shouldSample(clock.now())).toBe(false);
    clock.advanceBy(1_000);
    expect(shouldSample(clock.now())).toBe(true);
  });
});
