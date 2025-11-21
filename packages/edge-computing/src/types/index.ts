import { z } from 'zod';

/**
 * Edge node status enumeration
 */
export enum EdgeNodeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
  PROVISIONING = 'provisioning',
  DECOMMISSIONED = 'decommissioned'
}

/**
 * Edge node health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  WARNING = 'warning',
  UNKNOWN = 'unknown'
}

/**
 * Edge device types
 */
export enum EdgeDeviceType {
  GATEWAY = 'gateway',
  COMPUTE_NODE = 'compute_node',
  IOT_DEVICE = 'iot_device',
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  EDGE_SERVER = 'edge_server',
  JETSON = 'jetson',
  CORAL = 'coral',
  CUSTOM = 'custom'
}

/**
 * Resource capacity metrics
 */
export interface ResourceCapacity {
  cpu: {
    cores: number;
    frequency: number; // MHz
    utilization: number; // percentage
  };
  memory: {
    total: number; // bytes
    available: number; // bytes
    utilization: number; // percentage
  };
  storage: {
    total: number; // bytes
    available: number; // bytes
    utilization: number; // percentage
  };
  network: {
    bandwidth: number; // bps
    latency: number; // ms
    packetLoss: number; // percentage
  };
  gpu?: {
    model: string;
    memory: number; // bytes
    utilization: number; // percentage
  };
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  country?: string;
  region?: string;
  city?: string;
  datacenter?: string;
  zone?: string;
}

/**
 * Edge node metadata
 */
export interface EdgeNodeMetadata {
  id: string;
  name: string;
  type: EdgeDeviceType;
  status: EdgeNodeStatus;
  health: HealthStatus;
  version: string;
  location: GeoLocation;
  capacity: ResourceCapacity;
  tags: Record<string, string>;
  clusterId?: string;
  registeredAt: Date;
  lastHeartbeat: Date;
  uptime: number; // seconds
}

/**
 * Edge node configuration
 */
export interface EdgeNodeConfig {
  id: string;
  endpoints: {
    api: string;
    metrics: string;
    logs: string;
    sync: string;
  };
  authentication: {
    type: 'jwt' | 'mtls' | 'api-key';
    credentials: Record<string, string>;
  };
  features: {
    aiInference: boolean;
    federatedLearning: boolean;
    edgeAnalytics: boolean;
    offline: boolean;
  };
  limits: {
    maxConcurrentJobs: number;
    maxMemoryUsage: number;
    maxStorageUsage: number;
  };
  sync: {
    interval: number; // seconds
    priority: 'high' | 'medium' | 'low';
    bandwidth: number; // bps
  };
}

/**
 * Edge cluster metadata
 */
export interface EdgeCluster {
  id: string;
  name: string;
  region: string;
  nodes: string[]; // node IDs
  loadBalancer: {
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
    healthCheckInterval: number;
  };
  autoscaling: {
    enabled: boolean;
    minNodes: number;
    maxNodes: number;
    targetUtilization: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Edge deployment configuration
 */
export interface EdgeDeployment {
  id: string;
  name: string;
  version: string;
  image: string;
  runtime: 'docker' | 'k3s' | 'wasm' | 'native';
  resources: {
    cpuRequest: number;
    cpuLimit: number;
    memoryRequest: number;
    memoryLimit: number;
  };
  replicas: number;
  targetNodes: string[];
  environment: Record<string, string>;
  volumes?: Array<{
    name: string;
    mountPath: string;
    size: number;
  }>;
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Edge task definition
 */
export interface EdgeTask {
  id: string;
  type: 'inference' | 'training' | 'analytics' | 'sync' | 'custom';
  priority: 'critical' | 'high' | 'medium' | 'low';
  payload: unknown;
  targetNodes: string[];
  deadline?: Date;
  retryPolicy: {
    maxAttempts: number;
    backoff: 'exponential' | 'linear' | 'fixed';
    initialDelay: number;
  };
  createdAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: string;
}

/**
 * Edge metrics data point
 */
export interface EdgeMetric {
  nodeId: string;
  timestamp: Date;
  type: 'cpu' | 'memory' | 'storage' | 'network' | 'latency' | 'custom';
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

/**
 * Edge event
 */
export interface EdgeEvent {
  id: string;
  nodeId: string;
  type: 'node-online' | 'node-offline' | 'health-change' | 'deployment' | 'error' | 'custom';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string;
  nodeId: string;
  operation: 'upload' | 'download' | 'delete';
  resourceType: 'model' | 'data' | 'config' | 'logs';
  resourceId: string;
  priority: number;
  size: number; // bytes
  retries: number;
  status: 'queued' | 'syncing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Zod schemas for validation
 */
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  datacenter: z.string().optional(),
  zone: z.string().optional()
});

export const ResourceCapacitySchema = z.object({
  cpu: z.object({
    cores: z.number().int().positive(),
    frequency: z.number().positive(),
    utilization: z.number().min(0).max(100)
  }),
  memory: z.object({
    total: z.number().int().positive(),
    available: z.number().int().nonnegative(),
    utilization: z.number().min(0).max(100)
  }),
  storage: z.object({
    total: z.number().int().positive(),
    available: z.number().int().nonnegative(),
    utilization: z.number().min(0).max(100)
  }),
  network: z.object({
    bandwidth: z.number().nonnegative(),
    latency: z.number().nonnegative(),
    packetLoss: z.number().min(0).max(100)
  }),
  gpu: z.object({
    model: z.string(),
    memory: z.number().int().positive(),
    utilization: z.number().min(0).max(100)
  }).optional()
});

export const EdgeNodeMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.nativeEnum(EdgeDeviceType),
  status: z.nativeEnum(EdgeNodeStatus),
  health: z.nativeEnum(HealthStatus),
  version: z.string(),
  location: GeoLocationSchema,
  capacity: ResourceCapacitySchema,
  tags: z.record(z.string()),
  clusterId: z.string().uuid().optional(),
  registeredAt: z.date(),
  lastHeartbeat: z.date(),
  uptime: z.number().nonnegative()
});

export type EdgeNodeMetadataInput = z.infer<typeof EdgeNodeMetadataSchema>;
