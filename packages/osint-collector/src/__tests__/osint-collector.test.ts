import { describe, it, beforeEach, afterEach } from 'vitest';
import { OsintCollector } from './index.js';
import { OsintSource, OsintCollectionTask } from './types.js';

describe('OsintCollector', () => {
  let collector: OsintCollector;

  beforeEach(() => {
    collector = new OsintCollector();
  });

  afterEach(async () => {
    await collector.cleanup();
  });

  it('should collect from news source', async () => {
    const mockSource: OsintSource = {
      id: 'source-1',
      name: 'Test News Source',
      url: 'https://example.com/news',
      type: 'news',
      config: {},
      lastSync: new Date(),
      status: 'active',
      tags: ['test', 'news'],
      tenantId: 'tenant-1'
    };

    const mockTask: OsintCollectionTask = {
      id: 'task-1',
      sourceId: 'source-1',
      query: 'test query',
      priority: 1,
      status: 'pending',
      createdAt: new Date(),
      tenantId: 'tenant-1'
    };

    // Mock the actual collection to avoid network calls in tests
    vi.spyOn(collector as any, 'collectFromNews').mockResolvedValue('Test news content');

    const result = await collector.collect(mockTask, mockSource);

    expect(result).toBeDefined();
    expect(result.sourceId).toBe('source-1');
    expect(result.content).toBe('Test news content');
    expect(result.tenantId).toBe('tenant-1');
  });

  it('should collect from social media source', async () => {
    const mockSource: OsintSource = {
      id: 'source-2',
      name: 'Test Social Media Source',
      url: 'https://example.com/social',
      type: 'social_media',
      config: { selector: '.post-content' },
      lastSync: new Date(),
      status: 'active',
      tags: ['test', 'social'],
      tenantId: 'tenant-1'
    };

    const mockTask: OsintCollectionTask = {
      id: 'task-2',
      sourceId: 'source-2',
      query: 'test social query',
      priority: 2,
      status: 'pending',
      createdAt: new Date(),
      tenantId: 'tenant-1'
    };

    // Mock the actual collection to avoid network calls in tests
    vi.spyOn(collector as any, 'collectFromSocialMedia').mockResolvedValue('Test social media content');

    const result = await collector.collect(mockTask, mockSource);

    expect(result).toBeDefined();
    expect(result.sourceId).toBe('source-2');
    expect(result.content).toBe('Test social media content');
    expect(result.tenantId).toBe('tenant-1');
  });

  it('should validate source properly', () => {
    const validSource: OsintSource = {
      id: 'source-1',
      name: 'Valid Source',
      url: 'https://example.com',
      type: 'news',
      config: {},
      lastSync: new Date(),
      status: 'active',
      tags: [],
      tenantId: 'tenant-1'
    };

    expect(collector.validateSource(validSource)).toBe(true);

    const invalidSource: OsintSource = {
      id: '',
      name: '', 
      url: 'https://example.com',
      type: 'invalid' as any,
      config: {},
      lastSync: new Date(),
      status: 'active',
      tags: [],
      tenantId: 'tenant-1'
    };

    expect(collector.validateSource(invalidSource)).toBe(false);
  });
});