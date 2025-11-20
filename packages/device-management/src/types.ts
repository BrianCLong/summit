/**
 * Device Management Types
 */

export enum DeviceLifecycleState {
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DECOMMISSIONED = 'decommissioned',
  MAINTENANCE = 'maintenance',
  UPDATING = 'updating',
}

export enum DeviceType {
  SENSOR = 'sensor',
  GATEWAY = 'gateway',
  ACTUATOR = 'actuator',
  EDGE_DEVICE = 'edge-device',
  CONTROLLER = 'controller',
  CAMERA = 'camera',
  WEARABLE = 'wearable',
  INDUSTRIAL = 'industrial',
  VEHICLE = 'vehicle',
  APPLIANCE = 'appliance',
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  serialNumber?: string;
  state: DeviceLifecycleState;
  registeredAt: Date;
  lastSeenAt?: Date;
  lastUpdatedAt?: Date;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  tags: string[];
  groups: string[];
  metadata: Record<string, any>;
  configuration?: Record<string, any>;
  capabilities?: string[];
}

export interface DeviceProvisioningRequest {
  deviceId?: string;
  name: string;
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  certificateSigningRequest?: string;
  publicKey?: string;
  metadata?: Record<string, any>;
}

export interface DeviceProvisioningResponse {
  device: Device;
  credentials: {
    clientId: string;
    certificate?: string;
    privateKey?: string;
    apiKey?: string;
    token?: string;
  };
  endpoints: {
    mqtt?: string;
    https?: string;
    websocket?: string;
  };
}

export interface FirmwareUpdate {
  id: string;
  version: string;
  deviceType: DeviceType;
  deviceModels?: string[];
  firmwareUrl: string;
  checksum: string;
  checksumAlgorithm: 'sha256' | 'sha512';
  size: number;
  releasedAt: Date;
  releaseNotes?: string;
  isMandatory: boolean;
  rolloutPercentage?: number;
  prerequisites?: string[];
}

export interface DeviceUpdateStatus {
  deviceId: string;
  updateId: string;
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed' | 'rollback';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  currentVersion?: string;
  targetVersion?: string;
}

export interface DeviceHealthMetrics {
  deviceId: string;
  timestamp: Date;
  batteryLevel?: number;
  signalStrength?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  temperature?: number;
  uptime: number;
  errorCount: number;
  lastError?: string;
  connectivity: {
    protocol: string;
    connected: boolean;
    latency?: number;
  };
}

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceIds: string[];
  tags: string[];
  configuration?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
