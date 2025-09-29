import { BackpressureGate } from '../subscriptions/BackpressureGate';

describe('BackpressureGate', () => {
  it('accepts until limit and sheds when high', () => {
    const gate = new BackpressureGate(2, 0.5);
    expect(gate.canAccept()).toBe(true);
    gate.start();
    gate.start();
    expect(gate.canAccept()).toBe(false);
    expect(gate.shouldShed()).toBe(true);
    gate.done();
    expect(gate.canAccept()).toBe(true);
  });
});
