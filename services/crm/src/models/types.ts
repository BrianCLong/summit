/**
 * CRM Core Types
 * Comprehensive type definitions for the CRM system
 */

// =============================================================================
// Contact Management
// =============================================================================

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  companyId?: string;
  ownerId: string;
  leadScore: number;
  leadStatus: LeadStatus;
  source: LeadSource;
  tags: string[];
  customFields: Record<string, CustomFieldValue>;
  socialProfiles: SocialProfile[];
  address?: Address;
  timezone?: string;
  preferredContactMethod?: ContactMethod;
  doNotContact: boolean;
  subscriptionStatus: SubscriptionStatus;
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'nurturing'
  | 'converted'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'referral'
  | 'social_media'
  | 'email_campaign'
  | 'paid_ads'
  | 'trade_show'
  | 'cold_outreach'
  | 'partner'
  | 'other';

export type ContactMethod = 'email' | 'phone' | 'sms' | 'social';

export type SubscriptionStatus = 'subscribed' | 'unsubscribed' | 'bounced' | 'pending';

export interface SocialProfile {
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'other';
  url: string;
  handle?: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// =============================================================================
// Company Management
// =============================================================================

export interface Company {
  id: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  companySize: CompanySize;
  annualRevenue?: number;
  description?: string;
  phone?: string;
  email?: string;
  address?: Address;
  billingAddress?: Address;
  ownerId: string;
  parentCompanyId?: string;
  tags: string[];
  customFields: Record<string, CustomFieldValue>;
  socialProfiles: SocialProfile[];
  linkedInUrl?: string;
  employeeCount?: number;
  foundedYear?: number;
  type: CompanyType;
  status: CompanyStatus;
  healthScore: number;
  totalRevenue: number;
  totalDeals: number;
  openDeals: number;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanySize =
  | 'startup'
  | 'small'
  | 'medium'
  | 'large'
  | 'enterprise';

export type CompanyType =
  | 'prospect'
  | 'customer'
  | 'partner'
  | 'vendor'
  | 'competitor'
  | 'other';

export type CompanyStatus = 'active' | 'inactive' | 'churned';

// =============================================================================
// Sales Pipeline & Deals
// =============================================================================

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  isDefault: boolean;
  dealRotting: DealRottingConfig;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  rottingDays: number;
  color: string;
  isWon?: boolean;
  isLost?: boolean;
}

export interface DealRottingConfig {
  enabled: boolean;
  thresholdDays: number;
  notifyOwner: boolean;
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  currency: string;
  pipelineId: string;
  stageId: string;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  companyId?: string;
  contactIds: string[];
  ownerId: string;
  coOwnerIds: string[];
  source: LeadSource;
  lostReason?: LostReason;
  lostReasonDetails?: string;
  competitorId?: string;
  tags: string[];
  customFields: Record<string, CustomFieldValue>;
  products: DealProduct[];
  weightedValue: number;
  stageEnteredAt: Date;
  isRotting: boolean;
  rottingDays: number;
  status: DealStatus;
  priority: DealPriority;
  nextStepDate?: Date;
  nextStep?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export type DealStatus = 'open' | 'won' | 'lost';

export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

export type LostReason =
  | 'price'
  | 'competitor'
  | 'no_budget'
  | 'no_decision'
  | 'timing'
  | 'feature_gap'
  | 'went_dark'
  | 'other';

export interface DealProduct {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

// =============================================================================
// Activity Logging & Timeline
// =============================================================================

export interface Activity {
  id: string;
  type: ActivityType;
  subType?: string;
  subject: string;
  description?: string;
  outcome?: ActivityOutcome;
  durationMinutes?: number;
  scheduledAt?: Date;
  completedAt?: Date;
  contactIds: string[];
  companyId?: string;
  dealId?: string;
  ownerId: string;
  participants: ActivityParticipant[];
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  isAutomated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'note'
  | 'sms'
  | 'linkedin_message'
  | 'demo'
  | 'proposal'
  | 'contract'
  | 'system';

export type ActivityOutcome =
  | 'completed'
  | 'no_answer'
  | 'left_voicemail'
  | 'busy'
  | 'wrong_number'
  | 'rescheduled'
  | 'cancelled'
  | 'interested'
  | 'not_interested';

export interface ActivityParticipant {
  type: 'contact' | 'user';
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface TimelineEntry {
  id: string;
  entityType: 'contact' | 'company' | 'deal';
  entityId: string;
  activityId?: string;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}

export type TimelineEventType =
  | 'activity'
  | 'stage_change'
  | 'owner_change'
  | 'field_change'
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'email_replied'
  | 'deal_created'
  | 'deal_won'
  | 'deal_lost'
  | 'note_added'
  | 'task_completed'
  | 'meeting_scheduled'
  | 'score_changed';

// =============================================================================
// Email Integration & Tracking
// =============================================================================

export interface EmailMessage {
  id: string;
  threadId: string;
  messageId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  snippet: string;
  attachments: EmailAttachment[];
  contactIds: string[];
  companyId?: string;
  dealId?: string;
  userId: string;
  direction: 'inbound' | 'outbound';
  status: EmailStatus;
  tracking: EmailTracking;
  templateId?: string;
  sequenceId?: string;
  sequenceStep?: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export type EmailStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed';

export interface EmailTracking {
  opens: EmailTrackingEvent[];
  clicks: EmailTrackingEvent[];
  replies: string[];
  unsubscribed: boolean;
  bounced: boolean;
  bounceType?: 'hard' | 'soft';
}

export interface EmailTrackingEvent {
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  location?: string;
  linkUrl?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  category: string;
  tags: string[];
  variables: string[];
  isShared: boolean;
  ownerId: string;
  usageCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  steps: EmailSequenceStep[];
  enrollmentCriteria: EnrollmentCriteria;
  exitCriteria: ExitCriteria;
  status: 'active' | 'paused' | 'draft';
  ownerId: string;
  isShared: boolean;
  stats: SequenceStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSequenceStep {
  id: string;
  order: number;
  type: 'email' | 'wait' | 'task' | 'condition';
  templateId?: string;
  waitDays?: number;
  waitHours?: number;
  taskType?: string;
  taskDescription?: string;
  condition?: SequenceCondition;
}

export interface SequenceCondition {
  type: 'email_opened' | 'email_clicked' | 'email_replied' | 'custom';
  trueBranch: string;
  falseBranch: string;
}

export interface EnrollmentCriteria {
  type: 'manual' | 'automatic';
  filters?: FilterGroup;
}

export interface ExitCriteria {
  onReply: boolean;
  onMeeting: boolean;
  onDealCreated: boolean;
  onUnsubscribe: boolean;
  customConditions: FilterGroup[];
}

export interface SequenceStats {
  enrolled: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
}

// =============================================================================
// Tasks & Reminders
// =============================================================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  dueTime?: string;
  reminderAt?: Date;
  contactIds: string[];
  companyId?: string;
  dealId?: string;
  ownerId: string;
  assigneeId: string;
  createdById: string;
  completedAt?: Date;
  completedById?: string;
  isRecurring: boolean;
  recurrence?: RecurrenceRule;
  parentTaskId?: string;
  subtasks: string[];
  tags: string[];
  result?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'todo'
  | 'follow_up'
  | 'demo'
  | 'proposal'
  | 'contract'
  | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface Reminder {
  id: string;
  taskId?: string;
  dealId?: string;
  contactId?: string;
  userId: string;
  title: string;
  message?: string;
  reminderAt: Date;
  sent: boolean;
  sentAt?: Date;
  channel: ReminderChannel[];
  snoozedUntil?: Date;
  dismissed: boolean;
  createdAt: Date;
}

export type ReminderChannel = 'email' | 'push' | 'sms' | 'in_app';

// =============================================================================
// Reporting & Forecasting
// =============================================================================

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  category: ReportCategory;
  config: ReportConfig;
  filters: FilterGroup;
  schedule?: ReportSchedule;
  ownerId: string;
  isShared: boolean;
  sharedWith: string[];
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportType =
  | 'table'
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'funnel'
  | 'metric'
  | 'leaderboard';

export type ReportCategory =
  | 'deals'
  | 'contacts'
  | 'companies'
  | 'activities'
  | 'emails'
  | 'tasks'
  | 'forecasting'
  | 'custom';

export interface ReportConfig {
  metrics: ReportMetric[];
  dimensions: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  dateRange: DateRange;
  compareToRange?: DateRange;
}

export interface ReportMetric {
  field: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct';
  label?: string;
}

export interface DateRange {
  type: 'relative' | 'absolute';
  period?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
}

export interface Forecast {
  id: string;
  name: string;
  period: ForecastPeriod;
  startDate: Date;
  endDate: Date;
  pipelineId: string;
  quotas: ForecastQuota[];
  categories: ForecastCategory[];
  status: 'draft' | 'submitted' | 'approved';
  ownerId: string;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ForecastPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface ForecastQuota {
  userId: string;
  amount: number;
  achieved: number;
  percentage: number;
}

export interface ForecastCategory {
  name: 'commit' | 'best_case' | 'pipeline' | 'omitted';
  amount: number;
  dealIds: string[];
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  isDefault: boolean;
  ownerId: string;
  isShared: boolean;
  sharedWith: string[];
  refreshInterval?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  reportId?: string;
  config: WidgetConfig;
  position: WidgetPosition;
}

export type WidgetType =
  | 'metric'
  | 'chart'
  | 'leaderboard'
  | 'activity_feed'
  | 'tasks'
  | 'deals'
  | 'pipeline'
  | 'forecast'
  | 'goals';

export interface WidgetConfig {
  title: string;
  metric?: string;
  aggregation?: string;
  filters?: FilterGroup;
  dateRange?: DateRange;
  displayFormat?: string;
  showTrend?: boolean;
  compareToRange?: DateRange;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
}

// =============================================================================
// Custom Fields & Workflows
// =============================================================================

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  entityType: 'contact' | 'company' | 'deal' | 'activity' | 'task';
  required: boolean;
  options?: CustomFieldOption[];
  defaultValue?: CustomFieldValue;
  validation?: CustomFieldValidation;
  helpText?: string;
  order: number;
  groupId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'user'
  | 'contact'
  | 'company'
  | 'deal'
  | 'url'
  | 'email'
  | 'phone';

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
  order: number;
}

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export type CustomFieldValue = string | number | boolean | Date | string[] | null;

export interface CustomFieldGroup {
  id: string;
  name: string;
  entityType: 'contact' | 'company' | 'deal' | 'activity' | 'task';
  order: number;
  isCollapsed: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions: FilterGroup;
  actions: WorkflowAction[];
  status: 'active' | 'paused' | 'draft';
  runCount: number;
  lastRunAt?: Date;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  entityType: 'contact' | 'company' | 'deal' | 'activity' | 'task';
  field?: string;
  fromValue?: CustomFieldValue;
  toValue?: CustomFieldValue;
  schedule?: WorkflowSchedule;
}

export type WorkflowTriggerType =
  | 'record_created'
  | 'record_updated'
  | 'field_changed'
  | 'stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'task_completed'
  | 'email_opened'
  | 'email_clicked'
  | 'scheduled';

export interface WorkflowSchedule {
  frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: WorkflowActionConfig;
  order: number;
  delay?: WorkflowDelay;
}

export type WorkflowActionType =
  | 'update_field'
  | 'create_task'
  | 'send_email'
  | 'send_notification'
  | 'assign_owner'
  | 'add_tag'
  | 'remove_tag'
  | 'create_deal'
  | 'move_stage'
  | 'enroll_sequence'
  | 'remove_sequence'
  | 'update_score'
  | 'webhook'
  | 'slack_message';

export interface WorkflowActionConfig {
  field?: string;
  value?: CustomFieldValue;
  templateId?: string;
  taskType?: TaskType;
  taskTitle?: string;
  taskDueDays?: number;
  userId?: string;
  tags?: string[];
  stageId?: string;
  sequenceId?: string;
  scoreChange?: number;
  webhookUrl?: string;
  slackChannel?: string;
  message?: string;
}

export interface WorkflowDelay {
  type: 'immediate' | 'delay' | 'specific_time';
  delayMinutes?: number;
  delayHours?: number;
  delayDays?: number;
  specificTime?: string;
  businessHoursOnly?: boolean;
}

// =============================================================================
// Lead Scoring
// =============================================================================

export interface LeadScoringModel {
  id: string;
  name: string;
  description?: string;
  entityType: 'contact' | 'company';
  rules: LeadScoringRule[];
  degradation: ScoreDegradation;
  thresholds: ScoreThreshold[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadScoringRule {
  id: string;
  name: string;
  category: 'demographic' | 'behavioral' | 'engagement' | 'fit';
  condition: FilterGroup;
  points: number;
  maxOccurrences?: number;
  expirationDays?: number;
}

export interface ScoreDegradation {
  enabled: boolean;
  inactivityDays: number;
  degradationPercent: number;
  minimumScore: number;
}

export interface ScoreThreshold {
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  action?: string;
}

export interface LeadScoreHistory {
  id: string;
  entityType: 'contact' | 'company';
  entityId: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
  ruleId?: string;
  timestamp: Date;
}

// =============================================================================
// Filters & Conditions
// =============================================================================

export interface FilterGroup {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: CustomFieldValue;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'before'
  | 'after'
  | 'within_last'
  | 'within_next';

// =============================================================================
// Audit & Versioning
// =============================================================================

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'merge' | 'assign' | 'export';
  userId: string;
  userName: string;
  changes: FieldChange[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// =============================================================================
// Sales Automation
// =============================================================================

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  type: AutomationRuleType;
  trigger: AutomationTrigger;
  conditions: FilterGroup;
  actions: AutomationAction[];
  priority: number;
  isActive: boolean;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AutomationRuleType =
  | 'lead_routing'
  | 'lead_qualification'
  | 'deal_creation'
  | 'task_creation'
  | 'notification'
  | 'field_update'
  | 'sequence_enrollment';

export interface AutomationTrigger {
  event: AutomationEvent;
  entityType: 'contact' | 'company' | 'deal';
  delay?: number;
}

export type AutomationEvent =
  | 'created'
  | 'updated'
  | 'score_threshold'
  | 'inactivity'
  | 'stage_change'
  | 'email_event';

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export type AutomationActionType =
  | 'assign_owner'
  | 'round_robin'
  | 'update_field'
  | 'create_task'
  | 'send_email'
  | 'send_notification'
  | 'enroll_sequence'
  | 'create_deal'
  | 'add_tag'
  | 'webhook';
