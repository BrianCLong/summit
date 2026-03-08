"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const UniversalCommentService_js_1 = require("../../server/src/comments/UniversalCommentService.js");
// Mock Pool
class MockPool {
    query(_text, _params) {
        return Promise.resolve({ rows: [], rowCount: 0 });
    }
}
(0, node_test_1.describe)('Universal Comment Service (Tier B)', () => {
    let commentService;
    let mockPool;
    (0, node_test_1.beforeEach)(() => {
        mockPool = new MockPool();
        commentService = new UniversalCommentService_js_1.UniversalCommentService(mockPool);
    });
    (0, node_test_1.test)('Create Comment', async () => {
        const input = {
            targetType: 'NODE',
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
        node_assert_1.default.strictEqual(comment.content, input.content);
        node_assert_1.default.deepStrictEqual(comment.mentions, ['user-1']);
        node_assert_1.default.strictEqual(comment.targetId, 'node-123');
    });
});
