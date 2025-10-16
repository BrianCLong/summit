/**
 * Help Desk & Customer Support Integration Engine
 * Unified Support System for Documentation
 * Phase 44: Enterprise Customer Support Integration
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface SupportConfig {
  integrations: SupportIntegration[];
  ticketingSystem: TicketingSystemConfig;
  knowledgeBase: KnowledgeBaseConfig;
  chatBot: ChatBotConfig;
  escalation: EscalationConfig;
  analytics: SupportAnalyticsConfig;
}

export interface SupportIntegration {
  id: string;
  name: string;
  type:
    | 'zendesk'
    | 'freshdesk'
    | 'servicenow'
    | 'jira'
    | 'slack'
    | 'teams'
    | 'custom';
  configuration: IntegrationConfig;
  authentication: AuthConfig;
  syncEnabled: boolean;
  bidirectional: boolean;
}

export interface TicketingSystemConfig {
  autoTicketCreation: boolean;
  categorization: CategorizationConfig;
  prioritization: PrioritizationConfig;
  assignment: AssignmentConfig;
  slaConfig: SLAConfig;
  templates: TicketTemplate[];
}

export interface KnowledgeBaseConfig {
  syncWithDocs: boolean;
  searchIntegration: boolean;
  autoSuggestions: boolean;
  contentGeneration: ContentGenerationConfig;
  maintenance: MaintenanceConfig;
}

export interface ChatBotConfig {
  enabled: boolean;
  platform: string;
  aiProvider: 'openai' | 'anthropic' | 'custom';
  capabilities: BotCapability[];
  personality: BotPersonality;
  fallback: FallbackConfig;
}

export interface EscalationConfig {
  rules: EscalationRule[];
  levels: EscalationLevel[];
  notifications: NotificationConfig[];
  timeouts: TimeoutConfig;
}

export class HelpDeskIntegrationEngine extends EventEmitter {
  private config: SupportConfig;
  private integrations: Map<string, ActiveIntegration> = new Map();
  private tickets: Map<string, Ticket> = new Map();
  private chatSessions: Map<string, ChatSession> = new Map();
  private knowledgeBase: KnowledgeBase;

  constructor(config: SupportConfig) {
    super();
    this.config = config;
    this.knowledgeBase = new KnowledgeBase(config.knowledgeBase);
    this.initializeSupport();
  }

  /**
   * Initialize support system
   */
  private async initializeSupport(): Promise<void> {
    await this.setupIntegrations();
    await this.initializeKnowledgeBase();
    await this.setupChatBot();
    await this.configureTicketingSystem();
    await this.startMonitoring();
    this.emit('support:initialized');
  }

  /**
   * Setup all support integrations
   */
  private async setupIntegrations(): Promise<void> {
    for (const integration of this.config.integrations) {
      try {
        const activeIntegration = await this.activateIntegration(integration);
        this.integrations.set(integration.id, activeIntegration);
        this.emit('integration:activated', { integrationId: integration.id });
      } catch (error) {
        this.emit('integration:failed', {
          integrationId: integration.id,
          error,
        });
      }
    }
  }

  /**
   * Activate a specific integration
   */
  private async activateIntegration(
    integration: SupportIntegration,
  ): Promise<ActiveIntegration> {
    // Create integration handler
    const handler = this.createIntegrationHandler(integration);

    // Test connection
    await handler.testConnection();

    // Setup webhooks if bidirectional
    if (integration.bidirectional) {
      await handler.setupWebhooks();
    }

    // Initialize sync if enabled
    if (integration.syncEnabled) {
      await handler.initializeSync();
    }

    return {
      integration,
      handler,
      status: 'active',
      lastSync: new Date(),
      metrics: {
        ticketsCreated: 0,
        ticketsResolved: 0,
        avgResponseTime: 0,
        errorCount: 0,
      },
    };
  }

  /**
   * Create integration handler based on type
   */
  private createIntegrationHandler(
    integration: SupportIntegration,
  ): IntegrationHandler {
    switch (integration.type) {
      case 'zendesk':
        return new ZendeskHandler(integration);
      case 'freshdesk':
        return new FreshdeskHandler(integration);
      case 'servicenow':
        return new ServiceNowHandler(integration);
      case 'jira':
        return new JiraHandler(integration);
      case 'slack':
        return new SlackHandler(integration);
      case 'teams':
        return new TeamsHandler(integration);
      default:
        return new CustomHandler(integration);
    }
  }

  /**
   * Initialize knowledge base with documentation sync
   */
  private async initializeKnowledgeBase(): Promise<void> {
    await this.knowledgeBase.syncWithDocumentation();
    await this.knowledgeBase.buildSearchIndex();
    await this.knowledgeBase.setupAutoSuggestions();

    if (this.config.knowledgeBase.contentGeneration.enabled) {
      await this.knowledgeBase.enableContentGeneration();
    }

    this.emit('knowledgebase:initialized');
  }

  /**
   * Setup intelligent chatbot
   */
  private async setupChatBot(): Promise<void> {
    if (!this.config.chatBot.enabled) return;

    const chatBot = new IntelligentChatBot({
      config: this.config.chatBot,
      knowledgeBase: this.knowledgeBase,
      ticketingSystem: this,
    });

    await chatBot.initialize();
    await chatBot.trainOnDocumentation();
    await chatBot.setupPersonality();

    this.emit('chatbot:initialized');
  }

  /**
   * Create support ticket from documentation issue
   */
  async createTicketFromDocIssue(issue: DocumentationIssue): Promise<Ticket> {
    const ticket: Ticket = {
      id: this.generateTicketId(),
      title: issue.title,
      description: issue.description,
      category: this.categorizeIssue(issue),
      priority: this.prioritizeIssue(issue),
      status: 'open',
      reporter: issue.reporter,
      assignee: await this.assignTicket(issue),
      tags: issue.tags || [],
      metadata: {
        sourceUrl: issue.sourceUrl,
        pageTitle: issue.pageTitle,
        userAgent: issue.userAgent,
        timestamp: new Date(),
      },
      sla: this.calculateSLA(issue),
      timeline: [
        {
          timestamp: new Date(),
          action: 'created',
          actor: 'system',
          details: 'Ticket created from documentation feedback',
        },
      ],
    };

    this.tickets.set(ticket.id, ticket);

    // Sync with integrated systems
    await this.syncTicketWithIntegrations(ticket);

    // Trigger auto-responses
    await this.sendAutoResponse(ticket);

    this.emit('ticket:created', ticket);
    return ticket;
  }

  /**
   * Handle support chat session
   */
  async handleChatSession(
    sessionId: string,
    message: ChatMessage,
  ): Promise<ChatResponse> {
    let session = this.chatSessions.get(sessionId);

    if (!session) {
      session = await this.createChatSession(sessionId, message.user);
    }

    // Add message to session
    session.messages.push(message);

    // Generate response
    const response = await this.generateChatResponse(session, message);

    // Update session
    session.messages.push({
      id: this.generateMessageId(),
      content: response.content,
      timestamp: new Date(),
      user: { id: 'bot', name: 'Documentation Assistant', type: 'bot' },
      type: 'response',
    });

    session.lastActivity = new Date();
    this.chatSessions.set(sessionId, session);

    // Check for escalation
    if (response.shouldEscalate) {
      await this.escalateChatToHuman(session);
    }

    this.emit('chat:response', { sessionId, response });
    return response;
  }

  /**
   * Generate intelligent chat response
   */
  private async generateChatResponse(
    session: ChatSession,
    message: ChatMessage,
  ): Promise<ChatResponse> {
    // Search knowledge base
    const kbResults = await this.knowledgeBase.search(message.content);

    // Check for common patterns
    const intent = await this.detectUserIntent(message.content);

    // Generate contextual response
    let response: string;
    let suggestedActions: SuggestedAction[] = [];
    let shouldEscalate = false;

    switch (intent.type) {
      case 'question':
        if (kbResults.length > 0) {
          response = this.generateAnswerFromKB(kbResults, message.content);
          suggestedActions = this.generateSuggestionsFromKB(kbResults);
        } else {
          response =
            "I couldn't find a specific answer to your question. Let me connect you with a human expert.";
          shouldEscalate = true;
        }
        break;

      case 'bug_report':
        response = this.generateBugReportResponse();
        suggestedActions = [
          {
            type: 'create_ticket',
            label: 'Create Bug Report',
            data: { type: 'bug' },
          },
          { type: 'view_known_issues', label: 'View Known Issues' },
        ];
        break;

      case 'feature_request':
        response = this.generateFeatureRequestResponse();
        suggestedActions = [
          {
            type: 'create_ticket',
            label: 'Submit Feature Request',
            data: { type: 'feature' },
          },
          { type: 'view_roadmap', label: 'View Roadmap' },
        ];
        break;

      case 'documentation_feedback':
        response = this.generateDocumentationFeedbackResponse();
        suggestedActions = [
          {
            type: 'improve_docs',
            label: 'Suggest Improvement',
            data: { page: session.context?.currentPage },
          },
          { type: 'rate_content', label: 'Rate This Page' },
        ];
        break;

      default:
        response = await this.generateGenericResponse(
          message.content,
          session.context,
        );
        suggestedActions = await this.generateContextualSuggestions(session);
    }

    return {
      content: response,
      suggestedActions,
      shouldEscalate,
      confidence: intent.confidence,
      sources: kbResults
        .slice(0, 3)
        .map((r) => ({ title: r.title, url: r.url })),
    };
  }

  /**
   * Escalate issue based on rules
   */
  async escalateIssue(
    ticketId: string,
    reason: EscalationReason,
  ): Promise<EscalationResult> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const escalationRule = this.findApplicableEscalationRule(ticket, reason);
    if (!escalationRule) {
      return {
        escalated: false,
        reason: 'No applicable escalation rule found',
      };
    }

    // Update ticket
    ticket.priority = escalationRule.newPriority || ticket.priority;
    ticket.assignee = escalationRule.assignTo || ticket.assignee;
    ticket.tags.push(`escalated-${reason.type}`);

    // Add timeline entry
    ticket.timeline.push({
      timestamp: new Date(),
      action: 'escalated',
      actor: reason.actor || 'system',
      details: `Escalated due to: ${reason.description}`,
    });

    // Send notifications
    await this.sendEscalationNotifications(ticket, escalationRule);

    // Sync with integrations
    await this.syncTicketWithIntegrations(ticket);

    this.emit('ticket:escalated', { ticketId, rule: escalationRule.id });

    return {
      escalated: true,
      rule: escalationRule.id,
      newAssignee: ticket.assignee,
      newPriority: ticket.priority,
    };
  }

  /**
   * Generate comprehensive support analytics
   */
  async generateSupportAnalytics(): Promise<SupportAnalytics> {
    const analytics: SupportAnalytics = {
      timestamp: new Date(),
      overview: await this.generateSupportOverview(),
      tickets: await this.generateTicketAnalytics(),
      chat: await this.generateChatAnalytics(),
      knowledge: await this.generateKnowledgeBaseAnalytics(),
      performance: await this.generatePerformanceMetrics(),
      satisfaction: await this.generateSatisfactionMetrics(),
    };

    this.emit('analytics:generated', analytics);
    return analytics;
  }

  /**
   * Generate support performance report
   */
  async generatePerformanceReport(
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<SupportPerformanceReport> {
    const report: SupportPerformanceReport = {
      period,
      timestamp: new Date(),
      metrics: {
        totalTickets: await this.getTicketCount(period),
        resolvedTickets: await this.getResolvedTicketCount(period),
        avgResolutionTime: await this.getAvgResolutionTime(period),
        firstResponseTime: await this.getAvgFirstResponseTime(period),
        customerSatisfaction: await this.getAvgSatisfactionScore(period),
        escalationRate: await this.getEscalationRate(period),
      },
      trends: await this.generateTrendAnalysis(period),
      topIssues: await this.getTopIssues(period),
      agentPerformance: await this.getAgentPerformance(period),
      recommendations: await this.generateRecommendations(period),
    };

    return report;
  }

  /**
   * Sync ticket with all active integrations
   */
  private async syncTicketWithIntegrations(ticket: Ticket): Promise<void> {
    const syncPromises = Array.from(this.integrations.values()).map(
      async (integration) => {
        if (integration.integration.syncEnabled) {
          try {
            await integration.handler.syncTicket(ticket);
            integration.metrics.ticketsCreated++;
          } catch (error) {
            integration.metrics.errorCount++;
            this.emit('sync:error', {
              integrationId: integration.integration.id,
              ticketId: ticket.id,
              error,
            });
          }
        }
      },
    );

    await Promise.allSettled(syncPromises);
  }

  /**
   * Auto-categorize issue based on content
   */
  private categorizeIssue(issue: DocumentationIssue): string {
    const content = (issue.title + ' ' + issue.description).toLowerCase();

    if (
      content.includes('bug') ||
      content.includes('error') ||
      content.includes('broken')
    ) {
      return 'bug';
    } else if (content.includes('feature') || content.includes('enhancement')) {
      return 'feature_request';
    } else if (
      content.includes('doc') ||
      content.includes('unclear') ||
      content.includes('confusing')
    ) {
      return 'documentation';
    } else if (content.includes('performance') || content.includes('slow')) {
      return 'performance';
    } else {
      return 'general';
    }
  }

  /**
   * Prioritize issue based on various factors
   */
  private prioritizeIssue(issue: DocumentationIssue): Priority {
    let score = 0;

    // Content analysis
    const content = (issue.title + ' ' + issue.description).toLowerCase();
    if (content.includes('critical') || content.includes('urgent')) score += 3;
    if (content.includes('important') || content.includes('major')) score += 2;
    if (content.includes('minor') || content.includes('cosmetic')) score -= 1;

    // User type
    if (issue.reporter?.type === 'enterprise') score += 2;
    if (issue.reporter?.type === 'premium') score += 1;

    // Page impact
    if (
      issue.sourceUrl?.includes('/api/') ||
      issue.sourceUrl?.includes('/getting-started')
    )
      score += 2;

    // Determine priority
    if (score >= 4) return 'critical';
    if (score >= 2) return 'high';
    if (score >= 0) return 'medium';
    return 'low';
  }

  /**
   * Generate ticket ID
   */
  private generateTicketId(): string {
    return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create new chat session
   */
  private async createChatSession(
    sessionId: string,
    user: ChatUser,
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: sessionId,
      user,
      messages: [],
      startTime: new Date(),
      lastActivity: new Date(),
      status: 'active',
      context: await this.gatherUserContext(user),
      metadata: {},
    };

    return session;
  }

  /**
   * Gather user context for better support
   */
  private async gatherUserContext(user: ChatUser): Promise<UserContext> {
    return {
      userAgent: user.userAgent,
      currentPage: user.currentPage,
      referrer: user.referrer,
      sessionDuration: 0,
      previousInteractions: await this.getPreviousInteractions(user.id),
      preferences: await this.getUserPreferences(user.id),
    };
  }

  // Utility methods
  private async detectUserIntent(
    message: string,
  ): Promise<{ type: string; confidence: number }> {
    // Implement NLP-based intent detection
    const content = message.toLowerCase();

    if (
      content.includes('bug') ||
      content.includes('error') ||
      content.includes('not working')
    ) {
      return { type: 'bug_report', confidence: 0.8 };
    } else if (
      content.includes('feature') ||
      content.includes('add') ||
      content.includes('wish')
    ) {
      return { type: 'feature_request', confidence: 0.7 };
    } else if (
      content.includes('doc') ||
      content.includes('unclear') ||
      content.includes('explain')
    ) {
      return { type: 'documentation_feedback', confidence: 0.6 };
    } else if (
      content.includes('?') ||
      content.includes('how') ||
      content.includes('what')
    ) {
      return { type: 'question', confidence: 0.9 };
    }

    return { type: 'general', confidence: 0.5 };
  }
}

