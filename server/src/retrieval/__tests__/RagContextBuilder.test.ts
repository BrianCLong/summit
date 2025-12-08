import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RagContextBuilder } from '../RagContextBuilder.js';
import { RetrievalService } from '../RetrievalService.js';
import { RetrievalResult } from '../types.js';

// Mock RetrievalService
const mockRetrievalService = {
  search: jest.fn()
} as unknown as RetrievalService;

describe('RagContextBuilder', () => {
  let builder: RagContextBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    builder = new RagContextBuilder(mockRetrievalService);
  });

  it('should build context within token limits', async () => {
    // Setup mock response
    (mockRetrievalService.search as jest.Mock<any>).mockResolvedValue({
      tenantId: 'tenant-1',
      items: [
        {
          object: { id: '1', kind: 'document', title: 'Doc 1', body: 'Short content', metadata: {} },
          score: 0.9
        },
        {
          object: { id: '2', kind: 'document', title: 'Doc 2', body: 'Medium content '.repeat(10), metadata: {} },
          score: 0.8
        }
      ]
    } as RetrievalResult);

    const result = await builder.buildContext({
      tenantId: 'tenant-1',
      queryText: 'test',
      maxTokens: 100 // Very restrictive limit
    });

    expect(result.snippets.length).toBeGreaterThan(0);
    expect(result.totalTokens).toBeLessThanOrEqual(100);
  });

  it('should truncate large documents', async () => {
    const longContent = 'word '.repeat(1000); // ~1000 tokens roughly
    (mockRetrievalService.search as jest.Mock<any>).mockResolvedValue({
      tenantId: 'tenant-1',
      items: [
        {
          object: { id: '1', kind: 'document', title: 'Long Doc', body: longContent, metadata: {} },
          score: 0.9
        }
      ]
    } as RetrievalResult);

    const result = await builder.buildContext({
      tenantId: 'tenant-1',
      queryText: 'test',
      maxTokens: 50
    });

    expect(result.snippets).toHaveLength(1);
    expect(result.snippets[0].content.length).toBeLessThan(longContent.length);
    expect(result.totalTokens).toBeLessThanOrEqual(50);
  });
});
