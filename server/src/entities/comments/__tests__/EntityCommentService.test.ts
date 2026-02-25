import { EntityCommentService } from '../EntityCommentService.js';
import { Pool } from 'pg';
import { jest } from '@jest/globals';

describe('EntityCommentService Performance', () => {
  let pool: Pool;
  let service: EntityCommentService;
  let queries: string[] = [];

  beforeEach(() => {
    queries = [];
    pool = {
      connect: jest.fn().mockImplementation(async () => ({
        query: jest.fn().mockImplementation(async (text: string) => {
          queries.push(text);
          if (text.trim().toUpperCase().startsWith('INSERT')) {
            // Mock returning multiple rows for batch insert
            const match = text.match(/VALUES\s+(.*)\s+RETURNING/i);
            if (match) {
              const values = match[1].split('),').map(() => ({ id: 'mock-id' }));
              return { rows: values };
            }
            return { rows: [{ id: 'mock-id' }] };
          }
          if (text.includes('users')) {
            return { rows: [{ id: 'user-1', username: 'user1' }, { id: 'user-2', username: 'user2' }] };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      })),
      query: jest.fn().mockImplementation(async (text: string) => {
        queries.push(text);
        return { rows: [] };
      }),
    } as any;

    service = new EntityCommentService(pool);
  });

  it('should batch insert attachments and mentions', async () => {
    const input = {
      tenantId: 't1',
      entityId: 'e1',
      authorId: 'a1',
      content: 'Hello @user1 and @user2',
      attachments: [
        { fileName: 'f1.txt' },
        { fileName: 'f2.txt' },
        { fileName: 'f3.txt' },
      ],
    };

    await service.addComment(input);

    const insertAttachmentsQueries = queries.filter(q => q.includes('INSERT INTO maestro.entity_comment_attachments'));
    const insertMentionsQueries = queries.filter(q => q.includes('INSERT INTO maestro.entity_comment_mentions'));

    // Expecting 1 batch attachment insert and 1 batch mention insert
    expect(insertAttachmentsQueries.length).toBe(1);
    expect(insertMentionsQueries.length).toBe(1);

    // Verify batching placeholders
    expect(insertAttachmentsQueries[0]).toContain('$7');
    expect(insertAttachmentsQueries[0]).toContain('$18');
    expect(insertMentionsQueries[0]).toContain('$4');
    expect(insertMentionsQueries[0]).toContain('$6');
  });
});
