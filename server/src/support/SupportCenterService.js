"use strict";
/**
 * Support Center Service
 *
 * Provides in-app support center with knowledge base, FAQs,
 * and integrations with external support tools.
 *
 * SOC 2 Controls: CC6.1, CC7.2 | GDPR Article 5
 *
 * @module support/SupportCenterService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportCenterService = exports.SupportCenterService = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const data_envelope_js_1 = require("../types/data-envelope.js");
/**
 * Support Center Service
 */
class SupportCenterService {
    static instance;
    config;
    articles;
    faqs;
    constructor() {
        this.config = this.getDefaultConfig();
        this.articles = new Map();
        this.faqs = new Map();
        this.loadContent();
    }
    static getInstance() {
        if (!SupportCenterService.instance) {
            SupportCenterService.instance = new SupportCenterService();
        }
        return SupportCenterService.instance;
    }
    /**
     * Search knowledge base and FAQs
     */
    async search(query, options) {
        const results = [];
        const searchTerms = query.toLowerCase().split(/\s+/);
        const limit = options?.limit || 10;
        // Search articles
        for (const article of this.articles.values()) {
            if (article.status !== 'published')
                continue;
            if (options?.category && article.category !== options.category)
                continue;
            if (options?.locale && article.locale !== options.locale)
                continue;
            const score = this.calculateSearchScore(searchTerms, article.title, article.summary, article.content, article.tags);
            if (score > 0) {
                results.push({
                    type: 'article',
                    id: article.id,
                    title: article.title,
                    summary: article.summary,
                    category: article.category,
                    score,
                    url: `/support/articles/${article.slug}`,
                });
            }
        }
        // Search FAQs
        for (const faq of this.faqs.values()) {
            if (options?.category && faq.category !== options.category)
                continue;
            if (options?.locale && faq.locale !== options.locale)
                continue;
            const score = this.calculateSearchScore(searchTerms, faq.question, faq.answer, '', []);
            if (score > 0) {
                results.push({
                    type: 'faq',
                    id: faq.id,
                    title: faq.question,
                    summary: faq.answer.substring(0, 200),
                    category: faq.category,
                    score,
                    url: `/support/faq#${faq.id}`,
                });
            }
        }
        // Sort by score and limit
        results.sort((a, b) => b.score - a.score);
        const limitedResults = results.slice(0, limit);
        return this.wrapInEnvelope(limitedResults, 'search');
    }
    /**
     * Get knowledge base articles
     */
    async getArticles(options) {
        let articles = Array.from(this.articles.values())
            .filter((a) => a.status === 'published')
            .filter((a) => !options?.category || a.category === options.category)
            .filter((a) => !options?.locale || a.locale === options.locale);
        // Sort by views (most popular first)
        articles.sort((a, b) => b.views - a.views);
        if (options?.offset) {
            articles = articles.slice(options.offset);
        }
        if (options?.limit) {
            articles = articles.slice(0, options.limit);
        }
        return this.wrapInEnvelope(articles, 'get_articles');
    }
    /**
     * Get article by slug
     */
    async getArticleBySlug(slug, incrementViews = true) {
        const article = Array.from(this.articles.values()).find((a) => a.slug === slug && a.status === 'published');
        if (article && incrementViews) {
            article.views++;
            await this.updateArticleViews(article.id, article.views);
        }
        return this.wrapInEnvelope(article || null, 'get_article');
    }
    /**
     * Get FAQs
     */
    async getFAQs(options) {
        let faqs = Array.from(this.faqs.values())
            .filter((f) => !options?.category || f.category === options.category)
            .filter((f) => !options?.locale || f.locale === options.locale);
        // Sort by order
        faqs.sort((a, b) => a.order - b.order);
        return this.wrapInEnvelope(faqs, 'get_faqs');
    }
    /**
     * Create support ticket
     */
    async createTicket(tenantId, userId, data) {
        const ticket = {
            id: (0, crypto_1.randomUUID)(),
            tenantId,
            userId,
            subject: data.subject,
            description: data.description,
            type: data.type,
            priority: data.priority || 'medium',
            status: 'open',
            category: data.category || 'troubleshooting',
            tags: [],
            escalationLevel: 0,
            attachments: data.attachments || [],
            messages: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Calculate SLA deadline
        if (this.config.slaConfig.enabled) {
            const sla = this.config.slaConfig.priorities[ticket.priority];
            ticket.slaDeadline = new Date(Date.now() + sla.resolutionMinutes * 60 * 1000);
        }
        // Get governance verdict
        ticket.governanceVerdict = await this.getTicketGovernanceVerdict(ticket);
        // Save ticket
        await this.saveTicket(ticket);
        // Sync to external system if configured
        await this.syncTicketToExternal(ticket);
        logger_js_1.default.info('Support ticket created', {
            ticketId: ticket.id,
            type: ticket.type,
            priority: ticket.priority,
        });
        return this.wrapInEnvelope(ticket, 'create_ticket');
    }
    /**
     * Add message to ticket
     */
    async addMessage(ticketId, authorId, authorType, content, isInternal = false, attachments) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        const message = {
            id: (0, crypto_1.randomUUID)(),
            ticketId,
            authorId,
            authorType,
            content,
            attachments: attachments || [],
            isInternal,
            createdAt: new Date(),
        };
        await pool.query(`INSERT INTO support_ticket_messages (
        id, ticket_id, author_id, author_type, content, attachments, is_internal, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            message.id,
            message.ticketId,
            message.authorId,
            message.authorType,
            message.content,
            JSON.stringify(message.attachments),
            message.isInternal,
            message.createdAt,
        ]);
        // Update ticket status based on who replied
        if (authorType === 'customer') {
            await this.updateTicketStatus(ticketId, 'waiting_on_support');
        }
        else if (authorType === 'agent') {
            await this.updateTicketStatus(ticketId, 'waiting_on_customer');
        }
        return this.wrapInEnvelope(message, 'add_message');
    }
    /**
     * Update ticket status
     */
    async updateTicketStatus(ticketId, status) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        const updates = {
            status,
            updated_at: new Date(),
        };
        if (status === 'resolved') {
            updates.resolved_at = new Date();
        }
        else if (status === 'closed') {
            updates.closed_at = new Date();
        }
        const setClause = Object.keys(updates)
            .map((key, i) => `${key} = $${i + 2}`)
            .join(', ');
        await pool.query(`UPDATE support_tickets SET ${setClause} WHERE id = $1`, [ticketId, ...Object.values(updates)]);
    }
    /**
     * Escalate ticket
     */
    async escalateTicket(ticketId, reason) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        const result = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
        if (result.rowCount === 0) {
            throw new Error(`Ticket not found: ${ticketId}`);
        }
        const ticket = this.mapRowToTicket(result.rows[0]);
        ticket.escalationLevel++;
        ticket.updatedAt = new Date();
        // Find escalation rule
        const rule = this.config.escalationRules.find((r) => r.priority === ticket.priority && r.type === ticket.type);
        if (rule) {
            ticket.assignee = rule.escalateTo;
            // Add system message
            await this.addMessage(ticketId, 'system', 'system', `Ticket escalated to level ${ticket.escalationLevel}. Reason: ${reason}`, true);
            // Notify channels (in production, would trigger notifications)
            logger_js_1.default.info('Ticket escalated', {
                ticketId,
                level: ticket.escalationLevel,
                assignee: ticket.assignee,
                notifyChannels: rule.notifyChannels,
            });
        }
        await pool.query('UPDATE support_tickets SET escalation_level = $2, assignee = $3, updated_at = $4 WHERE id = $1', [ticketId, ticket.escalationLevel, ticket.assignee, ticket.updatedAt]);
        return this.wrapInEnvelope(ticket, 'escalate_ticket');
    }
    /**
     * Check SLA breaches
     */
    async checkSLABreaches() {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return [];
        const result = await pool.query(`SELECT * FROM support_tickets
      WHERE status NOT IN ('resolved', 'closed')
        AND sla_deadline < NOW()
        AND sla_breached = false`);
        const breachedTickets = [];
        for (const row of result.rows) {
            const ticket = this.mapRowToTicket(row);
            breachedTickets.push(ticket);
            // Mark as breached
            await pool.query('UPDATE support_tickets SET sla_breached = true WHERE id = $1', [ticket.id]);
            // Auto-escalate
            await this.escalateTicket(ticket.id, 'SLA breach');
        }
        return breachedTickets;
    }
    /**
     * Vote on article helpfulness
     */
    async voteArticle(articleId, helpful) {
        const article = this.articles.get(articleId);
        if (!article)
            return;
        if (helpful) {
            article.helpfulVotes++;
        }
        else {
            article.notHelpfulVotes++;
        }
        await this.updateArticleVotes(articleId, article.helpfulVotes, article.notHelpfulVotes);
    }
    /**
     * Get support configuration
     */
    getConfig() {
        return this.wrapInEnvelope(this.config, 'get_config');
    }
    // Private helper methods
    getDefaultConfig() {
        return {
            enabled: true,
            knowledgeBaseEnabled: true,
            faqEnabled: true,
            ticketsEnabled: true,
            liveChatEnabled: false,
            defaultLocale: 'en-US',
            supportedLocales: ['en-US', 'es-ES', 'de-DE', 'fr-FR'],
            integrations: [],
            escalationRules: [
                {
                    id: 'critical-immediate',
                    name: 'Critical Ticket Escalation',
                    priority: 'critical',
                    type: 'incident',
                    timeoutMinutes: 30,
                    escalateTo: 'on-call-engineer',
                    notifyChannels: ['slack-incidents', 'pagerduty'],
                    enabled: true,
                },
                {
                    id: 'security-urgent',
                    name: 'Security Ticket Escalation',
                    priority: 'high',
                    type: 'security',
                    timeoutMinutes: 60,
                    escalateTo: 'security-team',
                    notifyChannels: ['slack-security'],
                    enabled: true,
                },
            ],
            slaConfig: {
                enabled: true,
                priorities: {
                    critical: { firstResponseMinutes: 15, resolutionMinutes: 240 },
                    high: { firstResponseMinutes: 60, resolutionMinutes: 480 },
                    medium: { firstResponseMinutes: 240, resolutionMinutes: 1440 },
                    low: { firstResponseMinutes: 480, resolutionMinutes: 2880 },
                },
            },
        };
    }
    calculateSearchScore(terms, title, summary, content, tags) {
        let score = 0;
        const titleLower = title.toLowerCase();
        const summaryLower = summary.toLowerCase();
        const contentLower = content.toLowerCase();
        const tagsLower = tags.map((t) => t.toLowerCase());
        for (const term of terms) {
            // Title matches are highest priority
            if (titleLower.includes(term)) {
                score += 10;
            }
            // Tag matches are high priority
            if (tagsLower.some((t) => t.includes(term))) {
                score += 8;
            }
            // Summary matches
            if (summaryLower.includes(term)) {
                score += 5;
            }
            // Content matches
            if (contentLower.includes(term)) {
                score += 2;
            }
        }
        return score;
    }
    async saveTicket(ticket) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO support_tickets (
        id, external_id, tenant_id, user_id, subject, description, type, priority,
        status, category, tags, assignee, escalation_level, attachments, metadata,
        sla_deadline, governance_verdict, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`, [
            ticket.id,
            ticket.externalId,
            ticket.tenantId,
            ticket.userId,
            ticket.subject,
            ticket.description,
            ticket.type,
            ticket.priority,
            ticket.status,
            ticket.category,
            JSON.stringify(ticket.tags),
            ticket.assignee,
            ticket.escalationLevel,
            JSON.stringify(ticket.attachments),
            JSON.stringify(ticket.metadata),
            ticket.slaDeadline,
            JSON.stringify(ticket.governanceVerdict),
            ticket.createdAt,
            ticket.updatedAt,
        ]);
    }
    async syncTicketToExternal(ticket) {
        const enabledIntegrations = this.config.integrations.filter((i) => i.enabled && i.syncEnabled);
        for (const integration of enabledIntegrations) {
            try {
                // In production, this would call the external API
                logger_js_1.default.info('Syncing ticket to external system', {
                    ticketId: ticket.id,
                    provider: integration.provider,
                });
            }
            catch (error) {
                logger_js_1.default.error('Failed to sync ticket to external system', {
                    ticketId: ticket.id,
                    provider: integration.provider,
                    error,
                });
            }
        }
    }
    async getTicketGovernanceVerdict(ticket) {
        // In production, this would call the governance service
        // to check for sensitive data in the ticket
        return this.createGovernanceVerdict('ticket_creation');
    }
    mapRowToTicket(row) {
        return {
            id: row.id,
            externalId: row.external_id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            subject: row.subject,
            description: row.description,
            type: row.type,
            priority: row.priority,
            status: row.status,
            category: row.category,
            tags: row.tags || [],
            assignee: row.assignee,
            escalationLevel: row.escalation_level,
            attachments: row.attachments || [],
            messages: [],
            metadata: row.metadata || {},
            slaDeadline: row.sla_deadline,
            resolvedAt: row.resolved_at,
            closedAt: row.closed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            governanceVerdict: row.governance_verdict,
        };
    }
    async updateArticleViews(articleId, views) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query('UPDATE knowledge_base_articles SET views = $2 WHERE id = $1', [articleId, views]);
    }
    async updateArticleVotes(articleId, helpful, notHelpful) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query('UPDATE knowledge_base_articles SET helpful_votes = $2, not_helpful_votes = $3 WHERE id = $1', [articleId, helpful, notHelpful]);
    }
    async loadContent() {
        // Load default content
        this.initializeDefaultArticles();
        this.initializeDefaultFAQs();
        // Try to load from database
        const pool = (0, database_js_1.getPostgresPool)();
        if (pool) {
            try {
                const articlesResult = await pool.query("SELECT * FROM knowledge_base_articles WHERE status = 'published'");
                for (const row of articlesResult.rows) {
                    const article = {
                        id: row.id,
                        title: row.title,
                        slug: row.slug,
                        category: row.category,
                        tags: row.tags || [],
                        summary: row.summary,
                        content: row.content,
                        status: row.status,
                        author: row.author,
                        views: row.views,
                        helpfulVotes: row.helpful_votes,
                        notHelpfulVotes: row.not_helpful_votes,
                        relatedArticles: row.related_articles || [],
                        locale: row.locale,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        publishedAt: row.published_at,
                    };
                    this.articles.set(article.id, article);
                }
                logger_js_1.default.info('Loaded knowledge base articles', { count: this.articles.size });
            }
            catch (error) {
                logger_js_1.default.warn('Could not load articles from database', { error });
            }
        }
    }
    initializeDefaultArticles() {
        const defaultArticles = [
            {
                id: 'article-getting-started',
                title: 'Getting Started with Summit',
                slug: 'getting-started',
                category: 'getting_started',
                tags: ['beginner', 'setup', 'tutorial'],
                summary: 'Learn how to set up and start using Summit in minutes.',
                content: `# Getting Started with Summit

Welcome to Summit! This guide will help you get up and running quickly.

## Prerequisites

- A Summit account
- Modern web browser

## Step 1: Login

Navigate to your Summit instance and login with your credentials.

## Step 2: Complete Onboarding

Follow the guided onboarding to set up your workspace.

## Step 3: Explore Features

Start exploring the dashboard, search, and policy management features.

For more details, see our detailed documentation.`,
                status: 'published',
                author: 'Summit Team',
                views: 0,
                helpfulVotes: 0,
                notHelpfulVotes: 0,
                relatedArticles: [],
                locale: 'en-US',
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: new Date(),
            },
            {
                id: 'article-governance-verdicts',
                title: 'Understanding Governance Verdicts',
                slug: 'governance-verdicts',
                category: 'policies',
                tags: ['governance', 'policies', 'compliance'],
                summary: 'Learn how governance verdicts work and what they mean.',
                content: `# Understanding Governance Verdicts

Every operation in Summit includes a governance verdict that indicates whether the action was approved by policy.

## Verdict Types

- **ALLOW** - The operation is permitted
- **DENY** - The operation is blocked by policy
- **FLAG** - The operation is permitted but flagged for review
- **REVIEW_REQUIRED** - The operation requires approval before proceeding

## Reading Verdicts

Each API response includes a governance verdict in the response envelope.`,
                status: 'published',
                author: 'Summit Team',
                views: 0,
                helpfulVotes: 0,
                notHelpfulVotes: 0,
                relatedArticles: [],
                locale: 'en-US',
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedAt: new Date(),
            },
        ];
        for (const article of defaultArticles) {
            this.articles.set(article.id, article);
        }
    }
    initializeDefaultFAQs() {
        const defaultFAQs = [
            {
                id: 'faq-what-is-summit',
                question: 'What is Summit?',
                answer: 'Summit is an AI-augmented intelligence platform that helps organizations analyze, correlate, and report on data with built-in governance and compliance.',
                category: 'getting_started',
                order: 1,
                views: 0,
                locale: 'en-US',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'faq-governance-verdict',
                question: 'What is a governance verdict?',
                answer: 'A governance verdict is an automated policy decision that accompanies every operation in Summit. It indicates whether an action was allowed, denied, or requires review based on your organization\'s policies.',
                category: 'policies',
                order: 1,
                views: 0,
                locale: 'en-US',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'faq-data-security',
                question: 'How is my data secured?',
                answer: 'Summit employs industry-standard security practices including encryption at rest and in transit, role-based access control, audit logging, and compliance with SOC 2, GDPR, and other frameworks.',
                category: 'security',
                order: 1,
                views: 0,
                locale: 'en-US',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        for (const faq of defaultFAQs) {
            this.faqs.set(faq.id, faq);
        }
    }
    createGovernanceVerdict(operation) {
        return {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: `support_${operation}`,
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Support operation permitted',
            evaluator: 'support-center-service',
        };
    }
    wrapInEnvelope(data, operation) {
        return (0, data_envelope_js_1.createDataEnvelope)(data, {
            source: 'support-center-service',
            actor: 'system',
            version: '3.1.0',
            classification: data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: this.createGovernanceVerdict(operation),
        });
    }
}
exports.SupportCenterService = SupportCenterService;
exports.supportCenterService = SupportCenterService.getInstance();
