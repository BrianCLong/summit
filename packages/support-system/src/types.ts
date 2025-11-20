/**
 * Enterprise Support System - Type Definitions
 */

export enum TicketStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  PENDING_INTERNAL = 'PENDING_INTERNAL',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL'
}

export enum TicketSeverity {
  SEV1 = 'SEV1', // Critical business impact
  SEV2 = 'SEV2', // Major functionality impaired
  SEV3 = 'SEV3', // Minor issue, workaround available
  SEV4 = 'SEV4'  // Cosmetic or enhancement request
}

export enum TicketChannel {
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
  PHONE = 'PHONE',
  PORTAL = 'PORTAL',
  API = 'API',
  INTEGRATION = 'INTEGRATION'
}

export enum SLATier {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  PREMIUM = 'PREMIUM'
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  ticketNumber: string;

  // Customer information
  customerUserId?: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  organization?: string;

  // Ticket details
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  channel: TicketChannel;

  // Assignment
  assignedTo?: string;
  assignedTeam?: string;

  // SLA tracking
  slaTier: SLATier;
  responseDueAt?: Date;
  resolutionDueAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Metadata
  tags?: string[];
  category?: string;
  subcategory?: string;
  product?: string;
  version?: string;

  // Satisfaction
  satisfactionRating?: number;
  satisfactionFeedback?: string;

  // Tracking
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId?: string;
  content: string;
  isInternal: boolean;
  isSolution: boolean;
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  changedBy?: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  createdAt: Date;
}

export interface EscalationRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  // Conditions
  priority?: TicketPriority[];
  severity?: TicketSeverity[];
  slaTier?: SLATier[];
  categories?: string[];

  // Trigger conditions
  noResponseMinutes?: number;
  noResolutionMinutes?: number;
  slaBreachThreshold?: number;

  // Actions
  escalateTo?: string;
  escalateToTeam?: string;
  notifyUsers?: string[];
  increasePriority: boolean;

  isActive: boolean;
  createdAt: Date;
}

export interface SLADefinition {
  id: string;
  tenantId: string;
  name: string;
  tier: SLATier;

  // Response time targets (in minutes)
  sev1ResponseMinutes: number;
  sev2ResponseMinutes: number;
  sev3ResponseMinutes: number;
  sev4ResponseMinutes: number;

  // Resolution time targets (in minutes)
  sev1ResolutionMinutes: number;
  sev2ResolutionMinutes: number;
  sev3ResolutionMinutes: number;
  sev4ResolutionMinutes: number;

  // Uptime commitments
  uptimePercentage: number;

  // Support hours
  supportHours: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: number[];

  // Credits
  creditPercentagePerBreach?: number;
  maxCreditPercentage?: number;

  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
}

export interface SLABreach {
  id: string;
  ticketId: string;
  slaDefinitionId: string;
  breachType: 'response' | 'resolution';
  targetTime: Date;
  actualTime?: Date;
  breachMinutes?: number;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  justification?: string;
  creditApplied: boolean;
  creditAmount?: number;
  createdAt: Date;
}

export interface CreateTicketInput {
  tenantId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  organization?: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  channel?: TicketChannel;
  category?: string;
  subcategory?: string;
  product?: string;
  version?: string;
  tags?: string[];
  slaTier?: SLATier;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  assignedTo?: string;
  assignedTeam?: string;
  tags?: string[];
  category?: string;
  subcategory?: string;
}

export interface TicketSearchFilters {
  tenantId?: string;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  severity?: TicketSeverity[];
  assignedTo?: string;
  assignedTeam?: string;
  customerEmail?: string;
  category?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  isOverdue?: boolean;
}

export interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  slaComplianceRate: number;
  avgSatisfactionScore: number;
  ticketsByPriority: Record<TicketPriority, number>;
  ticketsBySeverity: Record<TicketSeverity, number>;
  ticketsByStatus: Record<TicketStatus, number>;
}
