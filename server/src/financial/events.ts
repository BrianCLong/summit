// @ts-nocheck
import { z } from 'zod';

/**
 * Order-to-Cash (O2C) Lifecycle Events
 *
 * These events correspond to the stages defined in docs/finance/O2C_EVENT_MAP.md
 */
export enum O2CEvent {
  RECEIPT_INGESTED = 'RECEIPT_INGESTED',
  RECEIPT_VALIDATED = 'RECEIPT_VALIDATED',
  RECEIPT_PERSISTED = 'RECEIPT_PERSISTED',
  RECEIPT_DEDUPED = 'RECEIPT_DEDUPED',
  RECEIPT_POSTED = 'RECEIPT_POSTED',
  RECEIPT_RECONCILED = 'RECEIPT_RECONCILED',
}

/**
 * Zod schema for O2CEvent validation
 */
export const O2CEventSchema = z.nativeEnum(O2CEvent);

/**
 * Type alias for O2CEvent derived from the schema
 */
export type O2CEventType = z.infer<typeof O2CEventSchema>;
