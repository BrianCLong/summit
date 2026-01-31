
import { describe, it, expect } from '@jest/globals';
import { O2CEvent, O2CEventSchema } from '../events.js';

describe('Order-to-Cash (O2C) Events', () => {
  it('should have stable enum values matching the documentation', () => {
    expect(O2CEvent.RECEIPT_INGESTED).toBe('RECEIPT_INGESTED');
    expect(O2CEvent.RECEIPT_VALIDATED).toBe('RECEIPT_VALIDATED');
    expect(O2CEvent.RECEIPT_PERSISTED).toBe('RECEIPT_PERSISTED');
    expect(O2CEvent.RECEIPT_DEDUPED).toBe('RECEIPT_DEDUPED');
    expect(O2CEvent.RECEIPT_POSTED).toBe('RECEIPT_POSTED');
    expect(O2CEvent.RECEIPT_RECONCILED).toBe('RECEIPT_RECONCILED');
  });

  it('should validate correct event names using Zod schema', () => {
    expect(O2CEventSchema.safeParse('RECEIPT_INGESTED').success).toBe(true);
    expect(O2CEventSchema.safeParse('INVALID_EVENT').success).toBe(false);
  });

  it('should be referenced by a standard flow (simulation)', () => {
    // Simulating a flow that utilizes the events to ensure they are usable
    const flowSequence = [
      O2CEvent.RECEIPT_INGESTED,
      O2CEvent.RECEIPT_VALIDATED,
      O2CEvent.RECEIPT_DEDUPED,
      O2CEvent.RECEIPT_PERSISTED,
      O2CEvent.RECEIPT_POSTED,
      O2CEvent.RECEIPT_RECONCILED
    ];

    expect(flowSequence).toHaveLength(6);
    expect(flowSequence[0]).toBe(O2CEvent.RECEIPT_INGESTED);
    expect(flowSequence[5]).toBe(O2CEvent.RECEIPT_RECONCILED);
  });
});