// Base integration handler
abstract class IntegrationHandler {
  constructor(protected integration: SupportIntegration) {}

  abstract testConnection(): Promise<void>;
  abstract setupWebhooks(): Promise<void>;
  abstract initializeSync(): Promise<void>;
  abstract syncTicket(ticket: Ticket): Promise<void>;
}

// Specific integration handlers
class ZendeskHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {
    // Implement Zendesk connection test
  }

  async setupWebhooks(): Promise<void> {
    // Setup Zendesk webhooks
  }

  async initializeSync(): Promise<void> {
    // Initialize Zendesk sync
  }

  async syncTicket(ticket: Ticket): Promise<void> {
    // Sync ticket to Zendesk
  }
}

class FreshdeskHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {
    // Implement Freshdesk connection test
  }

  async setupWebhooks(): Promise<void> {
    // Setup Freshdesk webhooks
  }

  async initializeSync(): Promise<void> {
    // Initialize Freshdesk sync
  }

  async syncTicket(ticket: Ticket): Promise<void> {
    // Sync ticket to Freshdesk
  }
}

// Additional handlers...
class ServiceNowHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {}
  async setupWebhooks(): Promise<void> {}
  async initializeSync(): Promise<void> {}
  async syncTicket(ticket: Ticket): Promise<void> {}
}

class JiraHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {}
  async setupWebhooks(): Promise<void> {}
  async initializeSync(): Promise<void> {}
  async syncTicket(ticket: Ticket): Promise<void> {}
}

class SlackHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {}
  async setupWebhooks(): Promise<void> {}
  async initializeSync(): Promise<void> {}
  async syncTicket(ticket: Ticket): Promise<void> {}
}

class TeamsHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {}
  async setupWebhooks(): Promise<void> {}
  async initializeSync(): Promise<void> {}
  async syncTicket(ticket: Ticket): Promise<void> {}
}

class CustomHandler extends IntegrationHandler {
  async testConnection(): Promise<void> {}
  async setupWebhooks(): Promise<void> {}
  async initializeSync(): Promise<void> {}
  async syncTicket(ticket: Ticket): Promise<void> {}
}

// Knowledge base implementation
class KnowledgeBase {
  constructor(private config: KnowledgeBaseConfig) {}

  async syncWithDocumentation(): Promise<void> {
    // Sync with documentation system
  }

  async buildSearchIndex(): Promise<void> {
    // Build search index
  }

  async setupAutoSuggestions(): Promise<void> {
    // Setup auto-suggestions
  }

  async enableContentGeneration(): Promise<void> {
    // Enable AI content generation
  }

  async search(query: string): Promise<KBResult[]> {
    // Search knowledge base
    return [];
  }
}

