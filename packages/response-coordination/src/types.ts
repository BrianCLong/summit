import { z } from 'zod';
import { CrisisType, SeverityLevel } from '@intelgraph/crisis-detection';

// Incident Command System (ICS) Roles
export enum ICSRole {
  INCIDENT_COMMANDER = 'INCIDENT_COMMANDER',
  DEPUTY_IC = 'DEPUTY_IC',

  // Command Staff
  PUBLIC_INFORMATION_OFFICER = 'PUBLIC_INFORMATION_OFFICER',
  SAFETY_OFFICER = 'SAFETY_OFFICER',
  LIAISON_OFFICER = 'LIAISON_OFFICER',

  // General Staff - Operations
  OPERATIONS_SECTION_CHIEF = 'OPERATIONS_SECTION_CHIEF',
  STAGING_AREA_MANAGER = 'STAGING_AREA_MANAGER',
  BRANCH_DIRECTOR = 'BRANCH_DIRECTOR',
  DIVISION_SUPERVISOR = 'DIVISION_SUPERVISOR',
  GROUP_SUPERVISOR = 'GROUP_SUPERVISOR',
  STRIKE_TEAM_LEADER = 'STRIKE_TEAM_LEADER',
  TASK_FORCE_LEADER = 'TASK_FORCE_LEADER',
  SINGLE_RESOURCE_LEADER = 'SINGLE_RESOURCE_LEADER',

  // General Staff - Planning
  PLANNING_SECTION_CHIEF = 'PLANNING_SECTION_CHIEF',
  RESOURCES_UNIT_LEADER = 'RESOURCES_UNIT_LEADER',
  SITUATION_UNIT_LEADER = 'SITUATION_UNIT_LEADER',
  DOCUMENTATION_UNIT_LEADER = 'DOCUMENTATION_UNIT_LEADER',
  DEMOBILIZATION_UNIT_LEADER = 'DEMOBILIZATION_UNIT_LEADER',

  // General Staff - Logistics
  LOGISTICS_SECTION_CHIEF = 'LOGISTICS_SECTION_CHIEF',
  SUPPLY_UNIT_LEADER = 'SUPPLY_UNIT_LEADER',
  FACILITIES_UNIT_LEADER = 'FACILITIES_UNIT_LEADER',
  GROUND_SUPPORT_UNIT_LEADER = 'GROUND_SUPPORT_UNIT_LEADER',
  COMMUNICATIONS_UNIT_LEADER = 'COMMUNICATIONS_UNIT_LEADER',

  // General Staff - Finance/Admin
  FINANCE_SECTION_CHIEF = 'FINANCE_SECTION_CHIEF',
  TIME_UNIT_LEADER = 'TIME_UNIT_LEADER',
  PROCUREMENT_UNIT_LEADER = 'PROCUREMENT_UNIT_LEADER',
  COMPENSATION_CLAIMS_UNIT_LEADER = 'COMPENSATION_CLAIMS_UNIT_LEADER',
  COST_UNIT_LEADER = 'COST_UNIT_LEADER',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  IMMEDIATE = 'IMMEDIATE',
}

export enum ResponsePhase {
  ACTIVATION = 'ACTIVATION',
  INITIAL_RESPONSE = 'INITIAL_RESPONSE',
  SUSTAINED_RESPONSE = 'SUSTAINED_RESPONSE',
  STABILIZATION = 'STABILIZATION',
  TRANSITION = 'TRANSITION',
  DEMOBILIZATION = 'DEMOBILIZATION',
}

export enum CommandStructure {
  SINGLE_COMMAND = 'SINGLE_COMMAND',
  UNIFIED_COMMAND = 'UNIFIED_COMMAND',
  AREA_COMMAND = 'AREA_COMMAND',
}

// Schemas
export const ICSPositionSchema = z.object({
  id: z.string().uuid(),
  role: z.nativeEnum(ICSRole),
  assignedTo: z.string().optional(),
  assignedAt: z.date().optional(),
  reportingTo: z.string().uuid().optional(),
  subordinates: z.array(z.string().uuid()).optional(),
  responsibilities: z.array(z.string()),
  contactInfo: z.string().optional(),
});

