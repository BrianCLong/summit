/**
 * Canonical Entity: Document
 *
 * Represents documents, files, and records
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface DocumentIdentifiers {
  /** Document number */
  documentNumber?: string;

  /** Reference numbers */
  referenceNumbers?: {
    type: string;
    value: string;
  }[];

  /** File hashes */
  hashes?: {
    algorithm: string; // e.g., "SHA256", "MD5"
    value: string;
  }[];

  /** URL/URI */
  uri?: string;
}

export interface DocumentClassification {
  /** Classification level */
  level?: 'public' | 'internal' | 'confidential' | 'secret' | 'top_secret';

  /** Handling caveats */
  caveats?: string[];

  /** Declassification date */
  declassifyOn?: Date;

  /** Classification authority */
  classifiedBy?: string;

  /** Classification reason */
  reason?: string;
}

export interface DocumentAuthor {
  /** Author entity ID */
  entityId?: string;

  /** Author entity type */
  entityType?: 'Person' | 'Organization';

  /** Author name */
  name: string;

  /** Author role */
  role?: string;
}

export interface CanonicalDocument extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Document';

  /** Document title */
  title: string;

  /** Document type */
  documentType:
    | 'contract'
    | 'invoice'
    | 'report'
    | 'email'
    | 'legal_filing'
    | 'certificate'
    | 'permit'
    | 'license'
    | 'correspondence'
    | 'financial_statement'
    | 'other';

  /** Identifiers */
  identifiers: DocumentIdentifiers;

  /** Document author(s) */
  authors?: DocumentAuthor[];

  /** Document issuer/publisher */
  issuer?: {
    entityId?: string;
    entityType?: 'Person' | 'Organization';
    name: string;
  };

  /** Date document was created/issued */
  issuedDate?: Date;

  /** Date document was signed/executed */
  executedDate?: Date;

  /** Effective date */
  effectiveDate?: Date;

  /** Expiration date */
  expirationDate?: Date;

  /** Document language */
  language?: string;

  /** Number of pages */
  pageCount?: number;

  /** File format */
  format?: string; // e.g., "PDF", "DOCX", "JPG"

  /** File size (bytes) */
  fileSize?: number;

  /** Classification */
  classification?: DocumentClassification;

  /** Document summary/abstract */
  summary?: string;

  /** Full text content (if extracted) */
  content?: string;

  /** Entities mentioned in document */
  mentions?: {
    entityId?: string;
    entityType?: string;
    name: string;
    confidence?: number;
  }[];

  /** Related documents */
  relatedDocuments?: {
    documentId?: string;
    title: string;
    relationship: string;
  }[];

  /** Parties to the document (for contracts) */
  parties?: {
    entityId?: string;
    entityType?: 'Person' | 'Organization';
    name: string;
    role: string;
  }[];

  /** Document status */
  status?:
    | 'draft'
    | 'final'
    | 'executed'
    | 'expired'
    | 'superseded'
    | 'void'
    | 'unknown';

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Document entity
 */
export function createDocument(
  data: Omit<CanonicalDocument, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalDocument {
  return {
    ...baseFields,
    ...data,
    entityType: 'Document',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
