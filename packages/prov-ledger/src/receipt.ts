import { HashChainEntry } from './types';

export interface Receipt {
  id: string;
  timestamp: string;
  entry: HashChainEntry;
  signature: string;
}

export function createReceipt(entry: HashChainEntry, signature: string): Receipt {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    entry,
    signature
  };
}
