import { freezeTime, TestClock } from '../testkit/clock/clock.js';

describe('TestClock', () => {
  test('freezes and advances deterministically', () => {
    const clock = freezeTime(1000);
    expect(clock.now()).toBe(1000);
    clock.advanceBy(500);
    expect(clock.now()).toBe(1500);
    clock.freeze(2000);
    expect(clock.asDate().getTime()).toBe(2000);
  });

  test('independent instances do not leak state', () => {
    const a = new TestClock(0);
    const b = new TestClock(100);
    a.advanceBy(50);
    expect(a.now()).toBe(50);
    expect(b.now()).toBe(100);
  });
});
