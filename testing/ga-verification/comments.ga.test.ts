
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { UniversalCommentService } from '../../server/src/comments/UniversalCommentService.js';

// Mock Pool
class MockPool {
  query(_text, _params) {
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
}

describe('Universal Comment Service (Tier B)', () => {
  let commentService;
  let mockPool;

  beforeEach(() => {
    mockPool = new MockPool();
    commentService = new UniversalCommentService(mockPool as any);
  });

  test('Create Comment', async () => {
    const input = {
      targetType: 'NODE' as const,
      targetId: 'node-123',
      content: 'This is a comment with @[user-1]',
    };

    mockPool.query = (text, _params) => {
      if (text.includes('INSERT INTO')) {
        return {
          rows: [{
            comment_id: 'c-1',
            tenant_id: 'tenant-1',
            target_type: input.targetType,
            target_id: input.targetId,
            parent_id: null,
            root_id: null,
            content: input.content,
            author_id: 'author-1',
            created_at: new Date(),
            updated_at: new Date(),
            mentions: ['user-1'],
            is_edited: false,
            is_deleted: false,
            metadata: {}
          }]
        };
      }
      return { rows: [] };
    };

    const comment = await commentService.createComment(input, 'author-1', 'tenant-1');
    assert.strictEqual(comment.content, input.content);
    assert.deepStrictEqual(comment.mentions, ['user-1']);
    assert.strictEqual(comment.targetId, 'node-123');
  });
});