export const IncidentCommandStructureSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  commandStructure: z.nativeEnum(CommandStructure),
  activatedAt: z.date(),
  positions: z.array(ICSPositionSchema),
  unifiedCommandAgencies: z.array(z.string()).optional(),
});

export const ResponseTaskSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  assignedTo: z.array(z.string()),
  assignedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  completedBy: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  requiredResources: z.array(z.string()).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  notes: z.array(
    z.object({
      author: z.string(),
      content: z.string(),
      timestamp: z.date(),
    })
  ),
});

export const TeamAssignmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    'STRIKE_TEAM',
    'TASK_FORCE',
    'DIVISION',
    'GROUP',
    'BRANCH',
    'UNIT',
  ]),
  leader: z.string(),
  members: z.array(z.string()),
  assignedTasks: z.array(z.string().uuid()),
  status: z.enum(['STAGING', 'DEPLOYED', 'ACTIVE', 'RETURNING', 'AVAILABLE']),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  equipment: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
});

export const MutualAidRequestSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  requestingAgency: z.string(),
  requestedFrom: z.string(),
  resourceType: z.string(),
  quantity: z.number().positive(),
  priority: z.nativeEnum(TaskPriority),
  status: z.enum([
    'PENDING',
    'APPROVED',
    'DISPATCHED',
    'ARRIVED',
    'COMPLETED',
    'DENIED',
    'CANCELLED',
  ]),
  requestedAt: z.date(),
  neededBy: z.date().optional(),
  approvedAt: z.date().optional(),
  approvedBy: z.string().optional(),
  deployedAt: z.date().optional(),
  arrivedAt: z.date().optional(),
  notes: z.string().optional(),
});

export const OperationalPeriodSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  periodNumber: z.number().positive(),
  startTime: z.date(),
  endTime: z.date(),
  objectives: z.array(z.string()),
  strategies: z.array(z.string()),
  safetyMessage: z.string().optional(),
  weatherForecast: z.string().optional(),
  approvedBy: z.string(),
  approvedAt: z.date(),
});

export const StatusReportSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  reportType: z.enum([
    'SITUATION',
    'RESOURCE',
    'INCIDENT_ACTION_PLAN',
    'PERSONNEL',
    'SAFETY',
    'DEMOBILIZATION',
  ]),
  reportedBy: z.string(),
  reportedAt: z.date(),
  content: z.record(z.any()),
  attachments: z.array(z.string()).optional(),
});

export const AfterActionItemSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  category: z.enum([
    'STRENGTH',
    'AREA_FOR_IMPROVEMENT',
    'LESSON_LEARNED',
    'RECOMMENDATION',
  ]),
  title: z.string(),
  description: z.string(),
  impact: z.nativeEnum(SeverityLevel),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED']),
  createdBy: z.string(),
  createdAt: z.date(),
});

// Types derived from schemas
export type ICSPosition = z.infer<typeof ICSPositionSchema>;
export type IncidentCommandStructure = z.infer<typeof IncidentCommandStructureSchema>;
export type ResponseTask = z.infer<typeof ResponseTaskSchema>;
export type TeamAssignment = z.infer<typeof TeamAssignmentSchema>;
export type MutualAidRequest = z.infer<typeof MutualAidRequestSchema>;
export type OperationalPeriod = z.infer<typeof OperationalPeriodSchema>;
export type StatusReport = z.infer<typeof StatusReportSchema>;
export type AfterActionItem = z.infer<typeof AfterActionItemSchema>;

// Interfaces
export interface ResponseCoordinator {
  assignTask(task: ResponseTask, teamId: string): Promise<void>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  getActiveTasks(): ResponseTask[];
}

export interface ICSManager {
  createCommandStructure(
    incidentId: string,
    structure: CommandStructure
  ): Promise<IncidentCommandStructure>;
  assignPosition(structureId: string, role: ICSRole, userId: string): Promise<void>;
  getCommandStructure(incidentId: string): IncidentCommandStructure | undefined;
}

export interface CheckInService {
  checkIn(userId: string, location: any, status: string): Promise<void>;
  checkOut(userId: string): Promise<void>;
  getStatus(userId: string): CheckInRecord | undefined;
}

export interface CheckInRecord {
  userId: string;
  checkInTime: Date;
  location: any;
  status: string;
  lastUpdate: Date;
}
