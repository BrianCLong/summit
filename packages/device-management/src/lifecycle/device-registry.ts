/**
 * Device Registry
 * Manages device registration, lifecycle, and metadata
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  Device,
  DeviceLifecycleState,
  DeviceType,
  DeviceGroup,
  DeviceHealthMetrics,
} from '../types.js';

const logger = pino({ name: 'device-registry' });

export class DeviceRegistry extends EventEmitter {
  private devices = new Map<string, Device>();
  private groups = new Map<string, DeviceGroup>();
  private healthMetrics = new Map<string, DeviceHealthMetrics>();

  /**
   * Register a new device
   */
  async registerDevice(device: Omit<Device, 'id' | 'registeredAt' | 'state'>): Promise<Device> {
    const newDevice: Device = {
      id: uuidv4(),
      ...device,
      state: DeviceLifecycleState.PROVISIONING,
      registeredAt: new Date(),
      tags: device.tags || [],
      groups: device.groups || [],
      metadata: device.metadata || {},
    };

    this.devices.set(newDevice.id, newDevice);

    logger.info(
      {
        deviceId: newDevice.id,
        name: newDevice.name,
        type: newDevice.type,
      },
      'Device registered'
    );

    this.emit('device:registered', newDevice);

    return newDevice;
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Update device state
   */
  async updateDeviceState(deviceId: string, state: DeviceLifecycleState): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const previousState = device.state;
    device.state = state;
    device.lastUpdatedAt = new Date();

    logger.info(
      {
        deviceId,
        previousState,
        newState: state,
      },
      'Device state updated'
    );

    this.emit('device:state-changed', {
      device,
      previousState,
      newState: state,
    });

    return device;
  }

  /**
   * Update device configuration
   */
  async updateDeviceConfiguration(
    deviceId: string,
    configuration: Record<string, any>
  ): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    device.configuration = { ...device.configuration, ...configuration };
    device.lastUpdatedAt = new Date();

    logger.info({ deviceId, configuration }, 'Device configuration updated');

    this.emit('device:configuration-updated', { device, configuration });

    return device;
  }

  /**
   * Update device location
   */
  async updateDeviceLocation(
    deviceId: string,
    location: { latitude: number; longitude: number; altitude?: number }
  ): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    device.location = location;
    device.lastUpdatedAt = new Date();

    logger.debug({ deviceId, location }, 'Device location updated');

    this.emit('device:location-updated', { device, location });

    return device;
  }

  /**
   * Update device last seen timestamp
   */
  updateLastSeen(deviceId: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.lastSeenAt = new Date();
    }
  }

  /**
   * Add tags to device
   */
  async addDeviceTags(deviceId: string, tags: string[]): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const newTags = tags.filter((tag) => !device.tags.includes(tag));
    device.tags.push(...newTags);
    device.lastUpdatedAt = new Date();

    logger.info({ deviceId, tags: newTags }, 'Tags added to device');

    return device;
  }

  /**
   * Remove tags from device
   */
  async removeDeviceTags(deviceId: string, tags: string[]): Promise<Device> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    device.tags = device.tags.filter((tag) => !tags.includes(tag));
    device.lastUpdatedAt = new Date();

    logger.info({ deviceId, removedTags: tags }, 'Tags removed from device');

    return device;
  }

  /**
   * Decommission device
   */
  async decommissionDevice(deviceId: string): Promise<Device> {
    const device = await this.updateDeviceState(deviceId, DeviceLifecycleState.DECOMMISSIONED);

    logger.info({ deviceId }, 'Device decommissioned');

    this.emit('device:decommissioned', device);

    return device;
  }

  /**
   * Create device group
   */
  async createGroup(
    name: string,
    description?: string,
    deviceIds: string[] = []
  ): Promise<DeviceGroup> {
    const group: DeviceGroup = {
      id: uuidv4(),
      name,
      description,
      deviceIds,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.groups.set(group.id, group);

    // Add devices to group
    for (const deviceId of deviceIds) {
      const device = this.devices.get(deviceId);
      if (device && !device.groups.includes(group.id)) {
        device.groups.push(group.id);
      }
    }

    logger.info({ groupId: group.id, name, deviceCount: deviceIds.length }, 'Device group created');

    return group;
  }

  /**
   * Add devices to group
   */
  async addDevicesToGroup(groupId: string, deviceIds: string[]): Promise<DeviceGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    for (const deviceId of deviceIds) {
      if (!group.deviceIds.includes(deviceId)) {
        group.deviceIds.push(deviceId);

        const device = this.devices.get(deviceId);
        if (device && !device.groups.includes(groupId)) {
          device.groups.push(groupId);
        }
      }
    }

    group.updatedAt = new Date();

    logger.info({ groupId, addedDevices: deviceIds.length }, 'Devices added to group');

    return group;
  }

  /**
   * Query devices by criteria
   */
  queryDevices(criteria: {
    type?: DeviceType;
    state?: DeviceLifecycleState;
    tags?: string[];
    groups?: string[];
  }): Device[] {
    let results = Array.from(this.devices.values());

    if (criteria.type) {
      results = results.filter((d) => d.type === criteria.type);
    }

    if (criteria.state) {
      results = results.filter((d) => d.state === criteria.state);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter((d) => criteria.tags!.some((tag) => d.tags.includes(tag)));
    }

    if (criteria.groups && criteria.groups.length > 0) {
      results = results.filter((d) => criteria.groups!.some((group) => d.groups.includes(group)));
    }

    return results;
  }

  /**
   * Record device health metrics
   */
  recordHealthMetrics(metrics: DeviceHealthMetrics): void {
    this.healthMetrics.set(metrics.deviceId, metrics);
    this.updateLastSeen(metrics.deviceId);

    // Emit event for monitoring/alerting
    if (metrics.errorCount > 0 || (metrics.batteryLevel && metrics.batteryLevel < 20)) {
      this.emit('device:health-warning', metrics);
    }
  }

  /**
   * Get device health metrics
   */
  getHealthMetrics(deviceId: string): DeviceHealthMetrics | undefined {
    return this.healthMetrics.get(deviceId);
  }

  /**
   * List all devices
   */
  listDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * List all groups
   */
  listGroups(): DeviceGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get device count
   */
  getDeviceCount(): number {
    return this.devices.size;
  }

  /**
   * Get devices by state
   */
  getDevicesByState(state: DeviceLifecycleState): Device[] {
    return Array.from(this.devices.values()).filter((d) => d.state === state);
  }
}
