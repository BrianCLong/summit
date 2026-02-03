import { describe, it, expect } from 'vitest';
import { HashChain } from '../lib/hashchain.js';

describe('HashChain', () => {
  it('starts empty', () => {
    const chain = new HashChain();
    expect(chain.length).toBe(0);
    expect(chain.lastHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('adds events and links hashes', () => {
    const chain = new HashChain();
    const e1 = chain.addEvent({ foo: 'bar' });
    const e2 = chain.addEvent({ baz: 'qux' });

    expect(e1.index).toBe(0);
    expect(e1.prev_hash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(e2.index).toBe(1);
    expect(e2.prev_hash).toBe(e1.hash);

    expect(chain.verify()).toBe(true);
  });

  it('detects tampering', () => {
    const chain = new HashChain();
    chain.addEvent({ a: 1 });
    chain.addEvent({ b: 2 });

    const events = chain.allEvents;
    // Tamper with data
    (events[0].data as any).a = 2;

    expect(chain.verify()).toBe(false);
  });
});
