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

import { randomUUID } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';

/**
 * Article category
 */
export type ArticleCategory =
  | 'getting_started'
  | 'features'
  | 'policies'
  | 'integrations'
  | 'plugins'
  | 'compliance'
  | 'troubleshooting'
  | 'api'
  | 'security'
  | 'billing';

/**
 * Article status
 */
export type ArticleStatus = 'draft' | 'published' | 'archived';

/**
 * Knowledge base article
 */
export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  category: ArticleCategory;
  tags: string[];
  summary: string;
  content: string; // Markdown
  status: ArticleStatus;
  author: string;
  views: number;
  helpfulVotes: number;
  notHelpfulVotes: number;
  relatedArticles: string[];
  locale: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * FAQ item
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: ArticleCategory;
  order: number;
  views: number;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Support ticket priority
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Support ticket status
 */
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_on_customer'
  | 'waiting_on_support'
  | 'resolved'
  | 'closed';

/**
 * Support ticket type
 */
export type TicketType =
  | 'question'
  | 'bug'
  | 'feature_request'
  | 'incident'
  | 'compliance'
  | 'security';

/**
 * Support ticket
 */
export interface SupportTicket {
  id: string;
  externalId?: string; // ID in external system (Zendesk, Intercom)
  tenantId: string;
  userId: string;
  subject: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  category: ArticleCategory;
  tags: string[];
  assignee?: string;
  escalationLevel: number;
  attachments: Attachment[];
  messages: TicketMessage[];
  metadata: Record<string, unknown>;
  slaDeadline?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  governanceVerdict?: GovernanceVerdict;
}

/**
 * Ticket attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

/**
 * Ticket message
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'customer' | 'agent' | 'system';
  content: string;
  attachments: Attachment[];
  isInternal: boolean;
  createdAt: Date;
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  id: string;
  name: string;
  priority: TicketPriority;
  type: TicketType;
  timeoutMinutes: number;
  escalateTo: string;
  notifyChannels: string[];
  enabled: boolean;
}

/**
 * External support integration
 */
export interface SupportIntegration {
  id: string;
  provider: 'zendesk' | 'intercom' | 'freshdesk' | 'hubspot';
  enabled: boolean;
  config: Record<string, unknown>;
  syncEnabled: boolean;
  lastSyncAt?: Date;
}

/**
 * Search result
 */
export interface SearchResult {
  type: 'article' | 'faq';
  id: string;
  title: string;
  summary: string;
  category: ArticleCategory;
  score: number;
  url: string;
}

/**
 * Support center configuration
 */
export interface SupportCenterConfig {
  enabled: boolean;
  knowledgeBaseEnabled: boolean;
  faqEnabled: boolean;
  ticketsEnabled: boolean;
  liveChatEnabled: boolean;
  defaultLocale: string;
  supportedLocales: string[];
  integrations: SupportIntegration[];
  escalationRules: EscalationRule[];
  slaConfig: SLAConfig;
}

/**
 * SLA configuration
 */
export interface SLAConfig {
  enabled: boolean;
  priorities: {
    [key in TicketPriority]: {
      firstResponseMinutes: number;
      resolutionMinutes: number;
    };
  };
}

/**
 * Support Center Service
 */
