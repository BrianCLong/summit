"use strict";
/**
 * Operations Center
 *
 * Real-time operations center with common operating picture (COP),
 * multi-source data fusion, live situational awareness, and crisis response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsCenter = exports.CrisisResponseSchema = exports.CrisisLevelSchema = exports.WatchLogEntrySchema = exports.WatchShiftSchema = exports.AlertSchema = exports.AlertRuleSchema = exports.OperationalEventSchema = exports.CommonOperatingPictureSchema = exports.COPLayerSchema = exports.COPEntitySchema = exports.COPLayerTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Common Operating Picture (COP)
// ============================================================================
exports.COPLayerTypeSchema = zod_1.z.enum([
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
exports.COPEntitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
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
    category: zod_1.z.enum(['FRIENDLY', 'HOSTILE', 'NEUTRAL', 'UNKNOWN']),
    // Position and geometry
    geometry: zod_1.z.union([
        zod_1.z.object({
            type: zod_1.z.literal('Point'),
            coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]) // [lon, lat]
        }),
        zod_1.z.object({
            type: zod_1.z.literal('LineString'),
            coordinates: zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]))
        }),
        zod_1.z.object({
            type: zod_1.z.literal('Polygon'),
            coordinates: zod_1.z.array(zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()])))
        })
    ]),
    // Properties
    properties: zod_1.z.object({
        name: zod_1.z.string(),
        designation: zod_1.z.string().optional(),
        callSign: zod_1.z.string().optional(),
        status: zod_1.z.string(),
        confidence: zod_1.z.number(), // 0-100
        lastUpdate: zod_1.z.string(),
        source: zod_1.z.string(),
        classification: zod_1.z.string(),
        // Movement
        heading: zod_1.z.number().optional(), // degrees
        speed: zod_1.z.number().optional(), // km/h
        altitude: zod_1.z.number().optional(), // meters
        // Additional attributes
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
    }),
    // Display properties
    display: zod_1.z.object({
        layer: exports.COPLayerTypeSchema,
        symbol: zod_1.z.string(),
        color: zod_1.z.string(),
        size: zod_1.z.number(),
        visible: zod_1.z.boolean(),
        zIndex: zod_1.z.number()
    })
});
exports.COPLayerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.COPLayerTypeSchema,
    visible: zod_1.z.boolean(),
    opacity: zod_1.z.number(), // 0-1
    entities: zod_1.z.array(exports.COPEntitySchema),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.CommonOperatingPictureSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    operationId: zod_1.z.string().optional(),
    layers: zod_1.z.array(exports.COPLayerSchema),
    viewport: zod_1.z.object({
        center: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]), // [lon, lat]
        zoom: zod_1.z.number(),
        bearing: zod_1.z.number(), // degrees
        pitch: zod_1.z.number() // degrees
    }),
    timeWindow: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string(),
        current: zod_1.z.string()
    }),
    filters: zod_1.z.object({
        categories: zod_1.z.array(zod_1.z.string()),
        classifications: zod_1.z.array(zod_1.z.string()),
        sources: zod_1.z.array(zod_1.z.string()),
        minConfidence: zod_1.z.number()
    }),
    updatedAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Event Tracking
// ============================================================================
exports.OperationalEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
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
    severity: zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    priority: zod_1.z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),
    timestamp: zod_1.z.string(),
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        accuracy: zod_1.z.number().optional()
    }).optional(),
    // Event details
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    source: zod_1.z.string(),
    confidence: zod_1.z.number(), // 0-100
    // Related entities
    involvedEntities: zod_1.z.array(zod_1.z.string()),
    relatedEvents: zod_1.z.array(zod_1.z.string()),
    // Classification
    classification: zod_1.z.string(),
    caveats: zod_1.z.array(zod_1.z.string()),
    // Workflow
    status: zod_1.z.enum(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']),
    assignedTo: zod_1.z.string().optional(),
    // Correlation
    correlationId: zod_1.z.string().optional(),
    parentEventId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Alerts and Notifications
// ============================================================================
exports.AlertRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    enabled: zod_1.z.boolean(),
    // Trigger conditions
    conditions: zod_1.z.object({
        eventType: zod_1.z.array(zod_1.z.string()).optional(),
        severity: zod_1.z.array(zod_1.z.string()).optional(),
        entityType: zod_1.z.array(zod_1.z.string()).optional(),
        location: zod_1.z.object({
            lat: zod_1.z.number(),
            lon: zod_1.z.number(),
            radius: zod_1.z.number() // km
        }).optional(),
        keyword: zod_1.z.array(zod_1.z.string()).optional(),
        customLogic: zod_1.z.string().optional()
    }),
    // Actions
    actions: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'NOTIFY_USER',
            'SEND_EMAIL',
            'CREATE_TICKET',
            'ESCALATE',
            'UPDATE_COP',
            'TRIGGER_WORKFLOW',
            'EXECUTE_SCRIPT'
        ]),
        parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
    })),
    // Configuration
    throttle: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        windowMinutes: zod_1.z.number(),
        maxAlerts: zod_1.z.number()
    }),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.AlertSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ruleId: zod_1.z.string(),
    eventId: zod_1.z.string(),
    severity: zod_1.z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    priority: zod_1.z.enum(['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    acknowledgedAt: zod_1.z.string().optional(),
    acknowledgedBy: zod_1.z.string().optional(),
    status: zod_1.z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']),
    notifiedUsers: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Watch Operations
// ============================================================================
exports.WatchShiftSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['DAY', 'SWING', 'NIGHT', 'ROTATING']),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    personnel: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        role: zod_1.z.enum([
            'WATCH_OFFICER',
            'WATCH_SUPERVISOR',
            'ANALYST',
            'OPERATOR',
            'COORDINATOR',
            'SPECIALIST'
        ]),
        position: zod_1.z.string(),
        clearanceLevel: zod_1.z.string()
    })),
    responsibilities: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    handover: zod_1.z.object({
        fromShiftId: zod_1.z.string().optional(),
        toShiftId: zod_1.z.string().optional(),
        briefing: zod_1.z.string(),
        keyIssues: zod_1.z.array(zod_1.z.string()),
        pendingActions: zod_1.z.array(zod_1.z.string()),
        completedAt: zod_1.z.string().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.WatchLogEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    shiftId: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    type: zod_1.z.enum([
        'OBSERVATION',
        'ACTION_TAKEN',
        'COMMUNICATION',
        'STATUS_UPDATE',
        'INCIDENT',
        'DECISION',
        'COORDINATION'
    ]),
    entry: zod_1.z.string(),
    classification: zod_1.z.string(),
    author: zod_1.z.string(),
    relatedEvents: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Crisis Response
// ============================================================================
exports.CrisisLevelSchema = zod_1.z.enum([
    'STEADY_STATE',
    'HEIGHTENED_ALERT',
    'CRISIS',
    'EMERGENCY'
]);
exports.CrisisResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    level: exports.CrisisLevelSchema,
    trigger: zod_1.z.object({
        eventId: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        description: zod_1.z.string()
    }),
    // Response team
    team: zod_1.z.object({
        commander: zod_1.z.string(),
        deputy: zod_1.z.string(),
        members: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            role: zod_1.z.string(),
            contactInfo: zod_1.z.string()
        }))
    }),
    // Situation
    situation: zod_1.z.object({
        summary: zod_1.z.string(),
        timeline: zod_1.z.array(zod_1.z.object({
            timestamp: zod_1.z.string(),
            event: zod_1.z.string()
        })),
        affectedAssets: zod_1.z.array(zod_1.z.string()),
        impactAssessment: zod_1.z.string()
    }),
    // Response actions
    actions: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        description: zod_1.z.string(),
        priority: zod_1.z.enum(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']),
        assignedTo: zod_1.z.string(),
        status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
        deadline: zod_1.z.string().optional(),
        completedAt: zod_1.z.string().optional()
    })),
    // Communications
    communications: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        from: zod_1.z.string(),
        to: zod_1.z.array(zod_1.z.string()),
        channel: zod_1.z.string(),
        message: zod_1.z.string()
    })),
    // Decision log
    decisions: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        decisionMaker: zod_1.z.string(),
        decision: zod_1.z.string(),
        rationale: zod_1.z.string(),
        approvals: zod_1.z.array(zod_1.z.string())
    })),
    status: zod_1.z.enum(['ACTIVE', 'RESOLVED', 'ESCALATED', 'CANCELLED']),
    resolvedAt: zod_1.z.string().optional(),
    resolution: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Operations Center Service
// ============================================================================
class OperationsCenter {
    cops = new Map();
    events = new Map();
    alerts = new Map();
    alertRules = new Map();
    shifts = new Map();
    crises = new Map();
    /**
     * Create or update COP
     */
    updateCOP(cop) {
        const validated = exports.CommonOperatingPictureSchema.parse(cop);
        this.cops.set(validated.id, validated);
        return validated;
    }
    /**
     * Get current COP
     */
    getCOP(id) {
        return this.cops.get(id);
    }
    /**
     * Add entity to COP layer
     */
    addEntityToCOP(copId, layerId, entity) {
        const cop = this.cops.get(copId);
        if (!cop) {
            throw new Error(`COP ${copId} not found`);
        }
        const layer = cop.layers.find(l => l.id === layerId);
        if (!layer) {
            throw new Error(`Layer ${layerId} not found`);
        }
        const validated = exports.COPEntitySchema.parse(entity);
        layer.entities.push(validated);
        cop.updatedAt = new Date().toISOString();
    }
    /**
     * Record operational event
     */
    recordEvent(event) {
        const validated = exports.OperationalEventSchema.parse(event);
        this.events.set(validated.id, validated);
        // Check alert rules
        this.evaluateAlertRules(validated);
        return validated;
    }
    /**
     * Get events by filter
     */
    getEvents(filter) {
        let events = Array.from(this.events.values());
        if (filter?.type) {
            events = events.filter(e => filter.type.includes(e.type));
        }
        if (filter?.severity) {
            events = events.filter(e => filter.severity.includes(e.severity));
        }
        if (filter?.startTime) {
            events = events.filter(e => new Date(e.timestamp) >= new Date(filter.startTime));
        }
        if (filter?.endTime) {
            events = events.filter(e => new Date(e.timestamp) <= new Date(filter.endTime));
        }
        if (filter?.status) {
            events = events.filter(e => filter.status.includes(e.status));
        }
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Create alert rule
     */
    createAlertRule(rule) {
        const validated = exports.AlertRuleSchema.parse(rule);
        this.alertRules.set(validated.id, validated);
        return validated;
    }
    /**
     * Evaluate alert rules against an event
     */
    evaluateAlertRules(event) {
        for (const rule of this.alertRules.values()) {
            if (!rule.enabled) {
                continue;
            }
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
                const distance = this.calculateDistance(event.location.lat, event.location.lon, rule.conditions.location.lat, rule.conditions.location.lon);
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
    createAlert(rule, event) {
        const alert = {
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
        this.alerts.set(alert.id, exports.AlertSchema.parse(alert));
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values())
            .filter(a => a.status === 'ACTIVE')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId, userId) {
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
    createCrisisResponse(crisis) {
        const validated = exports.CrisisResponseSchema.parse(crisis);
        this.crises.set(validated.id, validated);
        return validated;
    }
    /**
     * Update crisis response
     */
    updateCrisisResponse(id, updates) {
        const crisis = this.crises.get(id);
        if (!crisis) {
            throw new Error(`Crisis ${id} not found`);
        }
        const updated = { ...crisis, ...updates, updatedAt: new Date().toISOString() };
        const validated = exports.CrisisResponseSchema.parse(updated);
        this.crises.set(id, validated);
        return validated;
    }
    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
}
exports.OperationsCenter = OperationsCenter;