// Chatbot implementation
class IntelligentChatBot {
  constructor(private options: any) {}

  async initialize(): Promise<void> {
    // Initialize chatbot
  }

  async trainOnDocumentation(): Promise<void> {
    // Train on documentation content
  }

  async setupPersonality(): Promise<void> {
    // Setup bot personality
  }
}

// Type definitions
export interface ActiveIntegration {
  integration: SupportIntegration;
  handler: IntegrationHandler;
  status: 'active' | 'inactive' | 'error';
  lastSync: Date;
  metrics: IntegrationMetrics;
}

export interface IntegrationMetrics {
  ticketsCreated: number;
  ticketsResolved: number;
  avgResponseTime: number;
  errorCount: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  reporter: User;
  assignee?: string;
  tags: string[];
  metadata: TicketMetadata;
  sla: SLAInfo;
  timeline: TimelineEntry[];
}

export interface DocumentationIssue {
  title: string;
  description: string;
  reporter?: User;
  sourceUrl?: string;
  pageTitle?: string;
  userAgent?: string;
  tags?: string[];
}

export interface ChatSession {
  id: string;
  user: ChatUser;
  messages: ChatMessage[];
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'ended' | 'escalated';
  context?: UserContext;
  metadata: any;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  user: ChatUser;
  type: 'message' | 'response' | 'system';
}

