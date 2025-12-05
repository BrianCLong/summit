/**
 * Hash Chain Tests
 *
 * Unit tests for cryptographic hash chaining and integrity verification.
 */

import { createHash, createHmac, randomUUID } from 'crypto';
import type { AuditEvent } from '../core/types.js';

// Genesis hash constant
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const SIGNING_KEY = 'test-signing-key-for-unit-tests';

/**
 * Calculate event hash (same as ImmutableAuditStore)
 */
function calculateEventHash(event: AuditEvent): string {
  const hashableData = {
    id: event.id,
    eventType: event.eventType,
    level: event.level,
    timestamp: event.timestamp instanceof Date
      ? event.timestamp.toISOString()
      : event.timestamp,
    correlationId: event.correlationId,
    tenantId: event.tenantId,
    serviceId: event.serviceId,
    serviceName: event.serviceName,
    environment: event.environment,
    userId: event.userId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    action: event.action,
    outcome: event.outcome,
    message: event.message,
    details: event.details,
    complianceRelevant: event.complianceRelevant,
    complianceFrameworks: event.complianceFrameworks,
  };

  const sortedJson = JSON.stringify(hashableData, Object.keys(hashableData).sort());
  return createHash('sha256').update(sortedJson).digest('hex');
}

/**
 * Calculate chain hash
 */
