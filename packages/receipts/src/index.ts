import { Ledger, type Receipt } from './ledger.js';
import schema from './schema/receipt.v0.1.json' assert { type: "json" };

export { Ledger, type Receipt };
export const ReceiptSchema = schema;
