import { z } from 'zod';
import { ExtractionResult } from '@intelgraph/metadata-extractor';

/**
 * Document-specific metadata schemas
 */

// Office document metadata
export const OfficeMetadataSchema = z.object({
  type: z.enum(['word', 'excel', 'powerpoint', 'onenote']),
  title: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  comments: z.string().optional(),
  pages: z.number().optional(),
  slides: z.number().optional(),
  sheets: z.number().optional(),
  words: z.number().optional(),
  characters: z.number().optional(),
  lines: z.number().optional(),
  paragraphs: z.number().optional(),
  language: z.string().optional(),
  contentStatus: z.string().optional(),
  hyperlinksChanged: z.boolean().optional(),
  sharedDoc: z.boolean().optional(),
  revision: z.number().optional(),
  totalEditTime: z.number().optional(), // minutes
  fontNames: z.array(z.string()).optional(),
  styleNames: z.array(z.string()).optional(),
  embeddedObjects: z.array(z.object({
    type: z.string(),
    name: z.string(),
    size: z.number(),
  })).optional(),
  macros: z.boolean().optional(),
  externalLinks: z.array(z.string()).optional(),
});

export type OfficeMetadata = z.infer<typeof OfficeMetadataSchema>;

// PDF metadata
export const PDFMetadataSchema = z.object({
  version: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  producer: z.string().optional(),
  creator: z.string().optional(),
  pages: z.number().optional(),
  encrypted: z.boolean().default(false),
  linearized: z.boolean().optional(),
  tagged: z.boolean().optional(),
  pdfVersion: z.string().optional(),
  pageLayout: z.string().optional(),
  pageMode: z.string().optional(),
  fonts: z.array(z.object({
    name: z.string(),
    type: z.string(),
    embedded: z.boolean(),
  })).optional(),
  javascript: z.boolean().optional(),
  forms: z.boolean().optional(),
  signatures: z.array(z.object({
    name: z.string(),
    signedAt: z.date(),
    valid: z.boolean(),
  })).optional(),
  attachments: z.array(z.object({
    name: z.string(),
    size: z.number(),
    mimeType: z.string(),
  })).optional(),
  annotations: z.number().optional(),
  bookmarks: z.number().optional(),
});

export type PDFMetadata = z.infer<typeof PDFMetadataSchema>;

// Archive metadata
export const ArchiveMetadataSchema = z.object({
  type: z.enum(['zip', 'rar', '7z', 'tar', 'gzip', 'bzip2']),
  encrypted: z.boolean().default(false),
  compressed: z.boolean().default(true),
  compressionMethod: z.string().optional(),
  compressionRatio: z.number().optional(),
  files: z.array(z.object({
    path: z.string(),
    size: z.number(),
    compressedSize: z.number(),
    crc32: z.string().optional(),
    created: z.date().optional(),
    modified: z.date().optional(),
    encrypted: z.boolean(),
    comment: z.string().optional(),
  })),
  totalSize: z.number(),
  totalCompressedSize: z.number(),
  comment: z.string().optional(),
  volumeNumber: z.number().optional(),
  multiVolume: z.boolean().optional(),
});

export type ArchiveMetadata = z.infer<typeof ArchiveMetadataSchema>;

// Document extraction result
export type DocumentExtractionResult = ExtractionResult & {
  document?: {
    office?: OfficeMetadata;
    pdf?: PDFMetadata;
    archive?: ArchiveMetadata;
  };
};
