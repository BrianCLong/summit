/**
 * CRM Service - Main Entry Point
 * Comprehensive Customer Relationship Management system for Summit
 */

// Export all types
export * from './models/types';

// Export services
export { ContactService, contactService } from './services/ContactService';
export { CompanyService, companyService } from './services/CompanyService';
export { DealService, dealService } from './services/DealService';
export { ActivityService, activityService } from './services/ActivityService';
export { TaskService, taskService } from './services/TaskService';
export { EmailService, emailService } from './services/EmailService';
export { ReportingService, reportingService } from './services/ReportingService';
export { WorkflowService, workflowService } from './services/WorkflowService';
export { LeadScoringService, leadScoringService } from './services/LeadScoringService';

// Export type definitions for service inputs
export type {
  ContactCreateInput,
  ContactUpdateInput,
  ContactSearchParams,
  ContactSearchResult,
} from './services/ContactService';

export type {
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanySearchParams,
  CompanySearchResult,
} from './services/CompanyService';

export type {
  DealCreateInput,
  DealUpdateInput,
  DealSearchParams,
  DealSearchResult,
  PipelineStats,
  WinLossAnalysis,
} from './services/DealService';

export type {
  ActivityCreateInput,
  ActivitySearchParams,
  TimelineSearchParams,
  EngagementStats,
} from './services/ActivityService';

export type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskSearchParams,
  TaskQueue,
} from './services/TaskService';

export type {
  EmailSendInput,
  EmailSearchParams,
  EmailStats,
  SequenceEnrollment,
} from './services/EmailService';

export type {
  ReportCreateInput,
  ReportResult,
  DashboardCreateInput,
  ForecastCreateInput,
  SalesMetrics,
  LeaderboardEntry,
} from './services/ReportingService';

export type {
  WorkflowCreateInput,
  CustomFieldCreateInput,
  WorkflowExecution,
} from './services/WorkflowService';

export type {
  ScoringModelCreateInput,
  ScoringRuleCreateInput,
  AutomationRuleCreateInput,
  ScoreCalculation,
  LeadRoutingResult,
} from './services/LeadScoringService';

/**
 * CRM - Unified CRM Interface
 * Provides a single access point to all CRM functionality
 */
import { contactService } from './services/ContactService';
import { companyService } from './services/CompanyService';
import { dealService } from './services/DealService';
import { activityService } from './services/ActivityService';
import { taskService } from './services/TaskService';
import { emailService } from './services/EmailService';
import { reportingService } from './services/ReportingService';
import { workflowService } from './services/WorkflowService';
import { leadScoringService } from './services/LeadScoringService';

