/**
 * Unit tests for Zod schema validation (no database required)
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Define schemas matching the service
const anyRecord = () => z.record(z.string(), z.any());

const CreateClaimSchema = z.object({
  content: anyRecord(),
  signature: z.string().optional(),
  metadata: anyRecord().optional(),
  sourceRef: z.string().optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()).optional(),
});

const TransformStepSchema = z.object({
  transformType: z.string(),
  timestamp: z.string().datetime(),
  actorId: z.string(),
  config: anyRecord().optional(),
});

const CreateEvidenceSchema = z.object({
  caseId: z.string().optional(),
  sourceRef: z.string(),
  content: z.any().optional(),
  checksum: z.string().optional(),
  checksumAlgorithm: z.string().default('sha256'),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  transformChain: z.array(TransformStepSchema).optional(),
  licenseId: z.string().optional(),
  policyLabels: z.array(z.string()).optional(),
  metadata: anyRecord().optional(),
});

describe('CreateClaimSchema', () => {
  it('should validate minimal claim', () => {
    const data = {
      content: { title: 'Test' },
    };

    const result = CreateClaimSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate full claim', () => {
    const data = {
      content: { title: 'Test', body: 'Content' },
      signature: 'sig123',
      metadata: { author: 'test' },
      sourceRef: 'file://test.txt',
      licenseId: 'license-001',
      policyLabels: ['public', 'verified'],
    };

    const result = CreateClaimSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject claim without content', () => {
    const data = {
      signature: 'sig123',
    };

    const result = CreateClaimSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid policyLabels type', () => {
    const data = {
      content: { title: 'Test' },
      policyLabels: 'not-an-array',
    };

    const result = CreateClaimSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('TransformStepSchema', () => {
  it('should validate valid transform step', () => {
    const data = {
      transformType: 'ocr',
      timestamp: '2025-01-20T10:00:00.000Z',
      actorId: 'system',
    };

    const result = TransformStepSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate transform step with config', () => {
    const data = {
      transformType: 'redaction',
      timestamp: '2025-01-20T10:00:00.000Z',
      actorId: 'admin',
      config: { method: 'automated', regions: [1, 2, 3] },
    };

    const result = TransformStepSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid timestamp', () => {
    const data = {
      transformType: 'ocr',
      timestamp: 'not-a-date',
      actorId: 'system',
    };

    const result = TransformStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const data = {
      transformType: 'ocr',
    };

    const result = TransformStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('CreateEvidenceSchema', () => {
  it('should validate minimal evidence', () => {
    const data = {
      sourceRef: 'file://evidence.pdf',
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate evidence with checksum', () => {
    const data = {
      sourceRef: 'file://evidence.pdf',
      checksum: 'abc123def456',
      checksumAlgorithm: 'sha256',
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate evidence with transform chain', () => {
    const data = {
      sourceRef: 'file://evidence.pdf',
      checksum: 'abc123',
      transformChain: [
        {
          transformType: 'ocr',
          timestamp: '2025-01-20T10:00:00.000Z',
          actorId: 'system',
        },
      ],
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate full evidence', () => {
    const data = {
      caseId: 'case-001',
      sourceRef: 'file://evidence.pdf',
      checksum: 'abc123',
      checksumAlgorithm: 'sha256',
      contentType: 'application/pdf',
      fileSize: 1024,
      transformChain: [
        {
          transformType: 'extraction',
          timestamp: '2025-01-20T10:00:00.000Z',
          actorId: 'ingestion-service',
          config: { format: 'pdf' },
        },
      ],
      licenseId: 'license-001',
      policyLabels: ['confidential', 'legal'],
      metadata: { ingested: true },
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject evidence without sourceRef', () => {
    const data = {
      checksum: 'abc123',
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid fileSize type', () => {
    const data = {
      sourceRef: 'file://test.pdf',
      fileSize: 'not-a-number',
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should default checksumAlgorithm to sha256', () => {
    const data = {
      sourceRef: 'file://test.pdf',
    };

    const result = CreateEvidenceSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checksumAlgorithm).toBe('sha256');
    }
  });
});
