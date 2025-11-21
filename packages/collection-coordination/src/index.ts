/**
 * Collection Asset Coordination
 *
 * Comprehensive collection asset management, tasking, scheduling, and
 * coordination for multi-platform intelligence collection operations.
 */

import { z } from 'zod';

// ============================================================================
// Asset Types
// ============================================================================

export const AssetTypeSchema = z.enum([
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

export const AssetStatusSchema = z.enum([
  'AVAILABLE',
  'TASKED',
  'IN_OPERATION',
  'MAINTENANCE',
  'OFFLINE',
  'DEGRADED',
  'LOST'
]);

export const PlatformTypeSchema = z.enum([
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

export const CollectionAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AssetTypeSchema,
  platform: PlatformTypeSchema,
  status: AssetStatusSchema,

  // Capabilities
  capabilities: z.object({
    sensors: z.array(z.object({
      id: z.string(),
      type: z.enum([
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
      resolution: z.string().optional(),
      range: z.number().optional(), // km
      fieldOfView: z.number().optional(), // degrees
      status: z.enum(['OPERATIONAL', 'DEGRADED', 'OFFLINE'])
    })),
    coverage: z.object({
      type: z.enum(['POINT', 'AREA', 'ROUTE', 'GLOBAL']),
      maxArea: z.number().optional(), // sq km
      revisitRate: z.number().optional(), // hours
      persistence: z.boolean()
    }),
    communications: z.object({
      dataRate: z.number(), // Mbps
      latency: z.number(), // ms
      reliability: z.number() // 0-100
    })
  }),

  // Positioning and mobility
  position: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    altitude: z.number().optional(), // meters
    heading: z.number().optional(), // degrees
    speed: z.number().optional(), // km/h
    lastUpdate: z.string()
  }),

  // Operational parameters
  operational: z.object({
    availability: z.number(), // percentage
    utilizationRate: z.number(), // percentage
    lastMaintenance: z.string(),
    nextMaintenance: z.string(),
    operatingHours: z.number(),
    maxOperatingHours: z.number().optional(),
    fuel: z.number().optional(), // percentage
    battery: z.number().optional() // percentage
  }),

  // Security and access
  security: z.object({
    classification: z.enum([
      'UNCLASSIFIED',
      'CONFIDENTIAL',
      'SECRET',
      'TOP_SECRET',
      'TOP_SECRET_SCI'
    ]),
    caveats: z.array(z.string()),
    authorizedUsers: z.array(z.string()),
    foreignDisclosure: z.boolean()
  }),

  // Assignment and tasking
  assignment: z.object({
    currentMission: z.string().optional(),
    assignedTo: z.string().optional(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    availableFrom: z.string().optional(),
    reservedUntil: z.string().optional()
  }),

  metadata: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

// ============================================================================
// Collection Tasking
// ============================================================================

export const CollectionTaskSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  assetId: z.string(),
  priority: z.enum(['IMMEDIATE', 'PRIORITY', 'ROUTINE']),
  status: z.enum([
    'PENDING',
    'APPROVED',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
  ]),

  // Task details
  taskType: z.enum([
    'AREA_SEARCH',
    'POINT_TARGET',
    'ROUTE_SURVEILLANCE',
    'PERSISTENT_MONITORING',
    'SIGNAL_COLLECTION',
    'COMMUNICATIONS_INTERCEPT',
    'PATTERN_ANALYSIS'
  ]),

  // Target specification
  target: z.object({
    type: z.enum(['LOCATION', 'ENTITY', 'SIGNAL', 'PATTERN']),
    coordinates: z.object({
      lat: z.number(),
      lon: z.number(),
      radius: z.number().optional()
    }).optional(),
    entityId: z.string().optional(),
    frequency: z.object({
      min: z.number(),
      max: z.number(),
      unit: z.string()
    }).optional(),
    description: z.string()
  }),

  // Collection parameters
  parameters: z.object({
    startTime: z.string(),
    endTime: z.string(),
    duration: z.number().optional(), // minutes
    revisitInterval: z.number().optional(), // minutes
    resolution: z.string().optional(),
    sensorMode: z.string().optional(),
    collectionAngle: z.number().optional(), // degrees
    cloudCover: z.number().optional(), // max percentage
    illumination: z.enum(['DAY', 'NIGHT', 'TWILIGHT', 'ANY']).optional()
  }),

  // Requirements
  requirements: z.object({
    minimumQuality: z.number(), // 0-100
    timeliness: z.enum(['REAL_TIME', 'NEAR_REAL_TIME', 'ROUTINE']),
    deliveryFormat: z.array(z.string()),
    processingLevel: z.enum(['RAW', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3']),
    disseminationList: z.array(z.string())
  }),

  // Execution
  execution: z.object({
    scheduledStart: z.string().optional(),
    actualStart: z.string().optional(),
    actualEnd: z.string().optional(),
    dataCollected: z.number().optional(), // MB
    qualityScore: z.number().optional(), // 0-100
    issues: z.array(z.string())
  }),

  // Coordination
  coordination: z.object({
    deconflictedWith: z.array(z.string()),
    relatedTasks: z.array(z.string()),
    dependencies: z.array(z.string())
  }),

  requestedBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Scheduling
// ============================================================================

export const ScheduleSlotSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  taskId: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum([
    'COLLECTION',
    'MAINTENANCE',
    'TRANSIT',
    'CALIBRATION',
    'RESERVED',
    'BLOCKED'
  ]),
  priority: z.number(),
  conflictsWith: z.array(z.string()),
  metadata: z.record(z.unknown())
});

export const DeconflictionRecordSchema = z.object({
  id: z.string(),
  assetIds: z.array(z.string()),
  taskIds: z.array(z.string()),
  conflictType: z.enum([
    'TIME_OVERLAP',
    'FREQUENCY_INTERFERENCE',
    'SPATIAL_CONFLICT',
    'RESOURCE_CONTENTION',
    'POLICY_VIOLATION'
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  resolution: z.string(),
  resolvedBy: z.string(),
  resolvedAt: z.string(),
  status: z.enum(['IDENTIFIED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'])
});

// ============================================================================
// Performance Monitoring
// ============================================================================

export const AssetPerformanceSchema = z.object({
  assetId: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string()
  }),

  metrics: z.object({
    availability: z.number(), // percentage
    reliability: z.number(), // percentage
    tasksCompleted: z.number(),
    tasksFailed: z.number(),
    dataCollected: z.number(), // GB
    averageQuality: z.number(), // 0-100
    responseTime: z.number(), // average minutes from task to execution
    downtime: z.number() // hours
  }),

  issues: z.array(z.object({
    timestamp: z.string(),
    type: z.enum([
      'SENSOR_FAILURE',
      'COMMUNICATION_LOSS',
      'POSITIONING_ERROR',
      'DATA_CORRUPTION',
      'POWER_ISSUE',
      'ENVIRONMENTAL'
    ]),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    resolved: z.boolean()
  })),

  recommendations: z.array(z.string()),
  generatedAt: z.string()
});

// ============================================================================
// Type Exports
// ============================================================================

export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type PlatformType = z.infer<typeof PlatformTypeSchema>;
export type CollectionAsset = z.infer<typeof CollectionAssetSchema>;
export type CollectionTask = z.infer<typeof CollectionTaskSchema>;
export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;
export type DeconflictionRecord = z.infer<typeof DeconflictionRecordSchema>;
export type AssetPerformance = z.infer<typeof AssetPerformanceSchema>;

// ============================================================================
// Collection Coordination Service
// ============================================================================

export class CollectionCoordinator {
  private assets: Map<string, CollectionAsset> = new Map();
  private tasks: Map<string, CollectionTask> = new Map();
  private schedules: Map<string, ScheduleSlot[]> = new Map();
  private deconflictions: Map<string, DeconflictionRecord> = new Map();

  /**
   * Register a collection asset
   */
  registerAsset(asset: CollectionAsset): CollectionAsset {
    const validated = CollectionAssetSchema.parse(asset);
    this.assets.set(validated.id, validated);
    this.schedules.set(validated.id, []);
    return validated;
  }

  /**
   * Get available assets for a task
   */
  getAvailableAssets(options: {
    type?: AssetType;
    startTime: string;
    endTime: string;
    location?: { lat: number; lon: number; radius: number };
    capabilities?: string[];
  }): CollectionAsset[] {
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
        const hasRequiredCapabilities = options.capabilities.every(cap =>
          assetCapabilities.includes(cap as any)
        );
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
  createTask(task: CollectionTask): CollectionTask {
    const validated = CollectionTaskSchema.parse(task);
    this.tasks.set(validated.id, validated);
    return validated;
  }

  /**
   * Schedule a task on an asset
   */
  scheduleTask(taskId: string, assetId: string): ScheduleSlot {
    const task = this.tasks.get(taskId);
    const asset = this.assets.get(assetId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Create schedule slot
    const slot: ScheduleSlot = {
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

    const validated = ScheduleSlotSchema.parse(slot);

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
  detectConflicts(assetId: string): DeconflictionRecord[] {
    const schedule = this.schedules.get(assetId) || [];
    const conflicts: DeconflictionRecord[] = [];

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
          const conflict: DeconflictionRecord = {
            id: `conflict-${Date.now()}-${i}-${j}`,
            assetIds: [assetId],
            taskIds: [slot1.taskId, slot2.taskId].filter((t): t is string => t !== undefined),
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
  optimizeCoverage(tasks: CollectionTask[]): {
    assignments: Map<string, string[]>; // assetId -> taskIds
    coverage: number; // percentage
    unassigned: string[];
  } {
    const assignments = new Map<string, string[]>();
    const unassigned: string[] = [];

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
      } else {
        unassigned.push(task.id);
      }
    }

    const coverage = ((tasks.length - unassigned.length) / tasks.length) * 100;

    return { assignments, coverage, unassigned };
  }

  /**
   * Generate performance report for asset
   */
  generatePerformanceReport(
    assetId: string,
    startDate: string,
    endDate: string
  ): AssetPerformance {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Get tasks for this asset in the period
    const assetTasks = Array.from(this.tasks.values()).filter(
      t => t.assetId === assetId &&
        t.execution.actualStart &&
        new Date(t.execution.actualStart) >= new Date(startDate) &&
        new Date(t.execution.actualStart) <= new Date(endDate)
    );

    const completed = assetTasks.filter(t => t.status === 'COMPLETED');
    const failed = assetTasks.filter(t => t.status === 'FAILED');

    const totalData = completed.reduce((sum, t) => sum + (t.execution.dataCollected || 0), 0);
    const avgQuality = completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.execution.qualityScore || 0), 0) / completed.length
      : 0;

    const performance: AssetPerformance = {
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

    return AssetPerformanceSchema.parse(performance);
  }
}