function calculateChainHash(
  eventHash: string,
  previousHash: string,
  sequence: bigint,
): string {
  const data = `${eventHash}:${previousHash}:${sequence.toString()}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Sign a chain entry
 */
function signChainEntry(
  eventHash: string,
  chainHash: string,
  sequence: bigint,
): string {
  const data = JSON.stringify({
    eventHash,
    chainHash,
    sequence: sequence.toString(),
  });

  return createHmac('sha256', SIGNING_KEY).update(data).digest('hex');
}

/**
 * Calculate Merkle root
 */
function calculateMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const nextLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = hashes[i + 1] || left;
    const combined = createHash('sha256').update(left + right).digest('hex');
    nextLevel.push(combined);
  }

  return calculateMerkleRoot(nextLevel);
}

/**
 * Create a test audit event
 */
function createTestEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: randomUUID(),
    eventType: 'user_login',
    level: 'info',
    timestamp: new Date(),
    version: '1.0.0',
    correlationId: randomUUID(),
    tenantId: 'test-tenant',
    serviceId: 'test-service',
    serviceName: 'Test Service',
    environment: 'development',
    action: 'login',
    outcome: 'success',
    message: 'User logged in',
    details: {},
    complianceRelevant: false,
    complianceFrameworks: [],
    ...overrides,
  };
}

describe('Hash Chain', () => {
  describe('Event Hash Calculation', () => {
    it('should produce deterministic hash for same event', () => {
      const event = createTestEvent({
        id: 'test-event-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      const hash1 = calculateEventHash(event);
      const hash2 = calculateEventHash(event);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('should produce different hash for different events', () => {
      const event1 = createTestEvent({ id: 'event-1' });
      const event2 = createTestEvent({ id: 'event-2' });

      const hash1 = calculateEventHash(event1);
      const hash2 = calculateEventHash(event2);

      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to field changes', () => {
      const baseEvent = createTestEvent({
        id: 'test-event',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      const modifiedEvent = {
        ...baseEvent,
        message: 'Modified message',
      };

      const hash1 = calculateEventHash(baseEvent);
      const hash2 = calculateEventHash(modifiedEvent);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle complex details object', () => {
      const event = createTestEvent({
        details: {
          nested: {
            value: 123,
            array: [1, 2, 3],
          },
          string: 'test',
        },
      });

      const hash = calculateEventHash(event);
      expect(hash).toHaveLength(64);
    });
  });

  describe('Chain Hash Calculation', () => {
    it('should include event hash, previous hash, and sequence', () => {
      const eventHash = 'a'.repeat(64);
      const previousHash = 'b'.repeat(64);
      const sequence = 1n;

      const chainHash = calculateChainHash(eventHash, previousHash, sequence);

      expect(chainHash).toHaveLength(64);
      expect(chainHash).not.toBe(eventHash);
      expect(chainHash).not.toBe(previousHash);
    });

    it('should be different for different sequences', () => {
      const eventHash = 'a'.repeat(64);
      const previousHash = 'b'.repeat(64);

      const chainHash1 = calculateChainHash(eventHash, previousHash, 1n);
      const chainHash2 = calculateChainHash(eventHash, previousHash, 2n);

      expect(chainHash1).not.toBe(chainHash2);
    });

    it('should link to previous hash correctly', () => {
      // Simulate a chain of 3 events
      const event1 = createTestEvent({ id: 'event-1' });
      const event2 = createTestEvent({ id: 'event-2' });
      const event3 = createTestEvent({ id: 'event-3' });

      const eventHash1 = calculateEventHash(event1);
      const chainHash1 = calculateChainHash(eventHash1, GENESIS_HASH, 1n);

      const eventHash2 = calculateEventHash(event2);
      const chainHash2 = calculateChainHash(eventHash2, chainHash1, 2n);

      const eventHash3 = calculateEventHash(event3);
      const chainHash3 = calculateChainHash(eventHash3, chainHash2, 3n);

      // Each chain hash should be unique
      expect(chainHash1).not.toBe(chainHash2);
      expect(chainHash2).not.toBe(chainHash3);
      expect(chainHash1).not.toBe(chainHash3);

      // Chain should be verifiable
      const verifyChain2 = calculateChainHash(eventHash2, chainHash1, 2n);
      expect(verifyChain2).toBe(chainHash2);
    });
  });

  describe('Signature Verification', () => {
    it('should produce consistent signatures', () => {
      const eventHash = 'a'.repeat(64);
      const chainHash = 'b'.repeat(64);
      const sequence = 1n;

      const sig1 = signChainEntry(eventHash, chainHash, sequence);
      const sig2 = signChainEntry(eventHash, chainHash, sequence);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64);
    });

    it('should detect modifications', () => {
      const eventHash = 'a'.repeat(64);
      const chainHash = 'b'.repeat(64);

      const sig1 = signChainEntry(eventHash, chainHash, 1n);
      const sig2 = signChainEntry(eventHash, chainHash, 2n);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Merkle Root Calculation', () => {
    it('should handle empty array', () => {
      const root = calculateMerkleRoot([]);
      expect(root).toBe('');
    });

    it('should return single hash for one element', () => {
      const hash = 'a'.repeat(64);
      const root = calculateMerkleRoot([hash]);
      expect(root).toBe(hash);
    });

    it('should combine two hashes correctly', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);

      const root = calculateMerkleRoot([hash1, hash2]);

      // Manually calculate expected root
      const expected = createHash('sha256').update(hash1 + hash2).digest('hex');
      expect(root).toBe(expected);
    });

    it('should handle odd number of hashes', () => {
      const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)];
      const root = calculateMerkleRoot(hashes);

      expect(root).toHaveLength(64);
    });

    it('should produce consistent root for same hashes', () => {
      const hashes = Array.from({ length: 8 }, (_, i) =>
        createHash('sha256').update(`hash-${i}`).digest('hex')
      );

      const root1 = calculateMerkleRoot(hashes);
      const root2 = calculateMerkleRoot(hashes);

      expect(root1).toBe(root2);
    });

    it('should be sensitive to hash order', () => {
      const hash1 = 'a'.repeat(64);
      const hash2 = 'b'.repeat(64);

      const root1 = calculateMerkleRoot([hash1, hash2]);
      const root2 = calculateMerkleRoot([hash2, hash1]);

      expect(root1).not.toBe(root2);
    });
  });

  describe('Chain Integrity Verification', () => {
    it('should detect tampered event data', () => {
      const event = createTestEvent();
      const originalHash = calculateEventHash(event);

      // Tamper with event
      event.message = 'Tampered message';
      const tamperedHash = calculateEventHash(event);

      expect(originalHash).not.toBe(tamperedHash);
    });

    it('should detect broken chain link', () => {
      // Build a valid chain
      const event1 = createTestEvent({ id: 'event-1' });
      const event2 = createTestEvent({ id: 'event-2' });

      const eventHash1 = calculateEventHash(event1);
      const chainHash1 = calculateChainHash(eventHash1, GENESIS_HASH, 1n);

      const eventHash2 = calculateEventHash(event2);
      const chainHash2 = calculateChainHash(eventHash2, chainHash1, 2n);

      // Try to verify with wrong previous hash
      const wrongPreviousHash = 'x'.repeat(64);
      const invalidChainHash = calculateChainHash(eventHash2, wrongPreviousHash, 2n);

      expect(invalidChainHash).not.toBe(chainHash2);
    });

    it('should detect sequence manipulation', () => {
      const event = createTestEvent();
      const eventHash = calculateEventHash(event);
      const previousHash = GENESIS_HASH;

      const chainHash1 = calculateChainHash(eventHash, previousHash, 1n);
      const chainHash5 = calculateChainHash(eventHash, previousHash, 5n);

      // Same event with different sequence should produce different chain hash
      expect(chainHash1).not.toBe(chainHash5);
    });
  });

  describe('Full Chain Simulation', () => {
    it('should build and verify a complete chain', () => {
      const events = Array.from({ length: 10 }, (_, i) =>
        createTestEvent({
          id: `event-${i}`,
          timestamp: new Date(Date.now() + i * 1000),
          message: `Event ${i}`,
        })
      );

      // Build chain
      interface ChainEntry {
        eventId: string;
        eventHash: string;
        previousHash: string;
        chainHash: string;
        signature: string;
        sequence: bigint;
      }

      const chain: ChainEntry[] = [];
      let previousHash = GENESIS_HASH;

      for (let i = 0; i < events.length; i++) {
        const eventHash = calculateEventHash(events[i]);
        const sequence = BigInt(i + 1);
        const chainHash = calculateChainHash(eventHash, previousHash, sequence);
        const signature = signChainEntry(eventHash, chainHash, sequence);

        chain.push({
          eventId: events[i].id,
          eventHash,
          previousHash,
          chainHash,
          signature,
          sequence,
        });

        previousHash = chainHash;
      }

      // Verify chain
      let expectedPreviousHash = GENESIS_HASH;
      let allValid = true;

      for (const entry of chain) {
        // Verify previous hash linkage
        if (entry.previousHash !== expectedPreviousHash) {
          allValid = false;
          break;
        }

        // Verify chain hash
        const calculatedChainHash = calculateChainHash(
          entry.eventHash,
          entry.previousHash,
          entry.sequence,
        );
        if (calculatedChainHash !== entry.chainHash) {
          allValid = false;
          break;
        }

        // Verify signature
        const expectedSignature = signChainEntry(
          entry.eventHash,
          entry.chainHash,
          entry.sequence,
        );
        if (expectedSignature !== entry.signature) {
          allValid = false;
          break;
        }

        expectedPreviousHash = entry.chainHash;
      }

      expect(allValid).toBe(true);
      expect(chain).toHaveLength(10);
    });
  });
});

describe('Tampering Detection', () => {
  it('should detect data modification in the middle of chain', () => {
    // Build chain
    const events = Array.from({ length: 5 }, (_, i) =>
      createTestEvent({
        id: `event-${i}`,
        timestamp: new Date(Date.now() + i * 1000),
      })
    );

    interface ChainEntry {
      event: AuditEvent;
      eventHash: string;
      previousHash: string;
      chainHash: string;
      sequence: bigint;
    }

    const chain: ChainEntry[] = [];
    let previousHash = GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const eventHash = calculateEventHash(events[i]);
      const sequence = BigInt(i + 1);
      const chainHash = calculateChainHash(eventHash, previousHash, sequence);

      chain.push({
        event: events[i],
        eventHash,
        previousHash,
        chainHash,
        sequence,
      });

      previousHash = chainHash;
    }

    // Tamper with middle event
    chain[2].event.message = 'TAMPERED!';

    // Verification should fail
    let verificationFailed = false;

    for (const entry of chain) {
      const recalculatedHash = calculateEventHash(entry.event);
      if (recalculatedHash !== entry.eventHash) {
        verificationFailed = true;
        break;
      }
    }

    expect(verificationFailed).toBe(true);
  });

  it('should detect chain link replacement', () => {
    // Original chain entry
    const originalEvent = createTestEvent({ id: 'original' });
    const originalEventHash = calculateEventHash(originalEvent);
    const originalChainHash = calculateChainHash(originalEventHash, GENESIS_HASH, 1n);

    // Attacker creates replacement entry
    const replacementEvent = createTestEvent({
      id: 'replacement',
      message: 'Malicious event',
    });
    const replacementEventHash = calculateEventHash(replacementEvent);
    const replacementChainHash = calculateChainHash(replacementEventHash, GENESIS_HASH, 1n);

    // Chain hashes will be different
    expect(originalChainHash).not.toBe(replacementChainHash);

    // Any subsequent entries would fail verification
    // because they reference the original chain hash
    const nextEvent = createTestEvent({ id: 'next' });
    const nextEventHash = calculateEventHash(nextEvent);
    const validNextChainHash = calculateChainHash(nextEventHash, originalChainHash, 2n);

    // If attacker replaced first entry, this would fail
    const invalidNextChainHash = calculateChainHash(nextEventHash, replacementChainHash, 2n);

    expect(validNextChainHash).not.toBe(invalidNextChainHash);
  });
});