export interface ChatResponse {
  content: string;
  suggestedActions: SuggestedAction[];
  shouldEscalate: boolean;
  confidence: number;
  sources?: ResponseSource[];
}

export interface SuggestedAction {
  type: string;
  label: string;
  data?: any;
}

export interface ResponseSource {
  title: string;
  url: string;
}

export interface SupportAnalytics {
  timestamp: Date;
  overview: SupportOverview;
  tickets: TicketAnalytics;
  chat: ChatAnalytics;
  knowledge: KnowledgeBaseAnalytics;
  performance: SupportPerformanceMetrics;
  satisfaction: SatisfactionMetrics;
}

export interface SupportPerformanceReport {
  period: string;
  timestamp: Date;
  metrics: {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    firstResponseTime: number;
    customerSatisfaction: number;
    escalationRate: number;
  };
  trends: TrendData[];
  topIssues: IssueData[];
  agentPerformance: AgentPerformanceData[];
  recommendations: string[];
}

export interface EscalationResult {
  escalated: boolean;
  rule?: string;
  newAssignee?: string;
  newPriority?: Priority;
  reason?: string;
}

export interface EscalationReason {
  type: string;
  description: string;
  actor?: string;
}

// Supporting type definitions
export interface IntegrationConfig {
  baseUrl: string;
  apiVersion: string;
  timeout: number;
  retries: number;
  [key: string]: any;
}

export interface AuthConfig {
  type: 'api_key' | 'oauth' | 'basic' | 'bearer';
  credentials: any;
}

export interface CategorizationConfig {
  rules: CategorizationRule[];
  defaultCategory: string;
  aiEnabled: boolean;
}

export interface PrioritizationConfig {
  rules: PrioritizationRule[];
  defaultPriority: Priority;
  factors: PriorityFactor[];
}

export interface AssignmentConfig {
  rules: AssignmentRule[];
  roundRobin: boolean;
  skills: SkillMapping[];
}

export interface SLAConfig {
  levels: SLALevel[];
  businessHours: BusinessHours;
  holidays: Date[];
}

