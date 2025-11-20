/**
 * AML Typology Library - Comprehensive catalog of money laundering schemes
 */

import { AMLTypology } from './types.js';

export interface TypologyDefinition {
  id: AMLTypology;
  name: string;
  description: string;
  indicators: string[];
  examples: string[];
  regulatoryReference: string[];
}

export const AML_TYPOLOGY_LIBRARY: TypologyDefinition[] = [
  {
    id: AMLTypology.STRUCTURING,
    name: 'Structuring / Smurfing',
    description: 'Breaking large transactions into smaller amounts to avoid reporting thresholds',
    indicators: [
      'Multiple transactions just below CTR threshold ($10,000)',
      'Regular pattern of deposits/withdrawals',
      'Similar amounts across transactions',
      'Multiple locations or accounts used',
    ],
    examples: [
      'Daily cash deposits of $9,500',
      'Multiple withdrawals of $9,800 from different ATMs',
    ],
    regulatoryReference: ['31 USC 5324', 'FinCEN guidance FIN-2012-G001'],
  },
  {
    id: AMLTypology.LAYERING,
    name: 'Layering',
    description: 'Moving funds through multiple transactions to obscure the audit trail',
    indicators: [
      'Rapid movement through multiple accounts',
      'Multiple intermediary parties',
      'Cross-border transfers',
      'Consistent amounts through chain',
    ],
    examples: [
      'Wire transfers through 5+ accounts in 24 hours',
      'International transfers with immediate outbound movement',
    ],
    regulatoryReference: ['FATF Recommendation 10', 'BSA reporting requirements'],
  },
  {
    id: AMLTypology.TRADE_BASED_ML,
    name: 'Trade-Based Money Laundering',
    description: 'Using trade transactions to legitimize illicit funds',
    indicators: [
      'Over/under invoicing',
      'Multiple invoicing',
      'Phantom shipping',
      'Misrepresentation of goods quality',
    ],
    examples: [
      'Invoice for electronics at 300% above market value',
      'Shipping documents with no actual goods movement',
    ],
    regulatoryReference: ['FATF TBML Report 2020', 'US Strategy for Combating TBML'],
  },
];
