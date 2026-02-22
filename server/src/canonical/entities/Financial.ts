// @ts-nocheck
/**
 * Canonical Entities: Financial
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface Account extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Account';
  type: 'bank' | 'crypto' | 'service';
  accountNumber?: string;
  iban?: string;
  swift?: string;
  ownerId: string;
  institutionName?: string;
  currency?: string;
  balance?: number;
  balanceAsOf?: Date;
}

export interface FinancialInstrument extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'FinancialInstrument';
  type: 'stock' | 'bond' | 'derivative' | 'contract';
  symbol?: string;
  isin?: string;
  issuerId?: string;
}
