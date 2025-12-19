/**
 * Canonical Entity: Document
 *
 * Represents a document or file
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalDocument extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Document';

  /** Title/Name */
  title: string;

  /** Document type */
  docType: string;

  /** Content hash */
  hash?: string;

  /** Authors/Creators */
  authors?: string[];

  /** Publication date */
  publishedAt?: Date;

  /** Source/URL */
  source?: string;

  /** Language */
  language?: string;

  /** Summary/Abstract */
  summary?: string;

  /** Extracted text/content */
  content?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
