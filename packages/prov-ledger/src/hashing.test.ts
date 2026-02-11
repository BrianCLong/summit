import { describe, it, expect } from '@jest/globals';
import { HashChain, canonicalSerialize } from './hashing';

describe('HashChain', () => {
  it('should create a chain of events where each event references the previous hash', () => {
    const chain = new HashChain();
    const event1 = chain.createEvent('TEST_TYPE', { b: 2, a: 1 });
    const event2 = chain.createEvent('TEST_TYPE', { data: 'event 2' });

    expect(event1.prevHash).toBe('0'.repeat(64));
    expect(event2.prevHash).toBe(event1.hash);
    expect(event1.hash).not.toBe(event2.hash);
  });

  it('should be deterministic with canonical serialization', () => {
    const chain1 = new HashChain();
    const chain2 = new HashChain();

    const event1 = chain1.createEvent('TYPE', { a: 1, b: 2 });
    const event2 = chain2.createEvent('TYPE', { b: 2, a: 1 }); // Keys swapped

    // We can't compare hash directly because ID and timestamp will differ.
    // But we can test canonicalSerialize directly.
    expect(canonicalSerialize({ a: 1, b: 2 })).toBe(canonicalSerialize({ b: 2, a: 1 }));
  });

  it('should verify an event correctly', () => {
    const chain = new HashChain();
    const event1 = chain.createEvent('TEST_TYPE', { data: 'event 1' });

    const isValid = chain.verifyEvent(event1, '0'.repeat(64));
    expect(isValid).toBe(true);
  });

  it('should fail verification if payload is tampered', () => {
    const chain = new HashChain();
    const event1 = chain.createEvent('TEST_TYPE', { data: 'event 1' });

    const tamperedEvent = { ...event1, payload: { data: 'tampered' } };
    const isValid = chain.verifyEvent(tamperedEvent, '0'.repeat(64));
    expect(isValid).toBe(false);
  });

  it('should fail verification if an intermediate block is modified (tamper detection)', () => {
    const chain = new HashChain();
    const event1 = chain.createEvent('TYPE_1', { val: 1 });
    const event2 = chain.createEvent('TYPE_2', { val: 2 });
    const event3 = chain.createEvent('TYPE_3', { val: 3 });

    // Verify chain integrity manually
    expect(chain.verifyEvent(event1, '0'.repeat(64))).toBe(true);
    expect(chain.verifyEvent(event2, event1.hash)).toBe(true);
    expect(chain.verifyEvent(event3, event2.hash)).toBe(true);

    // Tamper with event 2
    const tamperedEvent2 = { ...event2, payload: { val: 999 } };

    // event 2 itself fails verification
    expect(chain.verifyEvent(tamperedEvent2, event1.hash)).toBe(false);

    // event 3 still verifies against the ORIGINAL event2.hash,
    // but the chain is broken if we try to verify it against the tampered event's hash (if it were recalculated)
    // or if we realize event 2's hash doesn't match its content.
  });
});
