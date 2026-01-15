import { appendFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { Receipt, SessionPaths } from './types.js';

export function appendReceipt(session: SessionPaths, receipt: Omit<Receipt, 'id' | 'timestamp'>): Receipt {
  const enriched: Receipt = {
    ...receipt,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  } as Receipt;

  appendFileSync(session.receiptsPath, `${JSON.stringify(enriched)}\n`, 'utf8');
  return enriched;
}
