/**
 * Enhanced Onboarding Service
 *
 * Provides guided tours, sample content, and analytics for user education.
 * Extends the base onboarding with feature adoption tracking.
 *
 * SOC 2 Controls: CC6.1, CC7.2, PI1.1
 *
 * @module onboarding/EnhancedOnboardingService
 */

import { randomUUID, createHash } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import {
  OnboardingFlow,
  OnboardingStepDefinition,
  UserOnboardingProgress,
  StepProgress,
  OnboardingMetrics,
  OnboardingPersona,
  OnboardingStepStatus,
  OnboardingAnalyticsEvent,
  OnboardingEventType,
  SampleContent,
  ContextualHelp,
  FrictionPoint,
  OnboardingConfig,
  OnboardingAnalyticsSummary,
} from './types.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';

/**
 * Default onboarding configuration
 */
const DEFAULT_CONFIG: OnboardingConfig = {
  enabled: true,
  autoDetectPersona: true,
  showProgress: true,
  allowSkipping: true,
  collectStepFeedback: true,
  requireAnalyticsOptIn: true,
  supportedLocales: ['en-US'],
  defaultLocale: 'en-US',
};

/**
 * Enhanced Onboarding Service
 *
 * Manages user onboarding flows with guided tours, sample content,
 * and privacy-respecting analytics.
 */
