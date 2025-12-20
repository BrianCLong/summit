# Summit CRM System

Comprehensive Customer Relationship Management system for Summit, providing contact management, sales pipeline, email tracking, task management, and sales automation.

## Features

### 1. Contact & Company Management
- Full contact lifecycle management
- Company/account management with hierarchy support
- Lead status tracking (new, contacted, qualified, converted, etc.)
- Contact and company merging
- Custom fields support
- Tag management
- Social profile integration

### 2. Sales Pipeline & Deal Tracking
- Multiple pipeline support
- Customizable stages with probability weighting
- Deal rotting detection and alerts
- Win/loss analysis
- Competitor tracking
- Product line items on deals
- Expected vs actual close date tracking

### 3. Activity Logging & Timeline
- Log calls, meetings, emails, notes, and tasks
- Unified timeline view per contact/company/deal
- Activity outcome tracking
- Duration tracking
- Participant management
- Engagement scoring

### 4. Email Integration & Tracking
- Email send and receive tracking
- Open and click tracking
- Reply detection
- Email templates with variable substitution
- Email sequences for automated outreach
- Bounce handling
- Template performance analytics

### 5. Task & Reminder System
- Task creation with due dates and priorities
- Task types (call, email, meeting, follow-up, etc.)
- Recurring tasks support
- Reminder scheduling
- Task queue view (overdue, today, upcoming)
- Subtask support
- Task reassignment

### 6. Reporting & Forecasting
- Pre-built sales dashboards
- Custom report builder
- Pipeline analytics
- Win/loss analysis
- Sales leaderboard
- Forecast management
- Scheduled report delivery

### 7. Custom Fields & Workflows
- Custom field creation for all entity types
- Field groups for organization
- Workflow automation with triggers and actions
- Conditional logic support
- Action types: update fields, create tasks, send emails, notifications, webhooks

### 8. Sales Automation & Lead Scoring
- Lead scoring models with rules
- Demographic and behavioral scoring
- Score degradation for inactive leads
- Lead routing (round-robin, territory-based, score-based)
- Automation rules for common actions
- Threshold-based notifications

## Installation

```bash
pnpm add @intelgraph/crm
```

## Quick Start

```typescript
import { crm } from '@intelgraph/crm';

// Create a contact
const contact = await crm.contacts.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  jobTitle: 'VP of Engineering',
  ownerId: 'user123',
  source: 'website',
}, 'user123');

// Create a company
const company = await crm.companies.create({
  name: 'Acme Corp',
  domain: 'acme.com',
  industry: 'Technology',
  companySize: 'enterprise',
  ownerId: 'user123',
}, 'user123');

// Create a deal
const deal = await crm.deals.create({
  name: 'Acme Enterprise Deal',
  value: 50000,
  pipelineId: 'pipeline_default',
  stageId: 'stage_qualified',
  companyId: company.id,
  contactIds: [contact.id],
  ownerId: 'user123',
  expectedCloseDate: new Date('2024-03-31'),
}, 'user123');

// Log an activity
await crm.activities.logCall(
  [contact.id],
  'Discovery Call',
  'completed',
  30,
  'Discussed requirements and timeline',
  'user123',
  company.id,
  deal.id
);

// Create a task
await crm.tasks.create({
  title: 'Send proposal',
  type: 'proposal',
  priority: 'high',
  dueDate: new Date('2024-01-15'),
  assigneeId: 'user123',
  dealId: deal.id,
}, 'user123');
```

## Service APIs

### ContactService

```typescript
// Create contact
await crm.contacts.create(input, userId);

// Search contacts
const results = await crm.contacts.search({
  query: 'john',
  leadStatus: ['new', 'qualified'],
  minScore: 50,
  page: 1,
  limit: 20,
});

// Update lead score
await crm.contacts.updateScore(contactId, 10, 'Demo requested');

// Merge duplicates
await crm.contacts.merge(primaryId, [duplicateId1, duplicateId2], {}, userId);

// Get hot leads
const hotLeads = await crm.contacts.getHotLeads(userId, 10);
```

### CompanyService

```typescript
// Create company
await crm.companies.create(input, userId);

// Search companies
const results = await crm.companies.search({
  type: ['customer'],
  industry: ['Technology'],
  minHealthScore: 70,
});

// Get company hierarchy
const hierarchy = await crm.companies.getHierarchy(companyId);

// Get at-risk customers
const atRisk = await crm.companies.getAtRiskCompanies(userId, 10);
```

### DealService

```typescript
// Create deal
await crm.deals.create(input, userId);

// Move deal stage
await crm.deals.moveStage(dealId, newStageId, userId);

// Mark deal won/lost
await crm.deals.markWon(dealId, userId);
await crm.deals.markLost(dealId, 'competitor', 'Lost to Competitor X', userId);

// Get pipeline stats
const stats = await crm.deals.getPipelineStats(pipelineId);

// Get forecast
const forecast = await crm.deals.generateForecast(pipelineId, startDate, endDate);
```

### ActivityService

