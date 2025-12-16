/**
 * Control Tower Service - TypeScript Types
 * @module @intelgraph/control-tower-service/types
 */

// ============================================================================
// Enums
// ============================================================================

export enum Severity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  NORMAL = 'NORMAL',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
}

export enum EventStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum SituationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum ActionType {
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  ESCALATE = 'ESCALATE',
  RESOLVE = 'RESOLVE',
  REASSIGN = 'REASSIGN',
  SNOOZE = 'SNOOZE',
  COMMENT = 'COMMENT',
  RUN_PLAYBOOK = 'RUN_PLAYBOOK',
  NOTIFY = 'NOTIFY',
  LINK_EVENT = 'LINK_EVENT',
  UNLINK_EVENT = 'UNLINK_EVENT',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum EventCategory {
  PAYMENT = 'PAYMENT',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  PRODUCT = 'PRODUCT',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SECURITY = 'SECURITY',
  CUSTOMER_HEALTH = 'CUSTOMER_HEALTH',
  HR = 'HR',
  COMPLIANCE = 'COMPLIANCE',
  GENERAL = 'GENERAL',
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

export enum AlertTriggerType {
  EVENT_MATCH = 'EVENT_MATCH',
  THRESHOLD = 'THRESHOLD',
  ANOMALY = 'ANOMALY',
  SCHEDULE = 'SCHEDULE',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  PAGERDUTY = 'PAGERDUTY',
  WEBHOOK = 'WEBHOOK',
  IN_APP = 'IN_APP',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SNOOZED = 'SNOOZED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum ComponentStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

// ============================================================================
// Core Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status?: UserStatus;
  currentActivity?: string;
  role?: string;
}

export interface UserStatus {
  online: boolean;
  statusMessage?: string;
  lastSeen?: Date;
  availableForAssignment: boolean;
}

export interface ImpactEstimate {
  revenueAtRisk?: number;
  customersAffected?: number;
  usersAffected?: number;
  severityScore?: number;
  confidence?: number;
}

export interface ErrorDetails {
  code?: string;
  message?: string;
  stackTrace?: string;
  affectedService?: string;
  count?: number;
  errorRate?: number;
}

export interface EventMetadata {
  impactEstimate?: ImpactEstimate;
  tags: string[];
  properties?: Record<string, unknown>;
  errorDetails?: ErrorDetails;
}

export interface GovernanceInfo {
  origin: string;
  sensitivity: string;
  clearance: string;
  legalBasis?: string;
  retentionClass?: string;
  policyLabels: string[];
  provenanceChain: ProvenanceEntry[];
}

export interface ProvenanceEntry {
  id: string;
  timestamp: Date;
  transformType: string;
  actorId?: string;
  config?: Record<string, unknown>;
}

export interface RelatedEntity {
  id: string;
  type: string;
  name: string;
  relationshipType: string;
  properties?: Record<string, unknown>;
  entityUrl?: string;
}

export interface OperationalEvent {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  status: EventStatus;
  category: EventCategory;
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  occurredAt: Date;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedBy?: User;
  acknowledgedAt?: Date;
  assignedTo?: User;
  payload?: Record<string, unknown>;
  metadata?: EventMetadata;
  relatedEntities: RelatedEntity[];
  correlatedEvents: OperationalEvent[];
  situationId?: string;
  situation?: Situation;
  actions: EventAction[];
  suggestions: AISuggestion[];
  governance: GovernanceInfo;
}

export interface AISuggestion {
  id: string;
  type: string;
  content: string;
  confidence: number;
  reasoning?: string;
  actionUrl?: string;
  similarIncidents: HistoricalIncident[];
}

export interface HistoricalIncident {
  id: string;
  title: string;
  occurredAt: Date;
  resolution?: string;
  resolutionTimeMinutes?: number;
  similarityScore: number;
}

export interface EventAction {
  id: string;
  type: ActionType;
  status: ActionStatus;
  performedBy: User;
  initiatedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  details?: string;
  result?: ActionResult;
  targetEventId?: string;
  targetEvent?: OperationalEvent;
  targetSituationId?: string;
  targetSituation?: Situation;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Situation Types
// ============================================================================

export interface Situation {
  id: string;
  title: string;
  description?: string;
  status: SituationStatus;
  priority: Priority;
  severity: Severity;
  startedAt: Date;
  resolvedAt?: Date;
  duration?: number;
  owner?: User;
  events: OperationalEvent[];
  eventCount: number;
  affectedEntities: RelatedEntity[];
  impact: SituationImpact;
  timeline: SituationTimelineEntry[];
  recommendedActions: RecommendedAction[];
  actions: EventAction[];
  team: User[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SituationImpact {
  revenueAtRisk?: number;
  customersAffected?: number;
  supportTickets?: number;
  reputationalRisk?: string;
  affectedCustomers: AffectedCustomer[];
}

export interface AffectedCustomer {
  id: string;
  name: string;
  arr?: number;
  tier?: string;
  healthScore?: number;
  accountManager?: User;
}

export interface SituationTimelineEntry {
  id: string;
  timestamp: Date;
  entryType: string;
  description: string;
  user?: User;
  event?: OperationalEvent;
  action?: EventAction;
}

export interface RecommendedAction {
  id: string;
  actionType: ActionType;
  title: string;
  description: string;
  confidence: number;
  estimatedTimeMinutes?: number;
  successRate?: number;
  playbook?: Playbook;
  template?: NotificationTemplate;
  reasoning?: string;
  similarIncidents: HistoricalIncident[];
}

// ============================================================================
// Health Score Types
// ============================================================================

export interface HealthScore {
  score: number;
  trend: TrendDirection;
  change: number;
  comparisonPeriod: string;
  components: HealthScoreComponent[];
  calculatedAt: Date;
}

export interface HealthScoreComponent {
  name: string;
  score: number;
  status: ComponentStatus;
  factors: HealthFactor[];
  weight: number;
}

export interface HealthFactor {
  name: string;
  value: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  impact: number;
}

export interface HealthScoreDataPoint {
  timestamp: Date;
  score: number;
}

// ============================================================================
// Alert Types
// ============================================================================

export interface Alert {
  id: string;
  rule: AlertRule;
  severity: Severity;
  status: AlertStatus;
  title: string;
  message: string;
  triggeringEvent?: OperationalEvent;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: User;
  snoozedUntil?: Date;
  notifications: AlertNotification[];
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggerType: AlertTriggerType;
  conditions: Record<string, unknown>;
  severity: Severity;
  channels: NotificationChannel[];
  recipients: string[];
  cooldownSeconds?: number;
  triggerCount: number;
  lastTriggeredAt?: Date;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertNotification {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  sentAt: Date;
  delivered: boolean;
  error?: string;
}

// ============================================================================
// Playbook Types
// ============================================================================

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  steps: PlaybookStep[];
  estimatedTimeMinutes?: number;
  successRate?: number;
  executionCount?: number;
}

export interface PlaybookStep {
  order: number;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface PlaybookExecution {
  id: string;
  playbook: Playbook;
  status: ActionStatus;
  stepsCompleted: number;
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  results?: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject?: string;
  body: string;
  channels: NotificationChannel[];
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface KeyMetric {
  id: string;
  name: string;
  value: number;
  unit?: string;
  formattedValue: string;
  trend: TrendDirection;
  change: number;
  changePercent?: number;
  status: ComponentStatus;
  sparkline?: number[];
  detailUrl?: string;
}

export interface TeamPulse {
  user: User;
  status: UserStatus;
  currentAssignment?: string;
  activeSituationsCount: number;
  eventsAssignedToday: number;
}

// ============================================================================
// Graph Types
// ============================================================================

export interface ContextGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: Record<string, unknown>;
}

// ============================================================================
// Source Types
// ============================================================================

export interface EventSource {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  lastSyncAt?: Date;
  eventCount: number;
}

export interface CategoryCount {
  category: EventCategory;
  count: number;
  criticalCount: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface EventFilterInput {
  severity?: Severity[];
  status?: EventStatus[];
  category?: EventCategory[];
  source?: string[];
  startTime?: Date;
  endTime?: Date;
  searchQuery?: string;
  assignedTo?: string;
  situationId?: string;
  unassignedOnly?: boolean;
}

export interface CreateSituationInput {
  title: string;
  description?: string;
  priority: Priority;
  eventIds: string[];
  ownerId?: string;
}

export interface UpdateSituationInput {
  title?: string;
  description?: string;
  status?: SituationStatus;
  priority?: Priority;
  ownerId?: string;
}

export interface PerformActionInput {
  type: ActionType;
  eventId?: string;
  situationId?: string;
  details?: string;
  assigneeId?: string;
  playbookId?: string;
  templateId?: string;
  snoozeDurationMinutes?: number;
  parameters?: Record<string, unknown>;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  triggerType: AlertTriggerType;
  conditions: Record<string, unknown>;
  severity: Severity;
  channels: NotificationChannel[];
  recipients: string[];
  cooldownSeconds?: number;
  enabled?: boolean;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  conditions?: Record<string, unknown>;
  severity?: Severity;
  channels?: NotificationChannel[];
  recipients?: string[];
  cooldownSeconds?: number;
  enabled?: boolean;
}

export interface SearchInput {
  query: string;
  types?: string[];
  limit?: number;
  includeResolved?: boolean;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  description?: string;
  score: number;
  highlights?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Connection Types (Pagination)
// ============================================================================

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface EventConnection {
  edges: EventEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface EventEdge {
  node: OperationalEvent;
  cursor: string;
}

export interface SituationConnection {
  edges: SituationEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface SituationEdge {
  node: Situation;
  cursor: string;
}

export interface AlertConnection {
  edges: AlertEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface AlertEdge {
  node: Alert;
  cursor: string;
}

// ============================================================================
// Comment Types
// ============================================================================

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ServiceContext {
  user: User;
  tenantId: string;
  requestId: string;
  traceId?: string;
}