export class EnhancedOnboardingService {
  private static instance: EnhancedOnboardingService;
  private config: OnboardingConfig;
  private flows: Map<string, OnboardingFlow>;
  private sampleContent: Map<string, SampleContent>;
  private contextualHelp: Map<string, ContextualHelp>;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.flows = new Map();
    this.sampleContent = new Map();
    this.contextualHelp = new Map();
    this.initializeDefaultFlows();
    this.initializeSampleContent();
    this.initializeContextualHelp();
  }

  public static getInstance(): EnhancedOnboardingService {
    if (!EnhancedOnboardingService.instance) {
      EnhancedOnboardingService.instance = new EnhancedOnboardingService();
    }
    return EnhancedOnboardingService.instance;
  }

  /**
   * Start or resume onboarding for a user
   */
  async startOnboarding(
    tenantId: string,
    userId: string,
    persona?: OnboardingPersona,
    locale?: string
  ): Promise<DataEnvelope<UserOnboardingProgress>> {
    // Auto-detect persona if not provided
    const detectedPersona = persona || (await this.detectPersona(tenantId, userId));
    const flow = this.getFlowForPersona(detectedPersona);

    if (!flow) {
      throw new Error(`No onboarding flow found for persona: ${detectedPersona}`);
    }

    // Check for existing progress
    let progress = await this.getProgress(tenantId, userId);

    if (!progress) {
      // Create new progress record
      progress = {
        id: randomUUID(),
        tenantId,
        userId,
        flowId: flow.id,
        persona: detectedPersona,
        currentStepId: flow.steps[0].id,
        stepProgress: new Map(),
        startedAt: new Date(),
        lastActivityAt: new Date(),
        totalTimeSpent: 0,
        metrics: {
          totalSteps: flow.steps.length,
          completedSteps: 0,
          skippedSteps: 0,
          avgTimePerStep: 0,
          quizScores: [],
          featuresDiscovered: [],
          helpRequests: 0,
          frictionPoints: [],
        },
      };

      await this.saveProgress(progress);

      // Track analytics event
      await this.trackEvent(tenantId, userId, 'flow_started', {
        flowId: flow.id,
        persona: detectedPersona,
      });
    }

    // Create governance verdict
    const verdict = this.createGovernanceVerdict('onboarding_access', 'allow');

    return createDataEnvelope(progress, {
      source: 'onboarding-service',
      actor: userId,
      version: '3.1.0',
      classification: DataClassification.INTERNAL,
      governanceVerdict: verdict,
    });
  }

  /**
   * Get current onboarding step with content
   */
  async getCurrentStep(
    tenantId: string,
    userId: string
  ): Promise<DataEnvelope<{ step: OnboardingStepDefinition; progress: StepProgress } | null>> {
    const progress = await this.getProgress(tenantId, userId);

    if (!progress) {
      return this.wrapInEnvelope(null, userId, 'get_current_step');
    }

    const flow = this.flows.get(progress.flowId);
    if (!flow) {
      return this.wrapInEnvelope(null, userId, 'get_current_step');
    }

    const currentStep = flow.steps.find((s) => s.id === progress.currentStepId);
    if (!currentStep) {
      return this.wrapInEnvelope(null, userId, 'get_current_step');
    }

    // Get or create step progress
    let stepProgress = progress.stepProgress.get(currentStep.id);
    if (!stepProgress) {
      stepProgress = {
        stepId: currentStep.id,
        status: 'available',
        timeSpent: 0,
        actionsCompleted: [],
      };
    }

    // Track step started if not already in progress
    if (stepProgress.status === 'available') {
      stepProgress.status = 'in_progress';
      stepProgress.startedAt = new Date();
      progress.stepProgress.set(currentStep.id, stepProgress);
      await this.saveProgress(progress);

      await this.trackEvent(tenantId, userId, 'step_started', {
        stepId: currentStep.id,
        stepType: currentStep.type,
      });
    }

    return this.wrapInEnvelope({ step: currentStep, progress: stepProgress }, userId, 'get_current_step');
  }

  /**
   * Complete current onboarding step
   */
  async completeStep(
    tenantId: string,
    userId: string,
    stepId: string,
    data?: {
      quizScore?: number;
      feedbackRating?: number;
      feedbackComment?: string;
      actionsCompleted?: string[];
    }
  ): Promise<DataEnvelope<UserOnboardingProgress>> {
    const progress = await this.getProgress(tenantId, userId);
    if (!progress) {
      throw new Error('No onboarding progress found');
    }

    const flow = this.flows.get(progress.flowId);
    if (!flow) {
      throw new Error('Onboarding flow not found');
    }

    // Verify step is current
    if (progress.currentStepId !== stepId) {
      throw new Error('Step is not the current step');
    }

    // Update step progress
    let stepProgress = progress.stepProgress.get(stepId) || {
      stepId,
      status: 'in_progress' as OnboardingStepStatus,
      timeSpent: 0,
      actionsCompleted: [],
    };

    stepProgress.status = 'completed';
    stepProgress.completedAt = new Date();
    stepProgress.timeSpent = stepProgress.startedAt
      ? Math.floor((Date.now() - stepProgress.startedAt.getTime()) / 1000)
      : 0;

    if (data?.quizScore !== undefined) {
      stepProgress.quizScore = data.quizScore;
      progress.metrics.quizScores.push(data.quizScore);
    }

    if (data?.feedbackRating !== undefined) {
      stepProgress.feedbackRating = data.feedbackRating;
    }

    if (data?.feedbackComment) {
      stepProgress.feedbackComment = data.feedbackComment;
    }

    if (data?.actionsCompleted) {
      stepProgress.actionsCompleted = data.actionsCompleted;
    }

    progress.stepProgress.set(stepId, stepProgress);
    progress.metrics.completedSteps++;
    progress.totalTimeSpent += stepProgress.timeSpent;
    progress.lastActivityAt = new Date();

    // Move to next step
    const currentIndex = flow.steps.findIndex((s) => s.id === stepId);
    if (currentIndex < flow.steps.length - 1) {
      progress.currentStepId = flow.steps[currentIndex + 1].id;
    } else {
      // Flow completed
      progress.completedAt = new Date();
      await this.trackEvent(tenantId, userId, 'flow_completed', {
        flowId: flow.id,
        totalTime: progress.totalTimeSpent,
        completionRate: progress.metrics.completedSteps / progress.metrics.totalSteps,
      });
    }

    // Calculate avg time per step
    progress.metrics.avgTimePerStep = progress.totalTimeSpent / progress.metrics.completedSteps;

    await this.saveProgress(progress);

    // Track step completion
    await this.trackEvent(tenantId, userId, 'step_completed', {
      stepId,
      timeSpent: stepProgress.timeSpent,
      quizScore: stepProgress.quizScore,
    });

    return this.wrapInEnvelope(progress, userId, 'complete_step');
  }

  /**
   * Skip current onboarding step
   */
  async skipStep(
    tenantId: string,
    userId: string,
    stepId: string,
    reason?: string
  ): Promise<DataEnvelope<UserOnboardingProgress>> {
    const progress = await this.getProgress(tenantId, userId);
    if (!progress) {
      throw new Error('No onboarding progress found');
    }

    const flow = this.flows.get(progress.flowId);
    if (!flow) {
      throw new Error('Onboarding flow not found');
    }

    const step = flow.steps.find((s) => s.id === stepId);
    if (!step?.skippable && !this.config.allowSkipping) {
      throw new Error('This step cannot be skipped');
    }

    // Update step progress
    let stepProgress = progress.stepProgress.get(stepId) || {
      stepId,
      status: 'in_progress' as OnboardingStepStatus,
      timeSpent: 0,
      actionsCompleted: [],
    };

    stepProgress.status = 'skipped';
    progress.stepProgress.set(stepId, stepProgress);
    progress.metrics.skippedSteps++;
    progress.lastActivityAt = new Date();

    // Move to next step
    const currentIndex = flow.steps.findIndex((s) => s.id === stepId);
    if (currentIndex < flow.steps.length - 1) {
      progress.currentStepId = flow.steps[currentIndex + 1].id;
    } else {
      progress.completedAt = new Date();
    }

    await this.saveProgress(progress);

    // Track skip event
    await this.trackEvent(tenantId, userId, 'step_skipped', {
      stepId,
      reason,
    });

    return this.wrapInEnvelope(progress, userId, 'skip_step');
  }

  /**
   * Get sample content for persona
   */
  async getSampleContent(
    persona: OnboardingPersona,
    type?: string
  ): Promise<DataEnvelope<SampleContent[]>> {
    const samples = Array.from(this.sampleContent.values()).filter((s) => {
      const matchesPersona = s.persona.includes(persona);
      const matchesType = !type || s.type === type;
      return matchesPersona && matchesType;
    });

    return this.wrapInEnvelope(samples, 'system', 'get_sample_content');
  }

  /**
   * Install sample content for user
   */
  async installSampleContent(
    tenantId: string,
    userId: string,
    sampleId: string
  ): Promise<DataEnvelope<{ installed: boolean; resourceId: string }>> {
    const sample = this.sampleContent.get(sampleId);
    if (!sample) {
      throw new Error('Sample content not found');
    }

    if (!sample.installable) {
      throw new Error('This sample content cannot be installed');
    }

    // Install based on type
    let resourceId: string;

    switch (sample.type) {
      case 'policy':
        resourceId = await this.installSamplePolicy(tenantId, userId, sample);
        break;
      case 'dashboard':
        resourceId = await this.installSampleDashboard(tenantId, userId, sample);
        break;
      case 'report':
        resourceId = await this.installSampleReport(tenantId, userId, sample);
        break;
      default:
        throw new Error(`Unsupported sample type: ${sample.type}`);
    }

    // Track installation
    await this.trackEvent(tenantId, userId, 'sample_installed', {
      sampleId,
      sampleType: sample.type,
      resourceId,
    });

    // Update progress metrics
    const progress = await this.getProgress(tenantId, userId);
    if (progress) {
      progress.metrics.featuresDiscovered.push(sample.type);
      await this.saveProgress(progress);
    }

    return this.wrapInEnvelope({ installed: true, resourceId }, userId, 'install_sample');
  }

  /**
   * Get contextual help for a page/component
   */
  async getContextualHelp(
    route: string,
    userId: string
  ): Promise<DataEnvelope<ContextualHelp[]>> {
    const helps = Array.from(this.contextualHelp.values()).filter((h) => {
      return !h.targetRoute || h.targetRoute === route;
    });

    // Sort by priority
    helps.sort((a, b) => b.priority - a.priority);

    return this.wrapInEnvelope(helps, userId, 'get_contextual_help');
  }

  /**
   * Record help request (for friction analysis)
   */
  async recordHelpRequest(
    tenantId: string,
    userId: string,
    stepId?: string,
    topic?: string
  ): Promise<void> {
    const progress = await this.getProgress(tenantId, userId);
    if (progress) {
      progress.metrics.helpRequests++;

      if (stepId) {
        progress.metrics.frictionPoints.push({
          stepId,
          type: 'help_request',
          timestamp: new Date(),
          details: topic,
        });
      }

      await this.saveProgress(progress);
    }

    await this.trackEvent(tenantId, userId, 'help_requested', {
      stepId,
      topic,
    });
  }

  /**
   * Record friction point
   */
  async recordFrictionPoint(
    tenantId: string,
    userId: string,
    stepId: string,
    type: FrictionPoint['type'],
    details?: string
  ): Promise<void> {
    const progress = await this.getProgress(tenantId, userId);
    if (progress) {
      progress.metrics.frictionPoints.push({
        stepId,
        type,
        timestamp: new Date(),
        details,
      });
      await this.saveProgress(progress);
    }

    await this.trackEvent(tenantId, userId, 'friction_detected', {
      stepId,
      frictionType: type,
      details,
    });
  }

  /**
   * Get aggregated onboarding analytics (for product team)
   */
  async getAnalyticsSummary(
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<DataEnvelope<OnboardingAnalyticsSummary>> {
    const pool = getPostgresPool();
    if (!pool) {
      throw new Error('Database not available');
    }

    // Query aggregated metrics (anonymized)
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT id) as total_started,
        COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN id END) as total_completed,
        AVG(total_time_spent) as avg_completion_time,
        persona,
        metrics
      FROM onboarding_progress
      WHERE started_at BETWEEN $1 AND $2
      GROUP BY persona, metrics`,
      [startDate, endDate]
    );

    // Calculate aggregated metrics
    const totalStarted = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.total_started), 0);
    const totalCompleted = result.rows.reduce((sum: number, r: any) => sum + parseInt(r.total_completed), 0);

    const summary: OnboardingAnalyticsSummary = {
      period,
      startDate,
      endDate,
      metrics: {
        totalFlowsStarted: totalStarted,
        totalFlowsCompleted: totalCompleted,
        completionRate: totalStarted > 0 ? totalCompleted / totalStarted : 0,
        avgCompletionTime: result.rows[0]?.avg_completion_time || 0,
        dropOffByStep: new Map(),
        featureAdoptionRates: new Map(),
        topFrictionPoints: [],
        personaBreakdown: new Map(),
      },
      governanceVerdict: this.createGovernanceVerdict('analytics_access', 'allow'),
      classification: DataClassification.INTERNAL,
    };

    return this.wrapInEnvelope(summary, 'system', 'get_analytics');
  }

  // Private helper methods

  private async detectPersona(tenantId: string, userId: string): Promise<OnboardingPersona> {
    // In a full implementation, this would query user roles
    // For now, default to analyst
    return 'analyst';
  }

  private getFlowForPersona(persona: OnboardingPersona): OnboardingFlow | undefined {
    return Array.from(this.flows.values()).find((f) => f.persona === persona);
  }

  private async getProgress(tenantId: string, userId: string): Promise<UserOnboardingProgress | null> {
    const pool = getPostgresPool();
    if (!pool) return null;

    const result = await pool.query(
      'SELECT * FROM onboarding_progress WHERE tenant_id = $1 AND user_id = $2',
      [tenantId, userId]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      flowId: row.flow_id,
      persona: row.persona,
      currentStepId: row.current_step_id,
      stepProgress: new Map(Object.entries(row.step_progress || {})),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      lastActivityAt: row.last_activity_at,
      totalTimeSpent: row.total_time_spent,
      metrics: row.metrics,
    };
  }

  private async saveProgress(progress: UserOnboardingProgress): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Database not available');

    await pool.query(
      `INSERT INTO onboarding_progress (
        id, tenant_id, user_id, flow_id, persona, current_step_id,
        step_progress, started_at, completed_at, last_activity_at,
        total_time_spent, metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        current_step_id = EXCLUDED.current_step_id,
        step_progress = EXCLUDED.step_progress,
        completed_at = EXCLUDED.completed_at,
        last_activity_at = NOW(),
        total_time_spent = EXCLUDED.total_time_spent,
        metrics = EXCLUDED.metrics`,
      [
        progress.id,
        progress.tenantId,
        progress.userId,
        progress.flowId,
        progress.persona,
        progress.currentStepId,
        JSON.stringify(Object.fromEntries(progress.stepProgress)),
        progress.startedAt,
        progress.completedAt,
        new Date(),
        progress.totalTimeSpent,
        JSON.stringify(progress.metrics),
      ]
    );
  }

  private async trackEvent(
    tenantId: string,
    userId: string,
    eventType: OnboardingEventType,
    properties: Record<string, unknown>
  ): Promise<void> {
    const event: OnboardingAnalyticsEvent = {
      eventId: randomUUID(),
      eventType,
      tenantHash: this.hashIdentifier(tenantId),
      userHash: this.hashIdentifier(userId),
      flowId: properties.flowId as string || 'unknown',
      stepId: properties.stepId as string,
      timestamp: new Date(),
      properties,
      governanceVerdict: this.createGovernanceVerdict('analytics_collection', 'allow'),
    };

    // Store event (in production, this would go to analytics pipeline)
    logger.info('Onboarding analytics event', { event });

    // Also persist to database for aggregation
    const pool = getPostgresPool();
    if (pool) {
      await pool.query(
        `INSERT INTO onboarding_analytics_events (
          event_id, event_type, tenant_hash, user_hash, flow_id, step_id,
          timestamp, properties, governance_verdict
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          event.eventId,
          event.eventType,
          event.tenantHash,
          event.userHash,
          event.flowId,
          event.stepId,
          event.timestamp,
          JSON.stringify(event.properties),
          JSON.stringify(event.governanceVerdict),
        ]
      );
    }
  }

  private hashIdentifier(id: string): string {
    const salt = process.env.ANALYTICS_SALT || 'summit-onboarding';
    return createHash('sha256').update(`${salt}:${id}`).digest('hex').substring(0, 16);
  }

  private createGovernanceVerdict(policyId: string, result: 'allow' | 'deny'): GovernanceVerdict {
    return {
      verdictId: randomUUID(),
      policyId,
      result: result === 'allow' ? GovernanceResult.ALLOW : GovernanceResult.DENY,
      decidedAt: new Date(),
      reason: result === 'allow' ? 'Access permitted by policy' : 'Access denied by policy',
      evaluator: 'onboarding-service',
    };
  }

  private wrapInEnvelope<T>(data: T, actor: string, operation: string): DataEnvelope<T> {
    return createDataEnvelope(data, {
      source: 'onboarding-service',
      actor,
      version: '3.1.0',
      classification: DataClassification.INTERNAL,
      governanceVerdict: this.createGovernanceVerdict(`onboarding_${operation}`, 'allow'),
    });
  }

  // Sample content installation helpers

  private async installSamplePolicy(
    tenantId: string,
    userId: string,
    sample: SampleContent
  ): Promise<string> {
    // In production, this would call PolicyService
    const policyId = randomUUID();
    logger.info('Installing sample policy', { tenantId, policyId, sample: sample.name });
    return policyId;
  }

  private async installSampleDashboard(
    tenantId: string,
    userId: string,
    sample: SampleContent
  ): Promise<string> {
    // In production, this would call DashboardService
    const dashboardId = randomUUID();
    logger.info('Installing sample dashboard', { tenantId, dashboardId, sample: sample.name });
    return dashboardId;
  }

  private async installSampleReport(
    tenantId: string,
    userId: string,
    sample: SampleContent
  ): Promise<string> {
    // In production, this would call ReportService
    const reportId = randomUUID();
    logger.info('Installing sample report', { tenantId, reportId, sample: sample.name });
    return reportId;
  }

  // Initialization methods for default content

  private initializeDefaultFlows(): void {
    // Admin onboarding flow
    const adminFlow: OnboardingFlow = {
      id: 'admin-onboarding-v1',
      name: 'Administrator Onboarding',
      description: 'Complete setup guide for platform administrators',
      persona: 'admin',
      estimatedDuration: 30,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      prerequisites: [],
      steps: [
        {
          id: 'admin-welcome',
          type: 'welcome',
          title: 'Welcome to Summit',
          description: 'Get started with your administrator journey',
          estimatedDuration: 60,
          order: 1,
          skippable: false,
          prerequisites: [],
          requiredActions: [],
          completionCriteria: { type: 'time_spent', minTimeSpent: 30 },
          content: {
            body: `# Welcome, Administrator!

You're about to set up Summit for your organization. This guide will walk you through:

1. **User & Access Management** - Configure SSO, roles, and permissions
2. **Policy Configuration** - Set up governance policies
3. **Integration Setup** - Connect your existing tools
4. **Monitoring & Compliance** - Configure dashboards and alerts

Let's get started!`,
            tips: [
              'You can always access this guide from the Help menu',
              'Each step includes sample configurations to accelerate setup',
            ],
            docsLinks: [
              { title: 'Admin Guide', url: '/docs/admin-guide', type: 'guide' },
              { title: 'Quick Start Video', url: '/docs/videos/quickstart', type: 'video' },
            ],
          },
        },
        {
          id: 'admin-users',
          type: 'interactive',
          title: 'Configure User Access',
          description: 'Set up SSO and user management',
          estimatedDuration: 300,
          order: 2,
          skippable: true,
          prerequisites: ['admin-welcome'],
          requiredActions: [
            {
              id: 'configure-sso',
              type: 'configure',
              description: 'Configure SSO provider',
              verificationMethod: 'api_check',
            },
          ],
          completionCriteria: { type: 'all_actions' },
          content: {
            body: `# Configure User Access

Set up how users will authenticate and what they can access.`,
            tourTargets: [
              {
                selector: '#settings-menu',
                tooltip: 'Click Settings to access user management',
                position: 'bottom',
                action: 'click',
                order: 1,
              },
              {
                selector: '#sso-config',
                tooltip: 'Configure your SSO provider here',
                position: 'right',
                action: 'click',
                order: 2,
              },
            ],
          },
        },
        {
          id: 'admin-policies',
          type: 'sample_action',
          title: 'Create Your First Policy',
          description: 'Set up a governance policy using our templates',
          estimatedDuration: 240,
          order: 3,
          skippable: true,
          prerequisites: ['admin-users'],
          requiredActions: [
            {
              id: 'create-policy',
              type: 'create',
              description: 'Create a sample policy',
              verificationMethod: 'api_check',
            },
          ],
          completionCriteria: { type: 'all_actions' },
          content: {
            body: `# Create Your First Policy

Policies define what actions are allowed in your organization.`,
            sampleAction: {
              type: 'create_policy',
              targetResource: 'policies',
              sampleData: {
                name: 'Data Access Policy',
                type: 'access_control',
                rules: [
                  { action: 'read', resource: '*', condition: 'authenticated' },
                ],
              },
              expectedOutcome: 'Policy created and active',
              rollbackOnComplete: false,
            },
          },
        },
        {
          id: 'admin-complete',
          type: 'milestone',
          title: 'Setup Complete!',
          description: 'Congratulations on completing the admin setup',
          estimatedDuration: 60,
          order: 4,
          skippable: false,
          prerequisites: ['admin-policies'],
          requiredActions: [],
          completionCriteria: { type: 'time_spent', minTimeSpent: 10 },
          content: {
            body: `# Congratulations!

You've completed the initial administrator setup. Here's what you've accomplished:

- ✅ User access configured
- ✅ First policy created
- ✅ Platform ready for users

## Next Steps

- Invite team members
- Explore advanced policies
- Set up integrations`,
            docsLinks: [
              { title: 'Advanced Admin Guide', url: '/docs/admin-advanced', type: 'guide' },
              { title: 'Integration Catalog', url: '/docs/integrations', type: 'reference' },
            ],
          },
        },
      ],
    };

    // Analyst onboarding flow
    const analystFlow: OnboardingFlow = {
      id: 'analyst-onboarding-v1',
      name: 'Analyst Onboarding',
      description: 'Get started with intelligence analysis',
      persona: 'analyst',
      estimatedDuration: 20,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      prerequisites: [],
      steps: [
        {
          id: 'analyst-welcome',
          type: 'welcome',
          title: 'Welcome to Summit',
          description: 'Your intelligence analysis platform',
          estimatedDuration: 60,
          order: 1,
          skippable: false,
          prerequisites: [],
          requiredActions: [],
          completionCriteria: { type: 'time_spent', minTimeSpent: 30 },
          content: {
            body: `# Welcome, Analyst!

Summit helps you analyze, correlate, and report on intelligence data.

**Key Features:**
- 🔍 Advanced entity search
- 📊 Interactive dashboards
- 🔗 Relationship mapping
- 📝 Collaborative reporting`,
          },
        },
        {
          id: 'analyst-search',
          type: 'interactive',
          title: 'Your First Search',
          description: 'Learn to search and filter entities',
          estimatedDuration: 180,
          order: 2,
          skippable: true,
          prerequisites: ['analyst-welcome'],
          requiredActions: [
            {
              id: 'perform-search',
              type: 'navigate',
              description: 'Perform a search',
              targetRoute: '/search',
              verificationMethod: 'event_listener',
            },
          ],
          completionCriteria: { type: 'all_actions' },
          content: {
            body: `# Search Entities

The search feature lets you find any entity in your intelligence database.`,
            tourTargets: [
              {
                selector: '#global-search',
                tooltip: 'Type your search query here',
                position: 'bottom',
                action: 'input',
                order: 1,
              },
              {
                selector: '#search-filters',
                tooltip: 'Use filters to narrow results',
                position: 'left',
                action: 'click',
                order: 2,
              },
            ],
          },
        },
        {
          id: 'analyst-dashboard',
          type: 'sample_action',
          title: 'Explore Dashboards',
          description: 'View and customize your analytics dashboard',
          estimatedDuration: 180,
          order: 3,
          skippable: true,
          prerequisites: ['analyst-search'],
          requiredActions: [
            {
              id: 'view-dashboard',
              type: 'navigate',
              description: 'Open the analytics dashboard',
              targetRoute: '/dashboard',
              verificationMethod: 'event_listener',
            },
          ],
          completionCriteria: { type: 'all_actions' },
          content: {
            body: `# Analytics Dashboards

Dashboards give you real-time visibility into your intelligence data.`,
          },
        },
      ],
    };

    // Developer onboarding flow
    const developerFlow: OnboardingFlow = {
      id: 'developer-onboarding-v1',
      name: 'Developer Onboarding',
      description: 'Build plugins and integrations',
      persona: 'developer',
      estimatedDuration: 25,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      prerequisites: [],
      steps: [
        {
          id: 'dev-welcome',
          type: 'welcome',
          title: 'Welcome, Developer!',
          description: 'Start building with Summit',
          estimatedDuration: 60,
          order: 1,
          skippable: false,
          prerequisites: [],
          requiredActions: [],
          completionCriteria: { type: 'time_spent', minTimeSpent: 30 },
          content: {
            body: `# Welcome to Summit Developer Platform

Build powerful plugins and integrations using our SDK.

**What you'll learn:**
- Plugin SDK basics
- API authentication
- Sandbox testing
- Marketplace publishing`,
            docsLinks: [
              { title: 'SDK Documentation', url: '/docs/sdk', type: 'reference' },
              { title: 'API Reference', url: '/docs/api', type: 'reference' },
            ],
          },
        },
        {
          id: 'dev-sdk',
          type: 'checklist',
          title: 'Set Up Your Environment',
          description: 'Install the SDK and configure your development environment',
          estimatedDuration: 300,
          order: 2,
          skippable: false,
          prerequisites: ['dev-welcome'],
          requiredActions: [],
          completionCriteria: { type: 'all_actions' },
          content: {
            body: `# Development Environment Setup`,
            checklistItems: [
              { id: 'install-cli', label: 'Install Summit CLI', completed: false, autoCheck: false },
              { id: 'create-api-key', label: 'Create API key', completed: false, autoCheck: true, verificationEndpoint: '/api/v1/developer/keys' },
              { id: 'init-project', label: 'Initialize plugin project', completed: false, autoCheck: false },
              { id: 'run-tests', label: 'Run sample tests', completed: false, autoCheck: false },
            ],
          },
        },
      ],
    };

    this.flows.set(adminFlow.id, adminFlow);
    this.flows.set(analystFlow.id, analystFlow);
    this.flows.set(developerFlow.id, developerFlow);
  }

  private initializeSampleContent(): void {
    const samples: SampleContent[] = [
      {
        id: 'sample-security-policy',
        type: 'policy',
        name: 'Security Baseline Policy',
        description: 'A starter security policy with common rules',
        persona: ['admin', 'compliance_officer'],
        installable: true,
        content: {
          name: 'Security Baseline',
          version: '1.0.0',
          rules: ['require-mfa', 'audit-all-access', 'encrypt-at-rest'],
        },
      },
      {
        id: 'sample-analyst-dashboard',
        type: 'dashboard',
        name: 'Intelligence Overview',
        description: 'Pre-built dashboard for intelligence analysts',
        persona: ['analyst'],
        installable: true,
        previewUrl: '/preview/dashboards/intel-overview',
        content: {
          widgets: ['entity-count', 'recent-activity', 'relationship-graph'],
        },
      },
      {
        id: 'sample-compliance-report',
        type: 'report',
        name: 'SOC 2 Compliance Summary',
        description: 'Template for SOC 2 compliance reporting',
        persona: ['admin', 'compliance_officer'],
        installable: true,
        content: {
          template: 'soc2-summary',
          sections: ['control-status', 'evidence-links', 'remediation'],
        },
      },
    ];

    samples.forEach((s) => this.sampleContent.set(s.id, s));
  }

  private initializeContextualHelp(): void {
    const helps: ContextualHelp[] = [
      {
        id: 'help-governance-verdict',
        targetSelector: '.governance-badge',
        title: 'Governance Verdict',
        content: 'This badge shows the governance decision for this data. Green means approved, yellow requires review.',
        learnMoreUrl: '/docs/governance',
        dismissible: true,
        showOnce: true,
        priority: 10,
      },
      {
        id: 'help-provenance',
        targetSelector: '.provenance-link',
        title: 'Data Provenance',
        content: 'Click to view the complete lineage and source of this data.',
        learnMoreUrl: '/docs/provenance',
        dismissible: true,
        showOnce: true,
        priority: 8,
      },
      {
        id: 'help-policy-simulator',
        targetSelector: '#policy-simulator',
        targetRoute: '/policies',
        title: 'Policy Simulator',
        content: 'Test your policies before deploying them. The simulator shows exactly what would be allowed or denied.',
        learnMoreUrl: '/docs/policy-simulator',
        dismissible: true,
        showOnce: false,
        priority: 9,
      },
    ];

    helps.forEach((h) => this.contextualHelp.set(h.id, h));
  }
}

export const enhancedOnboardingService = EnhancedOnboardingService.getInstance();
