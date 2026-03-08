"use strict";
/**
 * Support Center Service Tests
 *
 * Tests for in-app support with knowledge base and ticket management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SupportCenterService_js_1 = require("./SupportCenterService.js");
// Mock the database pool
globals_1.jest.mock('../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => null),
}));
(0, globals_1.describe)('SupportCenterService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = SupportCenterService_js_1.SupportCenterService.getInstance();
    });
    (0, globals_1.describe)('search', () => {
        (0, globals_1.it)('should return search results for valid query', async () => {
            const result = await service.search('getting started');
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
        });
        (0, globals_1.it)('should rank title matches higher than content matches', async () => {
            const result = await service.search('summit');
            // Results should be sorted by score
            if (result.data.length > 1) {
                for (let i = 0; i < result.data.length - 1; i++) {
                    (0, globals_1.expect)(result.data[i].score).toBeGreaterThanOrEqual(result.data[i + 1].score);
                }
            }
        });
        (0, globals_1.it)('should filter by category', async () => {
            const result = await service.search('policy', { category: 'policies' });
            result.data.forEach((item) => {
                (0, globals_1.expect)(item.category).toBe('policies');
            });
        });
        (0, globals_1.it)('should respect limit option', async () => {
            const result = await service.search('', { limit: 2 });
            (0, globals_1.expect)(result.data.length).toBeLessThanOrEqual(2);
        });
    });
    (0, globals_1.describe)('getArticles', () => {
        (0, globals_1.it)('should return published articles', async () => {
            const result = await service.getArticles();
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.data.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should filter articles by category', async () => {
            const result = await service.getArticles({ category: 'getting_started' });
            result.data.forEach((article) => {
                (0, globals_1.expect)(article.category).toBe('getting_started');
            });
        });
        (0, globals_1.it)('should sort articles by views', async () => {
            const result = await service.getArticles();
            if (result.data.length > 1) {
                for (let i = 0; i < result.data.length - 1; i++) {
                    (0, globals_1.expect)(result.data[i].views).toBeGreaterThanOrEqual(result.data[i + 1].views);
                }
            }
        });
    });
    (0, globals_1.describe)('getArticleBySlug', () => {
        (0, globals_1.it)('should return article by slug', async () => {
            const result = await service.getArticleBySlug('getting-started', false);
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data?.slug).toBe('getting-started');
        });
        (0, globals_1.it)('should return null for non-existent article', async () => {
            const result = await service.getArticleBySlug('non-existent-article', false);
            (0, globals_1.expect)(result.data).toBeNull();
        });
        (0, globals_1.it)('should increment views when requested', async () => {
            const before = await service.getArticleBySlug('getting-started', false);
            const initialViews = before.data?.views || 0;
            await service.getArticleBySlug('getting-started', true);
            const after = await service.getArticleBySlug('getting-started', false);
            (0, globals_1.expect)(after.data?.views).toBe(initialViews + 1);
        });
    });
    (0, globals_1.describe)('getFAQs', () => {
        (0, globals_1.it)('should return FAQs', async () => {
            const result = await service.getFAQs();
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.data.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should filter FAQs by category', async () => {
            const result = await service.getFAQs({ category: 'security' });
            result.data.forEach((faq) => {
                (0, globals_1.expect)(faq.category).toBe('security');
            });
        });
        (0, globals_1.it)('should sort FAQs by order', async () => {
            const result = await service.getFAQs();
            if (result.data.length > 1) {
                for (let i = 0; i < result.data.length - 1; i++) {
                    (0, globals_1.expect)(result.data[i].order).toBeLessThanOrEqual(result.data[i + 1].order);
                }
            }
        });
    });
    (0, globals_1.describe)('createTicket', () => {
        (0, globals_1.it)('should create a support ticket', async () => {
            const result = await service.createTicket('tenant-1', 'user-1', {
                subject: 'Test Issue',
                description: 'This is a test issue',
                type: 'question',
                priority: 'medium',
            });
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data.id).toBeDefined();
            (0, globals_1.expect)(result.data.subject).toBe('Test Issue');
            (0, globals_1.expect)(result.data.status).toBe('open');
            (0, globals_1.expect)(result.data.governanceVerdict).toBeDefined();
        });
        (0, globals_1.it)('should set SLA deadline based on priority', async () => {
            const result = await service.createTicket('tenant-1', 'user-1', {
                subject: 'Critical Issue',
                description: 'This is critical',
                type: 'incident',
                priority: 'critical',
            });
            (0, globals_1.expect)(result.data.slaDeadline).toBeDefined();
            // Critical SLA is 240 minutes = 4 hours
            const expectedDeadline = Date.now() + 240 * 60 * 1000;
            (0, globals_1.expect)(result.data.slaDeadline.getTime()).toBeLessThanOrEqual(expectedDeadline + 5000);
        });
        (0, globals_1.it)('should default to medium priority', async () => {
            const result = await service.createTicket('tenant-1', 'user-1', {
                subject: 'Question',
                description: 'Just a question',
                type: 'question',
            });
            (0, globals_1.expect)(result.data.priority).toBe('medium');
        });
    });
    (0, globals_1.describe)('voteArticle', () => {
        (0, globals_1.it)('should increment helpful votes', async () => {
            const before = await service.getArticleBySlug('getting-started', false);
            const initialHelpful = before.data?.helpfulVotes || 0;
            await service.voteArticle(before.data.id, true);
            const after = await service.getArticleBySlug('getting-started', false);
            (0, globals_1.expect)(after.data?.helpfulVotes).toBe(initialHelpful + 1);
        });
        (0, globals_1.it)('should increment not helpful votes', async () => {
            const before = await service.getArticleBySlug('getting-started', false);
            const initialNotHelpful = before.data?.notHelpfulVotes || 0;
            await service.voteArticle(before.data.id, false);
            const after = await service.getArticleBySlug('getting-started', false);
            (0, globals_1.expect)(after.data?.notHelpfulVotes).toBe(initialNotHelpful + 1);
        });
    });
    (0, globals_1.describe)('getConfig', () => {
        (0, globals_1.it)('should return support center configuration', () => {
            const result = service.getConfig();
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data.enabled).toBe(true);
            (0, globals_1.expect)(result.data.knowledgeBaseEnabled).toBe(true);
            (0, globals_1.expect)(result.data.faqEnabled).toBe(true);
            (0, globals_1.expect)(result.data.ticketsEnabled).toBe(true);
        });
        (0, globals_1.it)('should include SLA configuration', () => {
            const result = service.getConfig();
            (0, globals_1.expect)(result.data.slaConfig).toBeDefined();
            (0, globals_1.expect)(result.data.slaConfig.enabled).toBe(true);
            (0, globals_1.expect)(result.data.slaConfig.priorities.critical).toBeDefined();
            (0, globals_1.expect)(result.data.slaConfig.priorities.critical.firstResponseMinutes).toBe(15);
        });
        (0, globals_1.it)('should include escalation rules', () => {
            const result = service.getConfig();
            (0, globals_1.expect)(result.data.escalationRules).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.data.escalationRules.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('governance compliance', () => {
        (0, globals_1.it)('should include governance verdict in all responses', async () => {
            const searchResult = await service.search('test');
            const articlesResult = await service.getArticles();
            const faqsResult = await service.getFAQs();
            (0, globals_1.expect)(searchResult.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(articlesResult.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(faqsResult.governanceVerdict).toBeDefined();
        });
        (0, globals_1.it)('should include provenance metadata', async () => {
            const result = await service.getArticles();
            (0, globals_1.expect)(result.provenance).toBeDefined();
            (0, globals_1.expect)(result.provenance.source).toBe('support-center-service');
        });
    });
});
