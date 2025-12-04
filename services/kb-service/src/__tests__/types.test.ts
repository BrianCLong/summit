/**
 * Type Validation Tests
 * Tests for Zod schema validation
 */

import {
  TagSchema,
  AudienceSchema,
  ArticleSchema,
  VersionSchema,
  CreateArticleInputSchema,
  CreateTagInputSchema,
  ContextualHelpRequestSchema,
  CopilotKBQuerySchema,
  ContentType,
  ContentStatus,
  ClassificationLevel,
  AudienceRole,
} from '../types/index.js';

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

      const result = TagSchema.safeParse(tag);
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

      const result = TagSchema.safeParse(tag);
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

      const result = TagSchema.safeParse(tag);
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

      const result = TagSchema.safeParse(tag);
      expect(result.success).toBe(true);
    });
  });

  describe('AudienceSchema', () => {
    it('should validate a valid audience', () => {
      const audience = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Analysts',
        roles: ['analyst', 'investigator'] as AudienceRole[],
        description: 'For analysts',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = AudienceSchema.safeParse(audience);
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

      const result = AudienceSchema.safeParse(audience);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateArticleInputSchema', () => {
    it('should validate valid article input', () => {
      const input = {
        slug: 'test-article',
        title: 'Test Article',
        contentType: 'article' as ContentType,
        classification: 'internal' as ClassificationLevel,
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        content: '# Test\n\nContent here.',
      };

      const result = CreateArticleInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should apply default classification', () => {
      const input = {
        slug: 'test',
        title: 'Test',
        contentType: 'article' as ContentType,
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Content',
      };

      const result = CreateArticleInputSchema.safeParse(input);
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

      const result = CreateArticleInputSchema.safeParse(input);
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

      const result = CreateArticleInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ContextualHelpRequestSchema', () => {
    it('should validate valid request', () => {
      const request = {
        uiRoute: '/investigations/123',
        anchorKey: 'entity-panel',
        userRole: 'analyst' as AudienceRole,
        limit: 5,
      };

      const result = ContextualHelpRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should apply default limit', () => {
      const request = {
        uiRoute: '/investigations',
      };

      const result = ContextualHelpRequestSchema.safeParse(request);
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

      const result = ContextualHelpRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('CopilotKBQuerySchema', () => {
    it('should validate valid query', () => {
      const query = {
        query: 'How do I create an investigation?',
        userRole: 'analyst' as AudienceRole,
        contentTypes: ['article', 'playbook'] as ContentType[],
        limit: 5,
      };

      const result = CopilotKBQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const query = {
        query: 'test query',
      };

      const result = CopilotKBQuerySchema.safeParse(query);
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

      const result = CopilotKBQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe('ContentType enum', () => {
    it('should have all expected values', () => {
      expect(ContentType.ARTICLE).toBe('article');
      expect(ContentType.PLAYBOOK).toBe('playbook');
      expect(ContentType.SOP).toBe('sop');
      expect(ContentType.RUNBOOK).toBe('runbook');
      expect(ContentType.FAQ).toBe('faq');
      expect(ContentType.TUTORIAL).toBe('tutorial');
      expect(ContentType.REFERENCE).toBe('reference');
    });
  });

  describe('ContentStatus enum', () => {
    it('should have all expected values', () => {
      expect(ContentStatus.DRAFT).toBe('draft');
      expect(ContentStatus.PENDING_REVIEW).toBe('pending_review');
      expect(ContentStatus.APPROVED).toBe('approved');
      expect(ContentStatus.PUBLISHED).toBe('published');
      expect(ContentStatus.ARCHIVED).toBe('archived');
      expect(ContentStatus.DEPRECATED).toBe('deprecated');
    });
  });

  describe('ClassificationLevel enum', () => {
    it('should have all expected values', () => {
      expect(ClassificationLevel.PUBLIC).toBe('public');
      expect(ClassificationLevel.INTERNAL).toBe('internal');
      expect(ClassificationLevel.CONFIDENTIAL).toBe('confidential');
      expect(ClassificationLevel.RESTRICTED).toBe('restricted');
    });
  });
});
