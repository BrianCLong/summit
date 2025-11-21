/**
 * Operations Center
 *
 * Real-time operations center with common operating picture (COP),
 * multi-source data fusion, live situational awareness, and crisis response.
 */

import { z } from 'zod';

// ============================================================================
// Common Operating Picture (COP)
// ============================================================================

export const COPLayerTypeSchema = z.enum([
  'BASE_MAP',
  'FRIENDLY_FORCES',
  'ENEMY_FORCES',
  'NEUTRAL_FORCES',
  'INFRASTRUCTURE',
  'WEATHER',
  'INTELLIGENCE',
  'SENSOR_COVERAGE',
  'COLLECTION_ASSETS',
  'TARGET_OVERLAY',
  'ROUTE_OVERLAY',
  'AREA_OF_INTEREST',
  'NO_FLY_ZONE',
  'CONTROLLED_AIRSPACE'
]);

export const COPEntitySchema = z.object({
  id: z.string(),
  type: z.enum([
    'UNIT',
    'FACILITY',
    'VEHICLE',
    'AIRCRAFT',
    'VESSEL',
    'PERSON',
    'SENSOR',
    'TARGET',
    'EVENT',
    'BOUNDARY'
  ]),
  category: z.enum(['FRIENDLY', 'HOSTILE', 'NEUTRAL', 'UNKNOWN']),

  // Position and geometry
  geometry: z.union([
    z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]) // [lon, lat]
    }),
    z.object({
      type: z.literal('LineString'),
      coordinates: z.array(z.tuple([z.number(), z.number()]))
    }),
    z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()])))
    })
  ]),

  // Properties
  properties: z.object({
    name: z.string(),
    designation: z.string().optional(),
    callSign: z.string().optional(),
    status: z.string(),
    confidence: z.number(), // 0-100
    lastUpdate: z.string(),
    source: z.string(),
    classification: z.string(),

    // Movement
    heading: z.number().optional(), // degrees
    speed: z.number().optional(), // km/h
    altitude: z.number().optional(), // meters

    // Additional attributes
    metadata: z.record(z.unknown())
  }),

  // Display properties
  display: z.object({
    layer: COPLayerTypeSchema,
    symbol: z.string(),
    color: z.string(),
    size: z.number(),
    visible: z.boolean(),
    zIndex: z.number()
  })
});

export const COPLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: COPLayerTypeSchema,
  visible: z.boolean(),
  opacity: z.number(), // 0-1
  entities: z.array(COPEntitySchema),
  metadata: z.record(z.unknown())
});

export const CommonOperatingPictureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  operationId: z.string().optional(),

  layers: z.array(COPLayerSchema),

  viewport: z.object({
    center: z.tuple([z.number(), z.number()]), // [lon, lat]
    zoom: z.number(),
    bearing: z.number(), // degrees
    pitch: z.number() // degrees
  }),

  timeWindow: z.object({
    start: z.string(),
    end: z.string(),
    current: z.string()
  }),

  filters: z.object({
    categories: z.array(z.string()),
    classifications: z.array(z.string()),
    sources: z.array(z.string()),
    minConfidence: z.number()
  }),

  updatedAt: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Event Tracking
// ============================================================================

export const OperationalEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'CONTACT',
    'DETECTION',
    'ENGAGEMENT',
    'MOVEMENT',
    'COMMUNICATION',
    'ALERT',
    'STATUS_CHANGE',
    'INTELLIGENCE_REPORT',
    'SENSOR_ACTIVATION',
    'MISSION_UPDATE'
  ]),

  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priority: z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),

  timestamp: z.string(),
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional()
  }).optional(),

  // Event details
  title: z.string(),
  description: z.string(),
  source: z.string(),
  confidence: z.number(), // 0-100

  // Related entities
  involvedEntities: z.array(z.string()),
  relatedEvents: z.array(z.string()),

  // Classification
  classification: z.string(),
  caveats: z.array(z.string()),

  // Workflow
  status: z.enum(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']),
  assignedTo: z.string().optional(),

  // Correlation
  correlationId: z.string().optional(),
  parentEventId: z.string().optional(),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Alerts and Notifications
// ============================================================================

export const AlertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),

  // Trigger conditions
  conditions: z.object({
    eventType: z.array(z.string()).optional(),
    severity: z.array(z.string()).optional(),
    entityType: z.array(z.string()).optional(),
    location: z.object({
      lat: z.number(),
      lon: z.number(),
      radius: z.number() // km
    }).optional(),
    keyword: z.array(z.string()).optional(),
    customLogic: z.string().optional()
  }),

  // Actions
  actions: z.array(z.object({
    type: z.enum([
      'NOTIFY_USER',
      'SEND_EMAIL',
      'CREATE_TICKET',
      'ESCALATE',
      'UPDATE_COP',
      'TRIGGER_WORKFLOW',
      'EXECUTE_SCRIPT'
    ]),
    parameters: z.record(z.unknown())
  })),

  // Configuration
  throttle: z.object({
    enabled: z.boolean(),
    windowMinutes: z.number(),
    maxAlerts: z.number()
  }),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  createdBy: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.unknown())
});

