// @ts-nocheck
/**
 * Canonical Entities: Legal & Authority
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface License extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'License';
  name: string;
  type: string;
  issuer?: string;
  terms?: string;
  url?: string;
  expiryDate?: Date;
}

export interface Authority extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Authority';
  name: string; // e.g., "Search Warrant 123"
  type: 'warrant' | 'subpoena' | 'audit' | 'consent';
  issuedBy: string; // Court or Authority Name
  issuedDate: Date;
  expiryDate?: Date;
  scope?: string;
  fileReference?: string;
}