```typescript
// Log activities
await crm.activities.logCall(contactIds, subject, outcome, duration, notes, userId);
await crm.activities.logMeeting(contactIds, subject, scheduledAt, duration, notes, userId);
await crm.activities.logNote(content, contactIds, companyId, dealId, userId);

// Get timeline
const timeline = await crm.activities.getTimeline({
  entityType: 'contact',
  entityId: contactId,
  limit: 50,
});

// Get engagement stats
const stats = await crm.activities.getEngagementStats('contact', contactId);
```

### TaskService

```typescript
// Create task
await crm.tasks.create(input, userId);

// Complete task
await crm.tasks.complete(taskId, 'Task completed successfully', userId);

// Get task queue
const queue = await crm.tasks.getQueue(userId);
// Returns: { overdue, today, upcoming, noDueDate }

// Snooze reminder
await crm.tasks.snoozeReminder(reminderId, 60); // 60 minutes
```

### EmailService

```typescript
// Send email
await crm.emails.send({
  to: [{ email: 'john@example.com', name: 'John Doe' }],
  subject: 'Following up',
  bodyHtml: '<p>Hi John...</p>',
  contactIds: [contactId],
  trackOpens: true,
  trackClicks: true,
}, userId);

// Track email events
await crm.emails.trackOpen(emailId, ip, userAgent);
await crm.emails.trackClick(emailId, linkUrl, ip, userAgent);

// Get email stats
const stats = await crm.emails.getStats(userId, startDate, endDate);

// Manage sequences
await crm.emails.enrollInSequence(sequenceId, contactId, userId);
```

### ReportingService

```typescript
// Get sales metrics
const metrics = await crm.reporting.getSalesMetrics(userId, dateRange);

// Get leaderboard
const leaders = await crm.reporting.getLeaderboard('revenue', dateRange, 10);

// Run custom report
const results = await crm.reporting.runReport(reportId);

// Get conversion funnel
const funnel = await crm.reporting.getConversionFunnel(pipelineId, dateRange);
```

### WorkflowService

```typescript
// Create workflow
await crm.workflows.createWorkflow({
  name: 'New Lead Notification',
  trigger: { type: 'record_created', entityType: 'contact' },
  conditions: {
    operator: 'and',
    conditions: [{ field: 'leadScore', operator: 'greater_than', value: 50 }],
  },
  actions: [
    { type: 'send_notification', config: { message: 'New qualified lead!' } },
    { type: 'create_task', config: { taskTitle: 'Follow up with lead', taskDueDays: 1 } },
  ],
  ownerId: userId,
});

// Create custom field
await crm.workflows.createCustomField({
  name: 'customer_segment',
  label: 'Customer Segment',
  type: 'select',
  entityType: 'company',
  options: [
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'mid_market', label: 'Mid-Market' },
    { value: 'smb', label: 'SMB' },
  ],
});
```

### LeadScoringService

```typescript
// Calculate score
const calculation = await crm.scoring.calculateScore(
  'contact',
  contactId,
  contactData,
  currentScore
);

// Route lead
const routing = await crm.scoring.routeLeadRoundRobin(
  'contact',
  contactId,
  'sales_team',
  ['user1', 'user2', 'user3']
);

// Create automation rule
await crm.scoring.createAutomationRule({
  name: 'Hot Lead Alert',
  type: 'notification',
  trigger: { event: 'score_threshold', entityType: 'contact' },
  actions: [{ type: 'send_notification', config: { message: 'Hot lead detected!' } }],
});
```

## Event System

The CRM emits events for cross-service automation:

```typescript
// Contact events
crm.contacts.on('contact:created', (contact) => {});
crm.contacts.on('contact:updated', (contact, changes) => {});
crm.contacts.on('contact:scoreChanged', (contact, oldScore, newScore, reason) => {});

// Deal events
crm.deals.on('deal:created', (deal) => {});
crm.deals.on('deal:stageChanged', (deal, oldStage, newStage) => {});
crm.deals.on('deal:won', (deal) => {});
crm.deals.on('deal:lost', (deal) => {});

// Email events
crm.emails.on('email:sent', (email) => {});
crm.emails.on('email:opened', (email, event) => {});
crm.emails.on('email:clicked', (email, event) => {});
crm.emails.on('email:replied', (email, replyId) => {});

// Task events
crm.tasks.on('task:completed', (task) => {});
crm.tasks.on('reminder:triggered', (reminder) => {});

// Workflow events
crm.workflows.on('workflow:executed', (execution) => {});

// Scoring events
crm.scoring.on('lead:routed', (data) => {});
crm.scoring.on('score:threshold_crossed', (data) => {});
```

## Data Models

### Contact
- Personal info (name, email, phone)
- Job info (title, department)
- Lead scoring (score, status, source)
- Preferences (contact method, subscription status)
- Custom fields

### Company
- Company details (name, domain, industry)
- Size and revenue
- Health score
- Deal metrics
- Hierarchy (parent/subsidiary)

### Deal
- Value and currency
- Pipeline and stage
- Probability and weighted value
- Close dates (expected/actual)
- Products
- Win/loss tracking

### Activity
- Type and outcome
- Duration
- Participants
- Attachments
- Linked entities

### Task
- Priority and status
- Due date/time
- Recurrence
- Reminders
- Subtasks

## License

MIT
