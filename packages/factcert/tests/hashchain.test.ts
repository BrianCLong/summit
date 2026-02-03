import { describe, it, expect } from 'vitest';
import { HashChain } from '../src/lib/hashchain.js';

describe('HashChain', () => {
  it('should verify a valid chain', () => {
    const chain = new HashChain();
    chain.addEvent('TEST', { data: 123 });
    chain.addEvent('TEST2', { data: 456 });
    expect(chain.verify()).toBe(true);
  });

  it('should fail if chain is tampered', () => {
    const chain = new HashChain();
    chain.addEvent('TEST', { data: 123 });
    const events = chain.getChain();
    // Tamper with payload
    events[1].payload = { data: 999 };
    expect(chain.verify()).toBe(false);
  });

  it('should fail if sequence is wrong', () => {
    const chain = new HashChain();
    chain.addEvent('TEST', { data: 123 });
    const events = chain.getChain();
    events[1].seq = 999;
    expect(chain.verify()).toBe(false);
  });
});
