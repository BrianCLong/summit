// @ts-nocheck
/**
 * Canonical Entity: FinancialInstrument
 *
 * Represents a financial instrument (stock, bond, contract)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalFinancialInstrument extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'FinancialInstrument';

  /** Name/Symbol */
  name: string;
  symbol?: string;

  /** Type (e.g., Equity, Bond, Derivative) */
  instrumentType: string;

  /** Issuer ID */
  issuerId?: string;

  /** Exchange */
  exchange?: string;

  /** Currency */
  currency?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
