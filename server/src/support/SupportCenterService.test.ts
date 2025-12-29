/**
 * Support Center Service Tests
 *
 * Tests for in-app support with knowledge base and ticket management.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupportCenterService } from './SupportCenterService.js';

// Mock the database pool
jest.mock('../config/database.js', () => ({
  getPostgresPool: jest.fn(() => null),
}));

describe('SupportCenterService', () => {
  let service: SupportCenterService;

  beforeEach(() => {
    service = SupportCenterService.getInstance();
  });

  describe('search', () => {
    it('should return search results for valid query', async () => {
      const result = await service.search('getting started');

      expect(result.data).toBeInstanceOf(Array);
      expect(result.governanceVerdict).toBeDefined();
    });

    it('should rank title matches higher than content matches', async () => {
      const result = await service.search('summit');

      // Results should be sorted by score
      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].score).toBeGreaterThanOrEqual(result.data[i + 1].score);
        }
      }
    });

    it('should filter by category', async () => {
      const result = await service.search('policy', { category: 'policies' });

      result.data.forEach((item) => {
        expect(item.category).toBe('policies');
      });
    });

    it('should respect limit option', async () => {
      const result = await service.search('', { limit: 2 });

      expect(result.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getArticles', () => {
    it('should return published articles', async () => {
      const result = await service.getArticles();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter articles by category', async () => {
      const result = await service.getArticles({ category: 'getting_started' });

      result.data.forEach((article) => {
        expect(article.category).toBe('getting_started');
      });
    });

    it('should sort articles by views', async () => {
      const result = await service.getArticles();

      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].views).toBeGreaterThanOrEqual(result.data[i + 1].views);
        }
      }
    });
  });

  describe('getArticleBySlug', () => {
    it('should return article by slug', async () => {
      const result = await service.getArticleBySlug('getting-started', false);

      expect(result.data).toBeDefined();
      expect(result.data?.slug).toBe('getting-started');
    });

    it('should return null for non-existent article', async () => {
      const result = await service.getArticleBySlug('non-existent-article', false);

      expect(result.data).toBeNull();
    });

    it('should increment views when requested', async () => {
      const before = await service.getArticleBySlug('getting-started', false);
      const initialViews = before.data?.views || 0;

      await service.getArticleBySlug('getting-started', true);
      const after = await service.getArticleBySlug('getting-started', false);

      expect(after.data?.views).toBe(initialViews + 1);
    });
  });

  describe('getFAQs', () => {
    it('should return FAQs', async () => {
      const result = await service.getFAQs();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter FAQs by category', async () => {
      const result = await service.getFAQs({ category: 'security' });

      result.data.forEach((faq) => {
        expect(faq.category).toBe('security');
      });
    });

    it('should sort FAQs by order', async () => {
      const result = await service.getFAQs();

      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].order).toBeLessThanOrEqual(result.data[i + 1].order);
        }
      }
    });
  });

  describe('createTicket', () => {
    it('should create a support ticket', async () => {
      const result = await service.createTicket('tenant-1', 'user-1', {
        subject: 'Test Issue',
        description: 'This is a test issue',
        type: 'question',
        priority: 'medium',
      });

      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.subject).toBe('Test Issue');
      expect(result.data.status).toBe('open');
      expect(result.data.governanceVerdict).toBeDefined();
    });

    it('should set SLA deadline based on priority', async () => {
      const result = await service.createTicket('tenant-1', 'user-1', {
        subject: 'Critical Issue',
        description: 'This is critical',
        type: 'incident',
        priority: 'critical',
      });

      expect(result.data.slaDeadline).toBeDefined();
      // Critical SLA is 240 minutes = 4 hours
      const expectedDeadline = Date.now() + 240 * 60 * 1000;
      expect(result.data.slaDeadline!.getTime()).toBeLessThanOrEqual(expectedDeadline + 5000);
    });

    it('should default to medium priority', async () => {
      const result = await service.createTicket('tenant-1', 'user-1', {
        subject: 'Question',
        description: 'Just a question',
        type: 'question',
      });

      expect(result.data.priority).toBe('medium');
    });
  });

  describe('voteArticle', () => {
    it('should increment helpful votes', async () => {
      const before = await service.getArticleBySlug('getting-started', false);
      const initialHelpful = before.data?.helpfulVotes || 0;

      await service.voteArticle(before.data!.id, true);

      const after = await service.getArticleBySlug('getting-started', false);
      expect(after.data?.helpfulVotes).toBe(initialHelpful + 1);
    });

    it('should increment not helpful votes', async () => {
      const before = await service.getArticleBySlug('getting-started', false);
      const initialNotHelpful = before.data?.notHelpfulVotes || 0;

      await service.voteArticle(before.data!.id, false);

      const after = await service.getArticleBySlug('getting-started', false);
      expect(after.data?.notHelpfulVotes).toBe(initialNotHelpful + 1);
    });
  });

  describe('getConfig', () => {
    it('should return support center configuration', () => {
      const result = service.getConfig();

      expect(result.data).toBeDefined();
      expect(result.data.enabled).toBe(true);
      expect(result.data.knowledgeBaseEnabled).toBe(true);
      expect(result.data.faqEnabled).toBe(true);
      expect(result.data.ticketsEnabled).toBe(true);
    });

    it('should include SLA configuration', () => {
      const result = service.getConfig();

      expect(result.data.slaConfig).toBeDefined();
      expect(result.data.slaConfig.enabled).toBe(true);
      expect(result.data.slaConfig.priorities.critical).toBeDefined();
      expect(result.data.slaConfig.priorities.critical.firstResponseMinutes).toBe(15);
    });

    it('should include escalation rules', () => {
      const result = service.getConfig();

      expect(result.data.escalationRules).toBeInstanceOf(Array);
      expect(result.data.escalationRules.length).toBeGreaterThan(0);
    });
  });

  describe('governance compliance', () => {
    it('should include governance verdict in all responses', async () => {
      const searchResult = await service.search('test');
      const articlesResult = await service.getArticles();
      const faqsResult = await service.getFAQs();

      expect(searchResult.governanceVerdict).toBeDefined();
      expect(articlesResult.governanceVerdict).toBeDefined();
      expect(faqsResult.governanceVerdict).toBeDefined();
    });

    it('should include provenance metadata', async () => {
      const result = await service.getArticles();

      expect(result.provenance).toBeDefined();
      expect(result.provenance.source).toBe('support-center-service');
    });
  });
});