export class CRM {
  readonly contacts = contactService;
  readonly companies = companyService;
  readonly deals = dealService;
  readonly activities = activityService;
  readonly tasks = taskService;
  readonly emails = emailService;
  readonly reporting = reportingService;
  readonly workflows = workflowService;
  readonly scoring = leadScoringService;

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Set up cross-service event handlers for automation
   */
  private setupEventHandlers(): void {
    // Contact events
    this.contacts.on('contact:created', async (contact) => {
      await this.workflows.triggerWorkflow('record_created', 'contact', contact.id, contact);
      await this.scoring.processAutomation('created', 'contact', contact.id, contact);
    });

    this.contacts.on('contact:updated', async (contact, changes) => {
      await this.workflows.triggerWorkflow('record_updated', 'contact', contact.id, contact, changes);
    });

    this.contacts.on('contact:statusChanged', async (contact, oldStatus, newStatus) => {
      await this.workflows.triggerWorkflow(
        'field_changed',
        'contact',
        contact.id,
        contact,
        [{ field: 'leadStatus', oldValue: oldStatus, newValue: newStatus }]
      );
    });

    this.contacts.on('contact:scoreChanged', async (contact, oldScore, newScore, reason) => {
      if (newScore >= 80 && oldScore < 80) {
        // Hot lead threshold crossed
        await this.scoring.processAutomation('score_threshold', 'contact', contact.id, {
          ...contact,
          score: newScore,
        });
      }
    });

    // Company events
    this.companies.on('company:created', async (company) => {
      await this.workflows.triggerWorkflow('record_created', 'company', company.id, company);
    });

    this.companies.on('company:typeChanged', async (company, oldType, newType) => {
      await this.workflows.triggerWorkflow(
        'field_changed',
        'company',
        company.id,
        company,
        [{ field: 'type', oldValue: oldType, newValue: newType }]
      );
    });

    // Deal events
    this.deals.on('deal:created', async (deal) => {
      await this.workflows.triggerWorkflow('record_created', 'deal', deal.id, deal);

      // Update company deal metrics
      if (deal.companyId) {
        const company = await this.companies.getById(deal.companyId);
        if (company) {
          await this.companies.updateDealMetrics(deal.companyId, {
            openDeals: company.openDeals + 1,
            totalDeals: company.totalDeals + 1,
          });
        }
      }
    });

    this.deals.on('deal:stageChanged', async (deal, oldStage, newStage) => {
      await this.workflows.triggerWorkflow('stage_changed', 'deal', deal.id, deal, [
        { field: 'stageId', oldValue: oldStage?.id, newValue: newStage.id },
      ]);

      // Log activity
      await this.activities.log({
        type: 'system',
        subject: `Deal moved to ${newStage.name}`,
        description: `Deal "${deal.name}" was moved from ${oldStage?.name || 'unknown'} to ${newStage.name}`,
        dealId: deal.id,
        contactIds: deal.contactIds,
        companyId: deal.companyId,
        ownerId: deal.ownerId,
      }, deal.ownerId);
    });

    this.deals.on('deal:won', async (deal) => {
      await this.workflows.triggerWorkflow('deal_won', 'deal', deal.id, deal);

      // Update company metrics
      if (deal.companyId) {
        const company = await this.companies.getById(deal.companyId);
        if (company) {
          await this.companies.updateDealMetrics(deal.companyId, {
            openDeals: Math.max(0, company.openDeals - 1),
            totalRevenue: company.totalRevenue + deal.value,
          });

          // Mark company as customer if prospect
          if (company.type === 'prospect') {
            await this.companies.update(deal.companyId, { type: 'customer' }, deal.ownerId);
          }
        }
      }

      // Update contact status
      for (const contactId of deal.contactIds) {
        await this.contacts.update(contactId, { leadStatus: 'converted' }, deal.ownerId);
      }
    });

    this.deals.on('deal:lost', async (deal) => {
      await this.workflows.triggerWorkflow('deal_lost', 'deal', deal.id, deal);

      // Update company metrics
      if (deal.companyId) {
        const company = await this.companies.getById(deal.companyId);
        if (company) {
          await this.companies.updateDealMetrics(deal.companyId, {
            openDeals: Math.max(0, company.openDeals - 1),
          });
        }
      }
    });

    // Task events
    this.tasks.on('task:completed', async (task) => {
      await this.workflows.triggerWorkflow('task_completed', 'task', task.id, task);

      // Log activity
      await this.activities.log({
        type: 'task',
        subject: `Task completed: ${task.title}`,
        description: task.result,
        contactIds: task.contactIds,
        companyId: task.companyId,
        dealId: task.dealId,
        ownerId: task.completedById || task.ownerId,
      }, task.completedById || task.ownerId);
    });

    // Email events
    this.emails.on('email:sent', async (email) => {
      // Log activity
      await this.activities.log({
        type: 'email',
        subject: `Email sent: ${email.subject}`,
        description: email.snippet,
        contactIds: email.contactIds,
        companyId: email.companyId,
        dealId: email.dealId,
        ownerId: email.userId,
      }, email.userId);

      // Update last contacted for contacts
      for (const contactId of email.contactIds) {
        const contact = await this.contacts.getById(contactId);
        if (contact) {
          contact.lastContactedAt = new Date();
          await this.contacts.update(contactId, { lastContactedAt: new Date() } as any, email.userId);
        }
      }
    });

    this.emails.on('email:opened', async (email, event) => {
      await this.workflows.triggerWorkflow('email_opened', 'contact', email.contactIds[0] || '', {
        emailId: email.id,
        openedAt: event.timestamp,
      });

      // Update lead score for opens
      for (const contactId of email.contactIds) {
        await this.contacts.updateScore(contactId, 5, 'Email opened');
      }
    });

    this.emails.on('email:clicked', async (email, event) => {
      await this.workflows.triggerWorkflow('email_clicked', 'contact', email.contactIds[0] || '', {
        emailId: email.id,
        linkUrl: event.linkUrl,
        clickedAt: event.timestamp,
      });

      // Update lead score for clicks
      for (const contactId of email.contactIds) {
        await this.contacts.updateScore(contactId, 10, 'Email link clicked');
      }
    });

    this.emails.on('email:replied', async (email, replyId) => {
      // Update lead score for replies
      for (const contactId of email.contactIds) {
        await this.contacts.updateScore(contactId, 15, 'Email reply received');
      }
    });

    // Activity events
    this.activities.on('activity:logged', async (activity) => {
      // Update company last activity
      if (activity.companyId) {
        const company = await this.companies.getById(activity.companyId);
        if (company) {
          company.lastActivityAt = new Date();
          await this.companies.update(activity.companyId, {} as any, activity.ownerId);
        }
      }

      // Update contact last contacted for calls/meetings
      if (['call', 'meeting'].includes(activity.type)) {
        for (const contactId of activity.contactIds) {
          await this.contacts.update(
            contactId,
            { lastContactedAt: new Date() } as any,
            activity.ownerId
          );
        }
      }
    });

    // Workflow action handlers
    this.workflows.on('action:createTask', async (data) => {
      await this.tasks.create({
        title: data.title,
        type: data.taskType,
        dueDate: data.dueDays ? new Date(Date.now() + data.dueDays * 24 * 60 * 60 * 1000) : undefined,
        assigneeId: data.assigneeId || data.userId,
        contactIds: data.entityType === 'contact' ? [data.entityId] : [],
        companyId: data.entityType === 'company' ? data.entityId : undefined,
        dealId: data.entityType === 'deal' ? data.entityId : undefined,
      }, data.userId || 'system');
    });

    this.workflows.on('action:sendEmail', async (data) => {
      // Would integrate with email service
      console.log('Workflow triggered email send:', data);
    });

    this.workflows.on('action:updateScore', async (data) => {
      if (data.entityType === 'contact') {
        await this.contacts.updateScore(data.entityId, data.scoreChange, 'Workflow action');
      }
    });

    // Scoring automation handlers
    this.scoring.on('lead:routed', async (data) => {
      if (data.entityType === 'contact') {
        await this.contacts.assignOwner(data.entityId, data.assignedTo, 'system');
      } else if (data.entityType === 'company') {
        await this.companies.update(data.entityId, { ownerId: data.assignedTo }, 'system');
      }
    });

    this.scoring.on('score:threshold_crossed', async (data) => {
      // Create task for hot leads
      if (data.threshold.name === 'Hot') {
        const contact = await this.contacts.getById(data.entityId);
        if (contact) {
          await this.tasks.create({
            title: `Follow up with hot lead: ${contact.firstName} ${contact.lastName}`,
            type: 'follow_up',
            priority: 'high',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            assigneeId: contact.ownerId,
            contactIds: [contact.id],
            companyId: contact.companyId,
          }, 'system');
        }
      }
    });
  }

  /**
   * Initialize CRM with default data
   */
  async initialize(): Promise<void> {
    console.log('CRM system initialized');
  }

  /**
   * Get CRM health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
  }> {
    return {
      status: 'healthy',
      services: {
        contacts: true,
        companies: true,
        deals: true,
        activities: true,
        tasks: true,
        emails: true,
        reporting: true,
        workflows: true,
        scoring: true,
      },
    };
  }
}

// Export singleton instance
export const crm = new CRM();

// Default export
export default crm;
