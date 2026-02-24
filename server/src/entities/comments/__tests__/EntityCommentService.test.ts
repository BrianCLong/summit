import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { EntityCommentService } from '../EntityCommentService.js';

describe('EntityCommentService (Batch Optimization Verification)', () => {
  let mockClient: any;
  let mockPool: any;
  let service: EntityCommentService;

  beforeEach(() => {
    mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'mock-id' }], rowCount: 1 }),
      release: jest.fn(),
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    service = new EntityCommentService(mockPool);
  });

  it('should call query once for multiple attachments (batch optimized)', async () => {
    const input = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      authorId: 'user-1',
      content: 'Hello world',
      attachments: [
        { fileName: 'file1.txt' },
        { fileName: 'file2.txt' },
        { fileName: 'file3.txt' },
      ],
    };

    // Mock the comment insertion
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'comment-1' }], rowCount: 1 }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'comment-1' }], rowCount: 1 }); // INSERT comment

    // Mock the batch attachment insertion
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { id: 'att-1', file_name: 'file1.txt' },
        { id: 'att-2', file_name: 'file2.txt' },
        { id: 'att-3', file_name: 'file3.txt' }
      ],
      rowCount: 3
    });

    const comment = await service.addComment(input);

    // Verify attachments were mapped correctly
    expect(comment.attachments).toHaveLength(3);
    expect(comment.attachments[0].fileName).toBe('file1.txt');

    // Filter queries that are INSERT into attachments
    const attachmentInserts = mockClient.query.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO maestro.entity_comment_attachments')
    );

    // Optimized: should be exactly 1 call
    expect(attachmentInserts.length).toBe(1);

    // Verify placeholders are generated correctly (should have 3 sets of 6 placeholders)
    const query = attachmentInserts[0][0];
    expect(query).toContain('$1, $2, $3, $4, $5, $6');
    expect(query).toContain('$7, $8, $9, $10, $11, $12');
    expect(query).toContain('$13, $14, $15, $16, $17, $18');
  });

  it('should call query once for multiple mentions (batch optimized)', async () => {
    const content = 'Hello @alice @bob @charlie';
    const input = {
      tenantId: 'tenant-1',
      entityId: 'entity-1',
      authorId: 'user-1',
      content,
    };

    // Mock the comment insertion
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'comment-1' }], rowCount: 1 }); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'comment-1' }], rowCount: 1 }); // INSERT comment

    // resolveMentions query
    mockClient.query.mockResolvedValueOnce({
      rows: [
        { id: '1', username: 'alice' },
        { id: '2', username: 'bob' },
        { id: '3', username: 'charlie' }
      ],
      rowCount: 3
    });

    // Mock the batch mention insertion
    mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 3 });

    const comment = await service.addComment(input);

    expect(comment.mentions).toHaveLength(3);

    // Filter queries that are INSERT into mentions
    const mentionInserts = mockClient.query.mock.calls.filter(call =>
      typeof call[0] === 'string' && call[0].includes('INSERT INTO maestro.entity_comment_mentions')
    );

    // Optimized: should be exactly 1 call
    expect(mentionInserts.length).toBe(1);

    // Verify placeholders
    const query = mentionInserts[0][0];
    expect(query).toContain('$1, $2, $3');
    expect(query).toContain('$4, $5, $6');
    expect(query).toContain('$7, $8, $9');
  });
});
