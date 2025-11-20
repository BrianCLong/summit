import { z } from 'zod';

// Event Types
export enum EventSource {
  NEWS = 'NEWS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  SENSOR = 'SENSOR',
  WEATHER = 'WEATHER',
  SEISMIC = 'SEISMIC',
  MANUAL = 'MANUAL',
  API = 'API',
  SYSTEM = 'SYSTEM',
}

export enum CrisisType {
  // Natural Disasters
  EARTHQUAKE = 'EARTHQUAKE',
  HURRICANE = 'HURRICANE',
  TORNADO = 'TORNADO',
  FLOOD = 'FLOOD',
  WILDFIRE = 'WILDFIRE',
  TSUNAMI = 'TSUNAMI',
  VOLCANO = 'VOLCANO',
  AVALANCHE = 'AVALANCHE',
  DROUGHT = 'DROUGHT',

  // Man-made Incidents
  TERRORIST_ATTACK = 'TERRORIST_ATTACK',
  ACTIVE_SHOOTER = 'ACTIVE_SHOOTER',
  HAZMAT = 'HAZMAT',
  EXPLOSION = 'EXPLOSION',
  BUILDING_COLLAPSE = 'BUILDING_COLLAPSE',
  TRANSPORTATION_ACCIDENT = 'TRANSPORTATION_ACCIDENT',
  CYBER_ATTACK = 'CYBER_ATTACK',

  // Health Emergencies
  DISEASE_OUTBREAK = 'DISEASE_OUTBREAK',
  PANDEMIC = 'PANDEMIC',
  MASS_CASUALTY = 'MASS_CASUALTY',

  // Infrastructure
  POWER_OUTAGE = 'POWER_OUTAGE',
  WATER_CONTAMINATION = 'WATER_CONTAMINATION',
  COMMUNICATIONS_FAILURE = 'COMMUNICATIONS_FAILURE',

  // Other
  CIVIL_UNREST = 'CIVIL_UNREST',
  HOSTAGE_SITUATION = 'HOSTAGE_SITUATION',
  MISSING_PERSONS = 'MISSING_PERSONS',
  UNKNOWN = 'UNKNOWN',
}

export enum SeverityLevel {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  CATASTROPHIC = 'CATASTROPHIC',
}

export enum AlertStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum AlertChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  VOICE = 'VOICE',
  SIREN = 'SIREN',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  RADIO = 'RADIO',
  TV = 'TV',
}

// Schemas
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  radius: z.number().positive().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

export const EventMonitoringConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  source: z.nativeEnum(EventSource),
  enabled: z.boolean(),
  keywords: z.array(z.string()).optional(),
  location: LocationSchema.optional(),
  crisisTypes: z.array(z.nativeEnum(CrisisType)),
  minSeverity: z.nativeEnum(SeverityLevel),
  pollingInterval: z.number().positive().optional(),
  apiEndpoint: z.string().url().optional(),
  credentials: z.record(z.string()).optional(),
});

export const DetectedEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  source: z.nativeEnum(EventSource),
  crisisType: z.nativeEnum(CrisisType),
  severity: z.nativeEnum(SeverityLevel),
  title: z.string(),
  description: z.string(),
  location: LocationSchema.optional(),
  detectedAt: z.date(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional(),
  rawData: z.any().optional(),
  correlationIds: z.array(z.string()).optional(),
});

export const ThresholdConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  metricType: z.string(),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']),
  threshold: z.number(),
  windowMinutes: z.number().positive(),
  severityLevel: z.nativeEnum(SeverityLevel),
  enabled: z.boolean(),
});

export const AnomalyConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  dataSource: z.string(),
  algorithm: z.enum(['zscore', 'mad', 'isolation_forest', 'lstm']),
  sensitivity: z.number().min(0).max(1),
  baselineDays: z.number().positive(),
  enabled: z.boolean(),
});

export const AlertSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  eventId: z.string().uuid(),
  crisisType: z.nativeEnum(CrisisType),
  severity: z.nativeEnum(SeverityLevel),
  status: z.nativeEnum(AlertStatus),
  title: z.string(),
  message: z.string(),
  location: LocationSchema.optional(),
  affectedPopulation: z.number().optional(),
  affectedArea: z.number().optional(),
  channels: z.array(z.nativeEnum(AlertChannel)),
  createdAt: z.date(),
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  escalationLevel: z.number().optional(),
  parentAlertId: z.string().uuid().optional(),
  duplicateOf: z.string().uuid().optional(),
});

export const EscalationRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  crisisTypes: z.array(z.nativeEnum(CrisisType)),
  minSeverity: z.nativeEnum(SeverityLevel),
  delayMinutes: z.number().positive(),
  escalateTo: z.array(z.string()),
  additionalChannels: z.array(z.nativeEnum(AlertChannel)),
  enabled: z.boolean(),
});

export const NotificationChainSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  steps: z.array(
    z.object({
      order: z.number(),
      recipients: z.array(z.string()),
      channels: z.array(z.nativeEnum(AlertChannel)),
      delayMinutes: z.number().min(0),
      requireAcknowledgement: z.boolean(),
      timeoutMinutes: z.number().positive().optional(),
    })
  ),
  enabled: z.boolean(),
});

// Types derived from schemas
export type Location = z.infer<typeof LocationSchema>;
export type EventMonitoringConfig = z.infer<typeof EventMonitoringConfigSchema>;
export type DetectedEvent = z.infer<typeof DetectedEventSchema>;
export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>;
export type AnomalyConfig = z.infer<typeof AnomalyConfigSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type EscalationRule = z.infer<typeof EscalationRuleSchema>;
export type NotificationChain = z.infer<typeof NotificationChainSchema>;

// Additional interfaces
export interface EventDetector {
  detect(): Promise<DetectedEvent[]>;
  getSourceType(): EventSource;
}

export interface AlertGenerator {
  generateAlert(event: DetectedEvent): Promise<Alert>;
  shouldCreateAlert(event: DetectedEvent): boolean;
}

export interface AlertDistributor {
  distribute(alert: Alert): Promise<void>;
  getChannels(): AlertChannel[];
}

export interface ThresholdMonitor {
  checkThreshold(metric: string, value: number): Promise<boolean>;
  getViolations(): ThresholdConfig[];
}

export interface AnomalyDetector {
  detectAnomalies(data: number[]): Promise<number[]>;
  updateBaseline(data: number[]): Promise<void>;
}

export interface AlertCorrelator {
  correlate(alerts: Alert[]): Promise<Map<string, Alert[]>>;
  deduplicate(alerts: Alert[]): Promise<Alert[]>;
}
