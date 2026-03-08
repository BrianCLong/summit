"use strict";
/**
 * Type Validation Tests
 * Tests for Zod schema validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../types/index.js");
describe('Type Schemas', () => {
    describe('TagSchema', () => {
        it('should validate a valid tag', () => {
            const tag = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test Tag',
                slug: 'test-tag',
                description: 'A test tag',
                color: '#FF5733',
                category: 'test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.TagSchema.safeParse(tag);
            expect(result.success).toBe(true);
        });
        it('should reject invalid UUID', () => {
            const tag = {
                id: 'not-a-uuid',
                name: 'Test',
                slug: 'test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.TagSchema.safeParse(tag);
            expect(result.success).toBe(false);
        });
        it('should reject invalid color format', () => {
            const tag = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                slug: 'test',
                color: 'red', // Should be hex
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.TagSchema.safeParse(tag);
            expect(result.success).toBe(false);
        });
        it('should allow optional fields', () => {
            const tag = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                slug: 'test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.TagSchema.safeParse(tag);
            expect(result.success).toBe(true);
        });
    });
    describe('AudienceSchema', () => {
        it('should validate a valid audience', () => {
            const audience = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Analysts',
                roles: ['analyst', 'investigator'],
                description: 'For analysts',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.AudienceSchema.safeParse(audience);
            expect(result.success).toBe(true);
        });
        it('should reject invalid roles', () => {
            const audience = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Test',
                roles: ['invalid_role'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = index_js_1.AudienceSchema.safeParse(audience);
            expect(result.success).toBe(false);
        });
    });
    describe('CreateArticleInputSchema', () => {
        it('should validate valid article input', () => {
            const input = {
                slug: 'test-article',
                title: 'Test Article',
                contentType: 'article',
                classification: 'internal',
                ownerId: '550e8400-e29b-41d4-a716-446655440000',
                content: '# Test\n\nContent here.',
            };
            const result = index_js_1.CreateArticleInputSchema.safeParse(input);
            expect(result.success).toBe(true);
        });
        it('should apply default classification', () => {
            const input = {
                slug: 'test',
                title: 'Test',
                contentType: 'article',
                ownerId: '550e8400-e29b-41d4-a716-446655440000',
                content: 'Content',
            };
            const result = index_js_1.CreateArticleInputSchema.safeParse(input);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.classification).toBe('internal');
            }
        });
        it('should reject empty content', () => {
            const input = {
                slug: 'test',
                title: 'Test',
                contentType: 'article',
                ownerId: '550e8400-e29b-41d4-a716-446655440000',
                content: '',
            };
            const result = index_js_1.CreateArticleInputSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
        it('should reject slug that is too long', () => {
            const input = {
                slug: 'a'.repeat(250),
                title: 'Test',
                contentType: 'article',
                ownerId: '550e8400-e29b-41d4-a716-446655440000',
                content: 'Content',
            };
            const result = index_js_1.CreateArticleInputSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });
    describe('ContextualHelpRequestSchema', () => {
        it('should validate valid request', () => {
            const request = {
                uiRoute: '/investigations/123',
                anchorKey: 'entity-panel',
                userRole: 'analyst',
                limit: 5,
            };
            const result = index_js_1.ContextualHelpRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });
        it('should apply default limit', () => {
            const request = {
                uiRoute: '/investigations',
            };
            const result = index_js_1.ContextualHelpRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limit).toBe(5);
            }
        });
        it('should reject limit over max', () => {
            const request = {
                uiRoute: '/test',
                limit: 100,
            };
            const result = index_js_1.ContextualHelpRequestSchema.safeParse(request);
            expect(result.success).toBe(false);
        });
    });
    describe('CopilotKBQuerySchema', () => {
        it('should validate valid query', () => {
            const query = {
                query: 'How do I create an investigation?',
                userRole: 'analyst',
                contentTypes: ['article', 'playbook'],
                limit: 5,
            };
            const result = index_js_1.CopilotKBQuerySchema.safeParse(query);
            expect(result.success).toBe(true);
        });
        it('should apply defaults', () => {
            const query = {
                query: 'test query',
            };
            const result = index_js_1.CopilotKBQuerySchema.safeParse(query);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.includeDeprecated).toBe(false);
                expect(result.data.limit).toBe(5);
            }
        });
        it('should reject empty query', () => {
            const query = {
                query: '',
            };
            const result = index_js_1.CopilotKBQuerySchema.safeParse(query);
            expect(result.success).toBe(false);
        });
    });
    describe('ContentType enum', () => {
        it('should have all expected values', () => {
            expect(index_js_1.ContentType.ARTICLE).toBe('article');
            expect(index_js_1.ContentType.PLAYBOOK).toBe('playbook');
            expect(index_js_1.ContentType.SOP).toBe('sop');
            expect(index_js_1.ContentType.RUNBOOK).toBe('runbook');
            expect(index_js_1.ContentType.FAQ).toBe('faq');
            expect(index_js_1.ContentType.TUTORIAL).toBe('tutorial');
            expect(index_js_1.ContentType.REFERENCE).toBe('reference');
        });
    });
    describe('ContentStatus enum', () => {
        it('should have all expected values', () => {
            expect(index_js_1.ContentStatus.DRAFT).toBe('draft');
            expect(index_js_1.ContentStatus.PENDING_REVIEW).toBe('pending_review');
            expect(index_js_1.ContentStatus.APPROVED).toBe('approved');
            expect(index_js_1.ContentStatus.PUBLISHED).toBe('published');
            expect(index_js_1.ContentStatus.ARCHIVED).toBe('archived');
            expect(index_js_1.ContentStatus.DEPRECATED).toBe('deprecated');
        });
    });
    describe('ClassificationLevel enum', () => {
        it('should have all expected values', () => {
            expect(index_js_1.ClassificationLevel.PUBLIC).toBe('public');
            expect(index_js_1.ClassificationLevel.INTERNAL).toBe('internal');
            expect(index_js_1.ClassificationLevel.CONFIDENTIAL).toBe('confidential');
            expect(index_js_1.ClassificationLevel.RESTRICTED).toBe('restricted');
        });
    });
});