export class SupportCenterService {
  private static instance: SupportCenterService;
  private config: SupportCenterConfig;
  private articles: Map<string, KnowledgeBaseArticle>;
  private faqs: Map<string, FAQItem>;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.articles = new Map();
    this.faqs = new Map();
    this.loadContent();
  }

  public static getInstance(): SupportCenterService {
    if (!SupportCenterService.instance) {
      SupportCenterService.instance = new SupportCenterService();
    }
    return SupportCenterService.instance;
  }

  /**
   * Search knowledge base and FAQs
   */
  async search(
    query: string,
    options?: {
      category?: ArticleCategory;
      locale?: string;
      limit?: number;
    }
  ): Promise<DataEnvelope<SearchResult[]>> {
    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().split(/\s+/);
    const limit = options?.limit || 10;

    // Search articles
    for (const article of this.articles.values()) {
      if (article.status !== 'published') continue;
      if (options?.category && article.category !== options.category) continue;
      if (options?.locale && article.locale !== options.locale) continue;

      const score = this.calculateSearchScore(
        searchTerms,
        article.title,
        article.summary,
        article.content,
        article.tags
      );

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
      if (options?.category && faq.category !== options.category) continue;
      if (options?.locale && faq.locale !== options.locale) continue;

      const score = this.calculateSearchScore(
        searchTerms,
        faq.question,
        faq.answer,
        '',
        []
      );

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
  async getArticles(
    options?: {
      category?: ArticleCategory;
      locale?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<DataEnvelope<KnowledgeBaseArticle[]>> {
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
  async getArticleBySlug(
    slug: string,
    incrementViews: boolean = true
  ): Promise<DataEnvelope<KnowledgeBaseArticle | null>> {
    const article = Array.from(this.articles.values()).find(
      (a) => a.slug === slug && a.status === 'published'
    );

    if (article && incrementViews) {
      article.views++;
      await this.updateArticleViews(article.id, article.views);
    }

    return this.wrapInEnvelope(article || null, 'get_article');
  }

  /**
   * Get FAQs
   */
  async getFAQs(
    options?: {
      category?: ArticleCategory;
      locale?: string;
    }
  ): Promise<DataEnvelope<FAQItem[]>> {
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
  async createTicket(
    tenantId: string,
    userId: string,
    data: {
      subject: string;
      description: string;
      type: TicketType;
      priority?: TicketPriority;
      category?: ArticleCategory;
      attachments?: Attachment[];
    }
  ): Promise<DataEnvelope<SupportTicket>> {
    const ticket: SupportTicket = {
      id: randomUUID(),
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

    logger.info('Support ticket created', {
      ticketId: ticket.id,
      type: ticket.type,
      priority: ticket.priority,
    });

    return this.wrapInEnvelope(ticket, 'create_ticket');
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: string,
    authorId: string,
    authorType: TicketMessage['authorType'],
    content: string,
    isInternal: boolean = false,
    attachments?: Attachment[]
  ): Promise<DataEnvelope<TicketMessage>> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Database not available');

    const message: TicketMessage = {
      id: randomUUID(),
      ticketId,
      authorId,
      authorType,
      content,
      attachments: attachments || [],
      isInternal,
      createdAt: new Date(),
    };

    await pool.query(
      `INSERT INTO support_ticket_messages (
        id, ticket_id, author_id, author_type, content, attachments, is_internal, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        message.id,
        message.ticketId,
        message.authorId,
        message.authorType,
        message.content,
        JSON.stringify(message.attachments),
        message.isInternal,
        message.createdAt,
      ]
    );

    // Update ticket status based on who replied
    if (authorType === 'customer') {
      await this.updateTicketStatus(ticketId, 'waiting_on_support');
    } else if (authorType === 'agent') {
      await this.updateTicketStatus(ticketId, 'waiting_on_customer');
    }

    return this.wrapInEnvelope(message, 'add_message');
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus
  ): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) return;

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };

    if (status === 'resolved') {
      updates.resolved_at = new Date();
    } else if (status === 'closed') {
      updates.closed_at = new Date();
    }

    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    await pool.query(
      `UPDATE support_tickets SET ${setClause} WHERE id = $1`,
      [ticketId, ...Object.values(updates)]
    );
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(
    ticketId: string,
    reason: string
  ): Promise<DataEnvelope<SupportTicket>> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Database not available');

    const result = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [ticketId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    const ticket = this.mapRowToTicket(result.rows[0]);
    ticket.escalationLevel++;
    ticket.updatedAt = new Date();

    // Find escalation rule
    const rule = this.config.escalationRules.find(
      (r: any) => r.priority === ticket.priority && r.type === ticket.type
    );

    if (rule) {
      ticket.assignee = rule.escalateTo;

      // Add system message
      await this.addMessage(
        ticketId,
        'system',
        'system',
        `Ticket escalated to level ${ticket.escalationLevel}. Reason: ${reason}`,
        true
      );

      // Notify channels (in production, would trigger notifications)
      logger.info('Ticket escalated', {
        ticketId,
        level: ticket.escalationLevel,
        assignee: ticket.assignee,
        notifyChannels: rule.notifyChannels,
      });
    }

    await pool.query(
      'UPDATE support_tickets SET escalation_level = $2, assignee = $3, updated_at = $4 WHERE id = $1',
      [ticketId, ticket.escalationLevel, ticket.assignee, ticket.updatedAt]
    );

    return this.wrapInEnvelope(ticket, 'escalate_ticket');
  }

  /**
   * Check SLA breaches
   */
  async checkSLABreaches(): Promise<SupportTicket[]> {
    const pool = getPostgresPool();
    if (!pool) return [];

    const result = await pool.query(
      `SELECT * FROM support_tickets
      WHERE status NOT IN ('resolved', 'closed')
        AND sla_deadline < NOW()
        AND sla_breached = false`
    );

    const breachedTickets: SupportTicket[] = [];

    for (const row of result.rows) {
      const ticket = this.mapRowToTicket(row);
      breachedTickets.push(ticket);

      // Mark as breached
      await pool.query(
        'UPDATE support_tickets SET sla_breached = true WHERE id = $1',
        [ticket.id]
      );

      // Auto-escalate
      await this.escalateTicket(ticket.id, 'SLA breach');
    }

    return breachedTickets;
  }

  /**
   * Vote on article helpfulness
   */
  async voteArticle(
    articleId: string,
    helpful: boolean
  ): Promise<void> {
    const article = this.articles.get(articleId);
    if (!article) return;

    if (helpful) {
      article.helpfulVotes++;
    } else {
      article.notHelpfulVotes++;
    }

    await this.updateArticleVotes(
      articleId,
      article.helpfulVotes,
      article.notHelpfulVotes
    );
  }

  /**
   * Get support configuration
   */
  getConfig(): DataEnvelope<SupportCenterConfig> {
    return this.wrapInEnvelope(this.config, 'get_config');
  }

  // Private helper methods

  private getDefaultConfig(): SupportCenterConfig {
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

  private calculateSearchScore(
    terms: string[],
    title: string,
    summary: string,
    content: string,
    tags: string[]
  ): number {
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

  private async saveTicket(ticket: SupportTicket): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(
      `INSERT INTO support_tickets (
        id, external_id, tenant_id, user_id, subject, description, type, priority,
        status, category, tags, assignee, escalation_level, attachments, metadata,
        sla_deadline, governance_verdict, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
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
      ]
    );
  }

  private async syncTicketToExternal(ticket: SupportTicket): Promise<void> {
    const enabledIntegrations = this.config.integrations.filter(
      (i) => i.enabled && i.syncEnabled
    );

    for (const integration of enabledIntegrations) {
      try {
        // In production, this would call the external API
        logger.info('Syncing ticket to external system', {
          ticketId: ticket.id,
          provider: integration.provider,
        });
      } catch (error: any) {
        logger.error('Failed to sync ticket to external system', {
          ticketId: ticket.id,
          provider: integration.provider,
          error,
        });
      }
    }
  }

  private async getTicketGovernanceVerdict(ticket: SupportTicket): Promise<GovernanceVerdict> {
    // In production, this would call the governance service
    // to check for sensitive data in the ticket
    return this.createGovernanceVerdict('ticket_creation');
  }

  private mapRowToTicket(row: any): SupportTicket {
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

  private async updateArticleViews(articleId: string, views: number): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(
      'UPDATE knowledge_base_articles SET views = $2 WHERE id = $1',
      [articleId, views]
    );
  }

  private async updateArticleVotes(
    articleId: string,
    helpful: number,
    notHelpful: number
  ): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) return;

    await pool.query(
      'UPDATE knowledge_base_articles SET helpful_votes = $2, not_helpful_votes = $3 WHERE id = $1',
      [articleId, helpful, notHelpful]
    );
  }

  private async loadContent(): Promise<void> {
    // Load default content
    this.initializeDefaultArticles();
    this.initializeDefaultFAQs();

    // Try to load from database
    const pool = getPostgresPool();
    if (pool) {
      try {
        const articlesResult = await pool.query(
          "SELECT * FROM knowledge_base_articles WHERE status = 'published'"
        );

        for (const row of articlesResult.rows) {
          const article: KnowledgeBaseArticle = {
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

        logger.info('Loaded knowledge base articles', { count: this.articles.size });
      } catch (error: any) {
        logger.warn('Could not load articles from database', { error });
      }
    }
  }

  private initializeDefaultArticles(): void {
    const defaultArticles: KnowledgeBaseArticle[] = [
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

  private initializeDefaultFAQs(): void {
    const defaultFAQs: FAQItem[] = [
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

  private createGovernanceVerdict(operation: string): GovernanceVerdict {
    return {
      verdictId: randomUUID(),
      policyId: `support_${operation}`,
      result: GovernanceResult.ALLOW,
      decidedAt: new Date(),
      reason: 'Support operation permitted',
      evaluator: 'support-center-service',
    };
  }

  private wrapInEnvelope<T>(data: T, operation: string): DataEnvelope<T> {
    return createDataEnvelope(data, {
      source: 'support-center-service',
      actor: 'system',
      version: '3.1.0',
      classification: DataClassification.INTERNAL,
      governanceVerdict: this.createGovernanceVerdict(operation),
    });
  }
}

export const supportCenterService = SupportCenterService.getInstance();