export const AlertSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  eventId: z.string(),

  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priority: z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),

  title: z.string(),
  message: z.string(),

  timestamp: z.string(),
  acknowledgedAt: z.string().optional(),
  acknowledgedBy: z.string().optional(),

  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']),

  notifiedUsers: z.array(z.string()),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Watch Operations
// ============================================================================

export const WatchShiftSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['DAY', 'SWING', 'NIGHT', 'ROTATING']),

  startTime: z.string(),
  endTime: z.string(),

  personnel: z.array(z.object({
    userId: z.string(),
    role: z.enum([
      'WATCH_OFFICER',
      'WATCH_SUPERVISOR',
      'ANALYST',
      'OPERATOR',
      'COORDINATOR',
      'SPECIALIST'
    ]),
    position: z.string(),
    clearanceLevel: z.string()
  })),

  responsibilities: z.array(z.string()),

  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),

  handover: z.object({
    fromShiftId: z.string().optional(),
    toShiftId: z.string().optional(),
    briefing: z.string(),
    keyIssues: z.array(z.string()),
    pendingActions: z.array(z.string()),
    completedAt: z.string().optional()
  }).optional(),

  metadata: z.record(z.unknown())
});

export const WatchLogEntrySchema = z.object({
  id: z.string(),
  shiftId: z.string(),
  timestamp: z.string(),

  type: z.enum([
    'OBSERVATION',
    'ACTION_TAKEN',
    'COMMUNICATION',
    'STATUS_UPDATE',
    'INCIDENT',
    'DECISION',
    'COORDINATION'
  ]),

  entry: z.string(),
  classification: z.string(),

  author: z.string(),
  relatedEvents: z.array(z.string()),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Crisis Response
// ============================================================================

export const CrisisLevelSchema = z.enum([
  'STEADY_STATE',
  'HEIGHTENED_ALERT',
  'CRISIS',
  'EMERGENCY'
]);

export const CrisisResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: CrisisLevelSchema,

  trigger: z.object({
    eventId: z.string(),
    timestamp: z.string(),
    description: z.string()
  }),

  // Response team
  team: z.object({
    commander: z.string(),
    deputy: z.string(),
    members: z.array(z.object({
      userId: z.string(),
      role: z.string(),
      contactInfo: z.string()
    }))
  }),

  // Situation
  situation: z.object({
    summary: z.string(),
    timeline: z.array(z.object({
      timestamp: z.string(),
      event: z.string()
    })),
    affectedAssets: z.array(z.string()),
    impactAssessment: z.string()
  }),

  // Response actions
  actions: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.enum(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']),
    assignedTo: z.string(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    deadline: z.string().optional(),
    completedAt: z.string().optional()
  })),

  // Communications
  communications: z.array(z.object({
    timestamp: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    channel: z.string(),
    message: z.string()
  })),

  // Decision log
  decisions: z.array(z.object({
    timestamp: z.string(),
    decisionMaker: z.string(),
    decision: z.string(),
    rationale: z.string(),
    approvals: z.array(z.string())
  })),

  status: z.enum(['ACTIVE', 'RESOLVED', 'ESCALATED', 'CANCELLED']),

  resolvedAt: z.string().optional(),
  resolution: z.string().optional(),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type COPLayerType = z.infer<typeof COPLayerTypeSchema>;
export type COPEntity = z.infer<typeof COPEntitySchema>;
export type COPLayer = z.infer<typeof COPLayerSchema>;
export type CommonOperatingPicture = z.infer<typeof CommonOperatingPictureSchema>;
export type OperationalEvent = z.infer<typeof OperationalEventSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type WatchShift = z.infer<typeof WatchShiftSchema>;
export type WatchLogEntry = z.infer<typeof WatchLogEntrySchema>;
export type CrisisLevel = z.infer<typeof CrisisLevelSchema>;
export type CrisisResponse = z.infer<typeof CrisisResponseSchema>;

// ============================================================================
// Operations Center Service
// ============================================================================

export class OperationsCenter {
  private cops: Map<string, CommonOperatingPicture> = new Map();
  private events: Map<string, OperationalEvent> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private shifts: Map<string, WatchShift> = new Map();
  private crises: Map<string, CrisisResponse> = new Map();

  /**
   * Create or update COP
   */
  updateCOP(cop: CommonOperatingPicture): CommonOperatingPicture {
    const validated = CommonOperatingPictureSchema.parse(cop);
    this.cops.set(validated.id, validated);
    return validated;
  }

  /**
   * Get current COP
   */
  getCOP(id: string): CommonOperatingPicture | undefined {
    return this.cops.get(id);
  }

  /**
   * Add entity to COP layer
   */
  addEntityToCOP(copId: string, layerId: string, entity: COPEntity): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP ${copId} not found`);
    }

    const layer = cop.layers.find(l => l.id === layerId);
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`);
    }

    const validated = COPEntitySchema.parse(entity);
    layer.entities.push(validated);
    cop.updatedAt = new Date().toISOString();
  }

  /**
   * Record operational event
   */
  recordEvent(event: OperationalEvent): OperationalEvent {
    const validated = OperationalEventSchema.parse(event);
    this.events.set(validated.id, validated);

    // Check alert rules
    this.evaluateAlertRules(validated);

    return validated;
  }

  /**
   * Get events by filter
   */
  getEvents(filter?: {
    type?: string[];
    severity?: string[];
    startTime?: string;
    endTime?: string;
    status?: string[];
  }): OperationalEvent[] {
    let events = Array.from(this.events.values());

    if (filter?.type) {
      events = events.filter(e => filter.type!.includes(e.type));
    }
    if (filter?.severity) {
      events = events.filter(e => filter.severity!.includes(e.severity));
    }
    if (filter?.startTime) {
      events = events.filter(e => new Date(e.timestamp) >= new Date(filter.startTime!));
    }
    if (filter?.endTime) {
      events = events.filter(e => new Date(e.timestamp) <= new Date(filter.endTime!));
    }
    if (filter?.status) {
      events = events.filter(e => filter.status!.includes(e.status));
    }

    return events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Create alert rule
   */
  createAlertRule(rule: AlertRule): AlertRule {
    const validated = AlertRuleSchema.parse(rule);
    this.alertRules.set(validated.id, validated);
    return validated;
  }

  /**
   * Evaluate alert rules against an event
   */
  private evaluateAlertRules(event: OperationalEvent): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      let matches = true;

      // Check event type
      if (rule.conditions.eventType && rule.conditions.eventType.length > 0) {
        matches = matches && rule.conditions.eventType.includes(event.type);
      }

      // Check severity
      if (rule.conditions.severity && rule.conditions.severity.length > 0) {
        matches = matches && rule.conditions.severity.includes(event.severity);
      }

      // Check location
      if (rule.conditions.location && event.location) {
        const distance = this.calculateDistance(
          event.location.lat,
          event.location.lon,
          rule.conditions.location.lat,
          rule.conditions.location.lon
        );
        matches = matches && distance <= rule.conditions.location.radius;
      }

      if (matches) {
        this.createAlert(rule, event);
      }
    }
  }

  /**
   * Create alert from rule and event
   */
  private createAlert(rule: AlertRule, event: OperationalEvent): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      eventId: event.id,
      severity: event.severity,
      priority: event.priority,
      title: `Alert: ${event.title}`,
      message: event.description,
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      notifiedUsers: [],
      metadata: {}
    };

    this.alerts.set(alert.id, AlertSchema.parse(alert));
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.status === 'ACTIVE')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId;

    return alert;
  }

  /**
   * Create crisis response
   */
  createCrisisResponse(crisis: CrisisResponse): CrisisResponse {
    const validated = CrisisResponseSchema.parse(crisis);
    this.crises.set(validated.id, validated);
    return validated;
  }

  /**
   * Update crisis response
   */
  updateCrisisResponse(id: string, updates: Partial<CrisisResponse>): CrisisResponse {
    const crisis = this.crises.get(id);
    if (!crisis) {
      throw new Error(`Crisis ${id} not found`);
    }

    const updated = { ...crisis, ...updates, updatedAt: new Date().toISOString() };
    const validated = CrisisResponseSchema.parse(updated);
    this.crises.set(id, validated);
    return validated;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
