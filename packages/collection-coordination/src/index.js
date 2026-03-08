"use strict";
/**
 * Collection Asset Coordination
 *
 * Comprehensive collection asset management, tasking, scheduling, and
 * coordination for multi-platform intelligence collection operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionCoordinator = exports.AssetPerformanceSchema = exports.DeconflictionRecordSchema = exports.ScheduleSlotSchema = exports.CollectionTaskSchema = exports.CollectionAssetSchema = exports.PlatformTypeSchema = exports.AssetStatusSchema = exports.AssetTypeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Asset Types
// ============================================================================
exports.AssetTypeSchema = zod_1.z.enum([
    'SATELLITE',
    'UAV',
    'AIRCRAFT',
    'GROUND_SENSOR',
    'MARITIME_VESSEL',
    'CYBER_SENSOR',
    'HUMAN_SOURCE',
    'TECHNICAL_COLLECTION',
    'SIGNALS_INTELLIGENCE',
    'IMAGERY_INTELLIGENCE',
    'MEASUREMENT_SIGNATURE'
]);
exports.AssetStatusSchema = zod_1.z.enum([
    'AVAILABLE',
    'TASKED',
    'IN_OPERATION',
    'MAINTENANCE',
    'OFFLINE',
    'DEGRADED',
    'LOST'
]);
exports.PlatformTypeSchema = zod_1.z.enum([
    'SATELLITE_LEO',
    'SATELLITE_MEO',
    'SATELLITE_GEO',
    'UAV_TACTICAL',
    'UAV_STRATEGIC',
    'MANNED_AIRCRAFT',
    'GROUND_STATION',
    'MOBILE_PLATFORM',
    'NAVAL_VESSEL',
    'SUBMARINE',
    'CYBER_INFRASTRUCTURE'
]);
// ============================================================================
// Collection Assets
// ============================================================================
exports.CollectionAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.AssetTypeSchema,
    platform: exports.PlatformTypeSchema,
    status: exports.AssetStatusSchema,
    // Capabilities
    capabilities: zod_1.z.object({
        sensors: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum([
                'ELECTRO_OPTICAL',
                'INFRARED',
                'SAR',
                'MULTISPECTRAL',
                'HYPERSPECTRAL',
                'RADAR',
                'SIGINT',
                'COMINT',
                'ELINT',
                'ACOUSTIC',
                'SEISMIC',
                'CHEMICAL',
                'BIOLOGICAL',
                'NUCLEAR'
            ]),
            resolution: zod_1.z.string().optional(),
            range: zod_1.z.number().optional(), // km
            fieldOfView: zod_1.z.number().optional(), // degrees
            status: zod_1.z.enum(['OPERATIONAL', 'DEGRADED', 'OFFLINE'])
        })),
        coverage: zod_1.z.object({
            type: zod_1.z.enum(['POINT', 'AREA', 'ROUTE', 'GLOBAL']),
            maxArea: zod_1.z.number().optional(), // sq km
            revisitRate: zod_1.z.number().optional(), // hours
            persistence: zod_1.z.boolean()
        }),
        communications: zod_1.z.object({
            dataRate: zod_1.z.number(), // Mbps
            latency: zod_1.z.number(), // ms
            reliability: zod_1.z.number() // 0-100
        })
    }),
    // Positioning and mobility
    position: zod_1.z.object({
        lat: zod_1.z.number().optional(),
        lon: zod_1.z.number().optional(),
        altitude: zod_1.z.number().optional(), // meters
        heading: zod_1.z.number().optional(), // degrees
        speed: zod_1.z.number().optional(), // km/h
        lastUpdate: zod_1.z.string()
    }),
    // Operational parameters
    operational: zod_1.z.object({
        availability: zod_1.z.number(), // percentage
        utilizationRate: zod_1.z.number(), // percentage
        lastMaintenance: zod_1.z.string(),
        nextMaintenance: zod_1.z.string(),
        operatingHours: zod_1.z.number(),
        maxOperatingHours: zod_1.z.number().optional(),
        fuel: zod_1.z.number().optional(), // percentage
        battery: zod_1.z.number().optional() // percentage
    }),
    // Security and access
    security: zod_1.z.object({
        classification: zod_1.z.enum([
            'UNCLASSIFIED',
            'CONFIDENTIAL',
            'SECRET',
            'TOP_SECRET',
            'TOP_SECRET_SCI'
        ]),
        caveats: zod_1.z.array(zod_1.z.string()),
        authorizedUsers: zod_1.z.array(zod_1.z.string()),
        foreignDisclosure: zod_1.z.boolean()
    }),
    // Assignment and tasking
    assignment: zod_1.z.object({
        currentMission: zod_1.z.string().optional(),
        assignedTo: zod_1.z.string().optional(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        availableFrom: zod_1.z.string().optional(),
        reservedUntil: zod_1.z.string().optional()
    }),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
// ============================================================================
// Collection Tasking
// ============================================================================
exports.CollectionTaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    missionId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    priority: zod_1.z.enum(['IMMEDIATE', 'PRIORITY', 'ROUTINE']),
    status: zod_1.z.enum([
        'PENDING',
        'APPROVED',
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ]),
    // Task details
    taskType: zod_1.z.enum([
        'AREA_SEARCH',
        'POINT_TARGET',
        'ROUTE_SURVEILLANCE',
        'PERSISTENT_MONITORING',
        'SIGNAL_COLLECTION',
        'COMMUNICATIONS_INTERCEPT',
        'PATTERN_ANALYSIS'
    ]),
    // Target specification
    target: zod_1.z.object({
        type: zod_1.z.enum(['LOCATION', 'ENTITY', 'SIGNAL', 'PATTERN']),
        coordinates: zod_1.z.object({
            lat: zod_1.z.number(),
            lon: zod_1.z.number(),
            radius: zod_1.z.number().optional()
        }).optional(),
        entityId: zod_1.z.string().optional(),
        frequency: zod_1.z.object({
            min: zod_1.z.number(),
            max: zod_1.z.number(),
            unit: zod_1.z.string()
        }).optional(),
        description: zod_1.z.string()
    }),
    // Collection parameters
    parameters: zod_1.z.object({
        startTime: zod_1.z.string(),
        endTime: zod_1.z.string(),
        duration: zod_1.z.number().optional(), // minutes
        revisitInterval: zod_1.z.number().optional(), // minutes
        resolution: zod_1.z.string().optional(),
        sensorMode: zod_1.z.string().optional(),
        collectionAngle: zod_1.z.number().optional(), // degrees
        cloudCover: zod_1.z.number().optional(), // max percentage
        illumination: zod_1.z.enum(['DAY', 'NIGHT', 'TWILIGHT', 'ANY']).optional()
    }),
    // Requirements
    requirements: zod_1.z.object({
        minimumQuality: zod_1.z.number(), // 0-100
        timeliness: zod_1.z.enum(['REAL_TIME', 'NEAR_REAL_TIME', 'ROUTINE']),
        deliveryFormat: zod_1.z.array(zod_1.z.string()),
        processingLevel: zod_1.z.enum(['RAW', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3']),
        disseminationList: zod_1.z.array(zod_1.z.string())
    }),
    // Execution
    execution: zod_1.z.object({
        scheduledStart: zod_1.z.string().optional(),
        actualStart: zod_1.z.string().optional(),
        actualEnd: zod_1.z.string().optional(),
        dataCollected: zod_1.z.number().optional(), // MB
        qualityScore: zod_1.z.number().optional(), // 0-100
        issues: zod_1.z.array(zod_1.z.string())
    }),
    // Coordination
    coordination: zod_1.z.object({
        deconflictedWith: zod_1.z.array(zod_1.z.string()),
        relatedTasks: zod_1.z.array(zod_1.z.string()),
        dependencies: zod_1.z.array(zod_1.z.string())
    }),
    requestedBy: zod_1.z.string(),
    approvedBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Scheduling
// ============================================================================
exports.ScheduleSlotSchema = zod_1.z.object({
    id: zod_1.z.string(),
    assetId: zod_1.z.string(),
    taskId: zod_1.z.string().optional(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    type: zod_1.z.enum([
        'COLLECTION',
        'MAINTENANCE',
        'TRANSIT',
        'CALIBRATION',
        'RESERVED',
        'BLOCKED'
    ]),
    priority: zod_1.z.number(),
    conflictsWith: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.DeconflictionRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    assetIds: zod_1.z.array(zod_1.z.string()),
    taskIds: zod_1.z.array(zod_1.z.string()),
    conflictType: zod_1.z.enum([
        'TIME_OVERLAP',
        'FREQUENCY_INTERFERENCE',
        'SPATIAL_CONFLICT',
        'RESOURCE_CONTENTION',
        'POLICY_VIOLATION'
    ]),
    severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    resolution: zod_1.z.string(),
    resolvedBy: zod_1.z.string(),
    resolvedAt: zod_1.z.string(),
    status: zod_1.z.enum(['IDENTIFIED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'])
});
// ============================================================================
// Performance Monitoring
// ============================================================================
exports.AssetPerformanceSchema = zod_1.z.object({
    assetId: zod_1.z.string(),
    period: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string()
    }),
    metrics: zod_1.z.object({
        availability: zod_1.z.number(), // percentage
        reliability: zod_1.z.number(), // percentage
        tasksCompleted: zod_1.z.number(),
        tasksFailed: zod_1.z.number(),
        dataCollected: zod_1.z.number(), // GB
        averageQuality: zod_1.z.number(), // 0-100
        responseTime: zod_1.z.number(), // average minutes from task to execution
        downtime: zod_1.z.number() // hours
    }),
    issues: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        type: zod_1.z.enum([
            'SENSOR_FAILURE',
            'COMMUNICATION_LOSS',
            'POSITIONING_ERROR',
            'DATA_CORRUPTION',
            'POWER_ISSUE',
            'ENVIRONMENTAL'
        ]),
        severity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        description: zod_1.z.string(),
        resolved: zod_1.z.boolean()
    })),
    recommendations: zod_1.z.array(zod_1.z.string()),
    generatedAt: zod_1.z.string()
});
// ============================================================================
// Collection Coordination Service
// ============================================================================
class CollectionCoordinator {
    assets = new Map();
    tasks = new Map();
    schedules = new Map();
    deconflictions = new Map();
    /**
     * Register a collection asset
     */
    registerAsset(asset) {
        const validated = exports.CollectionAssetSchema.parse(asset);
        this.assets.set(validated.id, validated);
        this.schedules.set(validated.id, []);
        return validated;
    }
    /**
     * Get available assets for a task
     */
    getAvailableAssets(options) {
        const assets = Array.from(this.assets.values());
        return assets.filter(asset => {
            // Check type
            if (options.type && asset.type !== options.type) {
                return false;
            }
            // Check status
            if (asset.status !== 'AVAILABLE' && asset.status !== 'TASKED') {
                return false;
            }
            // Check availability window
            const schedule = this.schedules.get(asset.id) || [];
            const hasConflict = schedule.some(slot => {
                const slotStart = new Date(slot.startTime);
                const slotEnd = new Date(slot.endTime);
                const taskStart = new Date(options.startTime);
                const taskEnd = new Date(options.endTime);
                return (taskStart < slotEnd && taskEnd > slotStart);
            });
            if (hasConflict) {
                return false;
            }
            // Check capabilities
            if (options.capabilities) {
                const assetCapabilities = asset.capabilities.sensors.map(s => s.type);
                const hasRequiredCapabilities = options.capabilities.every(cap => assetCapabilities.includes(cap));
                if (!hasRequiredCapabilities) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Create collection task
     */
    createTask(task) {
        const validated = exports.CollectionTaskSchema.parse(task);
        this.tasks.set(validated.id, validated);
        return validated;
    }
    /**
     * Schedule a task on an asset
     */
    scheduleTask(taskId, assetId) {
        const task = this.tasks.get(taskId);
        const asset = this.assets.get(assetId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        if (!asset) {
            throw new Error(`Asset ${assetId} not found`);
        }
        // Create schedule slot
        const slot = {
            id: `slot-${Date.now()}`,
            assetId,
            taskId,
            startTime: task.parameters.startTime,
            endTime: task.parameters.endTime,
            type: 'COLLECTION',
            priority: task.priority === 'IMMEDIATE' ? 3 : task.priority === 'PRIORITY' ? 2 : 1,
            conflictsWith: [],
            metadata: {}
        };
        const validated = exports.ScheduleSlotSchema.parse(slot);
        // Add to schedule
        const schedule = this.schedules.get(assetId) || [];
        schedule.push(validated);
        this.schedules.set(assetId, schedule);
        // Update task status
        task.status = 'SCHEDULED';
        task.execution.scheduledStart = validated.startTime;
        return validated;
    }
    /**
     * Detect scheduling conflicts
     */
    detectConflicts(assetId) {
        const schedule = this.schedules.get(assetId) || [];
        const conflicts = [];
        for (let i = 0; i < schedule.length; i++) {
            for (let j = i + 1; j < schedule.length; j++) {
                const slot1 = schedule[i];
                const slot2 = schedule[j];
                const start1 = new Date(slot1.startTime);
                const end1 = new Date(slot1.endTime);
                const start2 = new Date(slot2.startTime);
                const end2 = new Date(slot2.endTime);
                // Check for time overlap
                if (start1 < end2 && start2 < end1) {
                    const conflict = {
                        id: `conflict-${Date.now()}-${i}-${j}`,
                        assetIds: [assetId],
                        taskIds: [slot1.taskId, slot2.taskId].filter((t) => t !== undefined),
                        conflictType: 'TIME_OVERLAP',
                        severity: 'HIGH',
                        resolution: '',
                        resolvedBy: '',
                        resolvedAt: '',
                        status: 'IDENTIFIED'
                    };
                    conflicts.push(conflict);
                    this.deconflictions.set(conflict.id, conflict);
                }
            }
        }
        return conflicts;
    }
    /**
     * Optimize collection coverage
     */
    optimizeCoverage(tasks) {
        const assignments = new Map();
        const unassigned = [];
        // Simple greedy assignment algorithm
        for (const task of tasks) {
            const availableAssets = this.getAvailableAssets({
                startTime: task.parameters.startTime,
                endTime: task.parameters.endTime,
                location: task.target.coordinates
            });
            if (availableAssets.length > 0) {
                // Assign to first available asset
                const asset = availableAssets[0];
                const assigned = assignments.get(asset.id) || [];
                assigned.push(task.id);
                assignments.set(asset.id, assigned);
            }
            else {
                unassigned.push(task.id);
            }
        }
        const coverage = ((tasks.length - unassigned.length) / tasks.length) * 100;
        return { assignments, coverage, unassigned };
    }
    /**
     * Generate performance report for asset
     */
    generatePerformanceReport(assetId, startDate, endDate) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            throw new Error(`Asset ${assetId} not found`);
        }
        // Get tasks for this asset in the period
        const assetTasks = Array.from(this.tasks.values()).filter(t => t.assetId === assetId &&
            t.execution.actualStart &&
            new Date(t.execution.actualStart) >= new Date(startDate) &&
            new Date(t.execution.actualStart) <= new Date(endDate));
        const completed = assetTasks.filter(t => t.status === 'COMPLETED');
        const failed = assetTasks.filter(t => t.status === 'FAILED');
        const totalData = completed.reduce((sum, t) => sum + (t.execution.dataCollected || 0), 0);
        const avgQuality = completed.length > 0
            ? completed.reduce((sum, t) => sum + (t.execution.qualityScore || 0), 0) / completed.length
            : 0;
        const performance = {
            assetId,
            period: { start: startDate, end: endDate },
            metrics: {
                availability: asset.operational.availability,
                reliability: completed.length / Math.max(assetTasks.length, 1) * 100,
                tasksCompleted: completed.length,
                tasksFailed: failed.length,
                dataCollected: totalData / 1024, // Convert to GB
                averageQuality: avgQuality,
                responseTime: 0, // Would calculate from task data
                downtime: 0 // Would calculate from operational logs
            },
            issues: [],
            recommendations: [],
            generatedAt: new Date().toISOString()
        };
        return exports.AssetPerformanceSchema.parse(performance);
    }
}
exports.CollectionCoordinator = CollectionCoordinator;
