import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ChunkingService } from '../ChunkingService.js';
import { Document } from '../../data-model/types.js';

describe('ChunkingService', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it('should chunk simple text', () => {
    const now = new Date().toISOString();
    const doc: Document = {
      id: 'doc1',
      tenantId: 'tenant1',
      source: { system: 'unit-test', id: 'doc1' },
      text: 'Hello world. This is a test.',
      metadata: {},
      entityIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const chunks = chunkingService.chunkDocument(doc, 10, 2);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].text).toBeDefined();
  });

  it('should respect semantic boundaries (paragraphs)', () => {
    const now = new Date().toISOString();
    const text = 'Para 1.\n\nPara 2 is longer.\n\nPara 3.';
    const doc: Document = {
      id: 'doc2',
      tenantId: 'tenant1',
      source: { system: 'unit-test', id: 'doc2' },
      text: text,
      metadata: {},
      entityIds: [],
      createdAt: now,
      updatedAt: now,
    };

    // Small chunk size to force split, but large enough for one para
    const chunks = chunkingService.chunkDocument(doc, 50, 0);
    // Should ideally be one chunk per para if they fit
    // Length of "Para 1." is 7. "Para 2 is longer." is 17.
    // Combined is 24 + 2 (newlines) = 26.

    // If chunk size is 50, all should fit in one chunk actually.
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toContain('Para 1.');
    expect(chunks[0].text).toContain('Para 3.');
  });

  it('should split huge paragraphs', () => {
      const now = new Date().toISOString();
      const hugeText = 'A'.repeat(100);
      const doc: Document = {
        id: 'doc3',
        tenantId: 'tenant1',
        source: { system: 'unit-test', id: 'doc3' },
        text: hugeText,
        metadata: {},
        entityIds: [],
        createdAt: now,
        updatedAt: now,
      };

      const chunks = chunkingService.chunkDocument(doc, 20, 5);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].text.length).toBe(20);
      expect(chunks[1].text.length).toBe(20);
  });
});