export interface TicketTemplate {
  id: string;
  name: string;
  category: string;
  fields: TemplateField[];
}

export interface ContentGenerationConfig {
  enabled: boolean;
  provider: string;
  templates: string[];
}

export interface MaintenanceConfig {
  autoUpdate: boolean;
  schedule: string;
  notifications: boolean;
}

export interface BotCapability {
  name: string;
  enabled: boolean;
  configuration: any;
}

export interface BotPersonality {
  tone: string;
  style: string;
  language: string;
  customization: any;
}

export interface FallbackConfig {
  enabled: boolean;
  threshold: number;
  escalation: boolean;
}

export interface EscalationRule {
  id: string;
  conditions: EscalationCondition[];
  newPriority?: Priority;
  assignTo?: string;
  notifications: string[];
}

export interface EscalationLevel {
  level: number;
  name: string;
  timeout: number;
  assignees: string[];
}

export interface NotificationConfig {
  channel: string;
  template: string;
  recipients: string[];
}

export interface TimeoutConfig {
  response: number;
  resolution: number;
  escalation: number;
}

export interface SupportAnalyticsConfig {
  enabled: boolean;
  retention: number;
  reports: ReportConfig[];
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus =
  | 'open'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'escalated';

export interface User {
  id: string;
  name: string;
  email: string;
  type?: 'free' | 'premium' | 'enterprise';
}

export interface ChatUser extends User {
  userAgent?: string;
  currentPage?: string;
  referrer?: string;
}

export interface TicketMetadata {
  sourceUrl?: string;
  pageTitle?: string;
  userAgent?: string;
  timestamp: Date;
  [key: string]: any;
}

export interface SLAInfo {
  level: string;
  responseTime: number;
  resolutionTime: number;
  breached: boolean;
}

export interface TimelineEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

export interface UserContext {
  userAgent?: string;
  currentPage?: string;
  referrer?: string;
  sessionDuration: number;
  previousInteractions: any[];
  preferences: any;
}

export interface KBResult {
  title: string;
  content: string;
  url: string;
  score: number;
}

// Additional analytics interfaces
export interface SupportOverview {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
}

export interface TicketAnalytics {
  byCategory: Map<string, number>;
  byPriority: Map<string, number>;
  byStatus: Map<string, number>;
  resolutionTimes: number[];
  escalationRate: number;
}

export interface ChatAnalytics {
  totalSessions: number;
  activeSessions: number;
  avgSessionDuration: number;
  resolutionRate: number;
  escalationRate: number;
  topQuestions: string[];
}

export interface KnowledgeBaseAnalytics {
  totalArticles: number;
  searchQueries: number;
  hitRate: number;
  topArticles: string[];
  missingContent: string[];
}

export interface SupportPerformanceMetrics {
  responseTime: {
    avg: number;
    p50: number;
    p90: number;
    p95: number;
  };
  resolutionTime: {
    avg: number;
    p50: number;
    p90: number;
    p95: number;
  };
  throughput: number;
  availability: number;
}

export interface SatisfactionMetrics {
  overallScore: number;
  distribution: Map<number, number>;
  trends: TrendPoint[];
  feedback: FeedbackSummary[];
}

// Additional supporting interfaces
export interface CategorizationRule {
  pattern: string;
  category: string;
  confidence: number;
}

export interface PrioritizationRule {
  conditions: string[];
  priority: Priority;
  weight: number;
}

export interface AssignmentRule {
  conditions: string[];
  assignee: string;
  weight: number;
}

export interface SkillMapping {
  skill: string;
  agents: string[];
}

export interface SLALevel {
  name: string;
  responseTime: number;
  resolutionTime: number;
  conditions: string[];
}

export interface BusinessHours {
  days: number[];
  start: string;
  end: string;
  timezone: string;
}

export interface TemplateField {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface EscalationCondition {
  field: string;
  operator: string;
  value: any;
}

export interface ReportConfig {
  name: string;
  schedule: string;
  recipients: string[];
  format: string;
}

export interface PriorityFactor {
  name: string;
  weight: number;
  rules: any[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
}

export interface IssueData {
  issue: string;
  count: number;
  category: string;
}

export interface AgentPerformanceData {
  agent: string;
  ticketsResolved: number;
  avgResolutionTime: number;
  satisfaction: number;
}

export interface TrendPoint {
  timestamp: Date;
  value: number;
}

export interface FeedbackSummary {
  category: string;
  sentiment: string;
  count: number;
}
