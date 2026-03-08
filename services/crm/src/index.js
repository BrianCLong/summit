"use strict";
/**
 * CRM Service - Main Entry Point
 * Comprehensive Customer Relationship Management system for Summit
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crm = exports.CRM = exports.leadScoringService = exports.LeadScoringService = exports.workflowService = exports.WorkflowService = exports.reportingService = exports.ReportingService = exports.emailService = exports.EmailService = exports.taskService = exports.TaskService = exports.activityService = exports.ActivityService = exports.dealService = exports.DealService = exports.companyService = exports.CompanyService = exports.contactService = exports.ContactService = void 0;
// Export all types
__exportStar(require("./models/types"), exports);
// Export services
var ContactService_1 = require("./services/ContactService");
Object.defineProperty(exports, "ContactService", { enumerable: true, get: function () { return ContactService_1.ContactService; } });
Object.defineProperty(exports, "contactService", { enumerable: true, get: function () { return ContactService_1.contactService; } });
var CompanyService_1 = require("./services/CompanyService");
Object.defineProperty(exports, "CompanyService", { enumerable: true, get: function () { return CompanyService_1.CompanyService; } });
Object.defineProperty(exports, "companyService", { enumerable: true, get: function () { return CompanyService_1.companyService; } });
var DealService_1 = require("./services/DealService");
Object.defineProperty(exports, "DealService", { enumerable: true, get: function () { return DealService_1.DealService; } });
Object.defineProperty(exports, "dealService", { enumerable: true, get: function () { return DealService_1.dealService; } });
var ActivityService_1 = require("./services/ActivityService");
Object.defineProperty(exports, "ActivityService", { enumerable: true, get: function () { return ActivityService_1.ActivityService; } });
Object.defineProperty(exports, "activityService", { enumerable: true, get: function () { return ActivityService_1.activityService; } });
var TaskService_1 = require("./services/TaskService");
Object.defineProperty(exports, "TaskService", { enumerable: true, get: function () { return TaskService_1.TaskService; } });
Object.defineProperty(exports, "taskService", { enumerable: true, get: function () { return TaskService_1.taskService; } });
var EmailService_1 = require("./services/EmailService");
Object.defineProperty(exports, "EmailService", { enumerable: true, get: function () { return EmailService_1.EmailService; } });
Object.defineProperty(exports, "emailService", { enumerable: true, get: function () { return EmailService_1.emailService; } });
var ReportingService_1 = require("./services/ReportingService");
Object.defineProperty(exports, "ReportingService", { enumerable: true, get: function () { return ReportingService_1.ReportingService; } });
Object.defineProperty(exports, "reportingService", { enumerable: true, get: function () { return ReportingService_1.reportingService; } });
var WorkflowService_1 = require("./services/WorkflowService");
Object.defineProperty(exports, "WorkflowService", { enumerable: true, get: function () { return WorkflowService_1.WorkflowService; } });
Object.defineProperty(exports, "workflowService", { enumerable: true, get: function () { return WorkflowService_1.workflowService; } });
var LeadScoringService_1 = require("./services/LeadScoringService");
Object.defineProperty(exports, "LeadScoringService", { enumerable: true, get: function () { return LeadScoringService_1.LeadScoringService; } });
Object.defineProperty(exports, "leadScoringService", { enumerable: true, get: function () { return LeadScoringService_1.leadScoringService; } });
/**
 * CRM - Unified CRM Interface
 * Provides a single access point to all CRM functionality
 */
const ContactService_2 = require("./services/ContactService");
const CompanyService_2 = require("./services/CompanyService");
const DealService_2 = require("./services/DealService");
const ActivityService_2 = require("./services/ActivityService");
const TaskService_2 = require("./services/TaskService");
const EmailService_2 = require("./services/EmailService");
const ReportingService_2 = require("./services/ReportingService");
const WorkflowService_2 = require("./services/WorkflowService");
const LeadScoringService_2 = require("./services/LeadScoringService");
class CRM {
    contacts = ContactService_2.contactService;
    companies = CompanyService_2.companyService;
    deals = DealService_2.dealService;
    activities = ActivityService_2.activityService;
    tasks = TaskService_2.taskService;
    emails = EmailService_2.emailService;
    reporting = ReportingService_2.reportingService;
    workflows = WorkflowService_2.workflowService;
    scoring = LeadScoringService_2.leadScoringService;
    constructor() {
        this.setupEventHandlers();
    }
    /**
     * Set up cross-service event handlers for automation
     */
    setupEventHandlers() {
        // Contact events
        this.contacts.on('contact:created', async (contact) => {
            await this.workflows.triggerWorkflow('record_created', 'contact', contact.id, contact);
            await this.scoring.processAutomation('created', 'contact', contact.id, contact);
        });
        this.contacts.on('contact:updated', async (contact, changes) => {
            await this.workflows.triggerWorkflow('record_updated', 'contact', contact.id, contact, changes);
        });
        this.contacts.on('contact:statusChanged', async (contact, oldStatus, newStatus) => {
            await this.workflows.triggerWorkflow('field_changed', 'contact', contact.id, contact, [{ field: 'leadStatus', oldValue: oldStatus, newValue: newStatus }]);
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
            await this.workflows.triggerWorkflow('field_changed', 'company', company.id, company, [{ field: 'type', oldValue: oldType, newValue: newType }]);
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
                    await this.contacts.update(contactId, { lastContactedAt: new Date() }, email.userId);
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
                    await this.companies.update(activity.companyId, {}, activity.ownerId);
                }
            }
            // Update contact last contacted for calls/meetings
            if (['call', 'meeting'].includes(activity.type)) {
                for (const contactId of activity.contactIds) {
                    await this.contacts.update(contactId, { lastContactedAt: new Date() }, activity.ownerId);
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
            }
            else if (data.entityType === 'company') {
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
    async initialize() {
        console.log('CRM system initialized');
    }
    /**
     * Get CRM health status
     */
    async getHealthStatus() {
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
exports.CRM = CRM;
// Export singleton instance
exports.crm = new CRM();
// Default export
exports.default = exports.crm;
