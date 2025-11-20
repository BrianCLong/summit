/**
 * OTA (Over-The-Air) Update Manager
 * Manages firmware updates for IoT devices
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { createHash } from 'crypto';
import { DeviceRegistry } from '../lifecycle/device-registry.js';
import {
  FirmwareUpdate,
  DeviceUpdateStatus,
  DeviceLifecycleState,
  DeviceType,
} from '../types.js';

const logger = pino({ name: 'ota-manager' });

export class OTAUpdateManager extends EventEmitter {
  private updates = new Map<string, FirmwareUpdate>();
  private updateStatuses = new Map<string, DeviceUpdateStatus[]>();

  constructor(private deviceRegistry: DeviceRegistry) {
    super();
  }

  /**
   * Register a new firmware update
   */
  async registerFirmwareUpdate(update: Omit<FirmwareUpdate, 'id'>): Promise<FirmwareUpdate> {
    const firmwareUpdate: FirmwareUpdate = {
      id: uuidv4(),
      ...update,
    };

    this.updates.set(firmwareUpdate.id, firmwareUpdate);

    logger.info(
      {
        updateId: firmwareUpdate.id,
        version: firmwareUpdate.version,
        deviceType: firmwareUpdate.deviceType,
      },
      'Firmware update registered'
    );

    this.emit('firmware:registered', firmwareUpdate);

    return firmwareUpdate;
  }

  /**
   * Get available updates for a device
   */
  getAvailableUpdates(
    deviceId: string,
    currentVersion?: string
  ): FirmwareUpdate[] {
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const availableUpdates = Array.from(this.updates.values()).filter((update) => {
      // Match device type
      if (update.deviceType !== device.type) {
        return false;
      }

      // Match device model if specified
      if (update.deviceModels && update.deviceModels.length > 0) {
        if (!device.model || !update.deviceModels.includes(device.model)) {
          return false;
        }
      }

      // Check if update is newer than current version
      const deviceVersion = currentVersion ?? device.firmwareVersion;
      if (deviceVersion && this.compareVersions(update.version, deviceVersion) <= 0) {
        return false;
      }

      return true;
    });

    return availableUpdates.sort((a, b) =>
      this.compareVersions(b.version, a.version)
    );
  }

  /**
   * Schedule update for device
   */
  async scheduleUpdate(deviceId: string, updateId: string): Promise<DeviceUpdateStatus> {
    const device = this.deviceRegistry.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const update = this.updates.get(updateId);
    if (!update) {
      throw new Error(`Firmware update ${updateId} not found`);
    }

    // Check prerequisites
    if (update.prerequisites && update.prerequisites.length > 0) {
      const currentVersion = device.firmwareVersion;
      if (!currentVersion || !update.prerequisites.includes(currentVersion)) {
        throw new Error(
          `Device does not meet prerequisites. Current: ${currentVersion}, Required: ${update.prerequisites.join(', ')}`
        );
      }
    }

    const status: DeviceUpdateStatus = {
      deviceId,
      updateId,
      status: 'pending',
      progress: 0,
      currentVersion: device.firmwareVersion,
      targetVersion: update.version,
    };

    if (!this.updateStatuses.has(deviceId)) {
      this.updateStatuses.set(deviceId, []);
    }
    this.updateStatuses.get(deviceId)!.push(status);

    // Update device state
    await this.deviceRegistry.updateDeviceState(deviceId, DeviceLifecycleState.UPDATING);

    logger.info(
      {
        deviceId,
        updateId,
        currentVersion: status.currentVersion,
        targetVersion: status.targetVersion,
      },
      'Update scheduled for device'
    );

    this.emit('update:scheduled', { device, update, status });

    return status;
  }

  /**
   * Schedule updates for device group
   */
  async scheduleGroupUpdate(
    groupId: string,
    updateId: string,
    rolloutPercentage = 100
  ): Promise<DeviceUpdateStatus[]> {
    const group = this.deviceRegistry.listGroups().find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const update = this.updates.get(updateId);
    if (!update) {
      throw new Error(`Firmware update ${updateId} not found`);
    }

    // Calculate devices to update based on rollout percentage
    const deviceCount = Math.ceil((group.deviceIds.length * rolloutPercentage) / 100);
    const devicesToUpdate = group.deviceIds.slice(0, deviceCount);

    logger.info(
      {
        groupId,
        updateId,
        totalDevices: group.deviceIds.length,
        devicesToUpdate: deviceCount,
        rolloutPercentage,
      },
      'Starting group update rollout'
    );

    const statuses: DeviceUpdateStatus[] = [];

    for (const deviceId of devicesToUpdate) {
      try {
        const status = await this.scheduleUpdate(deviceId, updateId);
        statuses.push(status);
      } catch (error) {
        logger.error({ error, deviceId, updateId }, 'Failed to schedule update for device');
      }
    }

    return statuses;
  }

  /**
   * Update device update status
   */
  async updateStatus(
    deviceId: string,
    updateId: string,
    status: Partial<DeviceUpdateStatus>
  ): Promise<DeviceUpdateStatus> {
    const deviceStatuses = this.updateStatuses.get(deviceId);
    if (!deviceStatuses) {
      throw new Error(`No updates found for device ${deviceId}`);
    }

    const updateStatus = deviceStatuses.find((s) => s.updateId === updateId);
    if (!updateStatus) {
      throw new Error(`Update ${updateId} not found for device ${deviceId}`);
    }

    Object.assign(updateStatus, status);

    // Handle completion
    if (status.status === 'completed') {
      updateStatus.completedAt = new Date();

      const update = this.updates.get(updateId);
      if (update) {
        const device = this.deviceRegistry.getDevice(deviceId);
        if (device) {
          device.firmwareVersion = update.version;
        }
      }

      await this.deviceRegistry.updateDeviceState(deviceId, DeviceLifecycleState.ACTIVE);

      logger.info(
        {
          deviceId,
          updateId,
          version: updateStatus.targetVersion,
        },
        'Device update completed successfully'
      );

      this.emit('update:completed', updateStatus);
    }

    // Handle failure
    if (status.status === 'failed') {
      await this.deviceRegistry.updateDeviceState(deviceId, DeviceLifecycleState.ACTIVE);

      logger.error(
        {
          deviceId,
          updateId,
          error: status.error,
        },
        'Device update failed'
      );

      this.emit('update:failed', updateStatus);
    }

    return updateStatus;
  }

  /**
   * Verify firmware checksum
   */
  verifyFirmware(firmwareData: Buffer, update: FirmwareUpdate): boolean {
    const hash = createHash(update.checksumAlgorithm);
    hash.update(firmwareData);
    const checksum = hash.digest('hex');

    const isValid = checksum === update.checksum;

    if (!isValid) {
      logger.warn(
        {
          updateId: update.id,
          expected: update.checksum,
          actual: checksum,
        },
        'Firmware checksum verification failed'
      );
    }

    return isValid;
  }

  /**
   * Get update status for device
   */
  getDeviceUpdateStatus(deviceId: string): DeviceUpdateStatus[] {
    return this.updateStatuses.get(deviceId) ?? [];
  }

  /**
   * Get current update for device
   */
  getCurrentUpdate(deviceId: string): DeviceUpdateStatus | undefined {
    const statuses = this.updateStatuses.get(deviceId);
    if (!statuses || statuses.length === 0) {
      return undefined;
    }

    return statuses.find(
      (s) => s.status === 'downloading' || s.status === 'installing' || s.status === 'pending'
    );
  }

  /**
   * Cancel pending update
   */
  async cancelUpdate(deviceId: string, updateId: string): Promise<void> {
    const status = await this.updateStatus(deviceId, updateId, {
      status: 'failed',
      error: 'Update cancelled by user',
    });

    logger.info({ deviceId, updateId }, 'Update cancelled');

    this.emit('update:cancelled', status);
  }

  /**
   * Get update statistics
   */
  getUpdateStatistics(updateId: string): {
    total: number;
    pending: number;
    downloading: number;
    installing: number;
    completed: number;
    failed: number;
  } {
    const stats = {
      total: 0,
      pending: 0,
      downloading: 0,
      installing: 0,
      completed: 0,
      failed: 0,
    };

    for (const statuses of this.updateStatuses.values()) {
      for (const status of statuses) {
        if (status.updateId === updateId) {
          stats.total++;
          switch (status.status) {
            case 'pending':
              stats.pending++;
              break;
            case 'downloading':
              stats.downloading++;
              break;
            case 'installing':
              stats.installing++;
              break;
            case 'completed':
              stats.completed++;
              break;
            case 'failed':
              stats.failed++;
              break;
          }
        }
      }
    }

    return stats;
  }

  /**
   * Compare version strings (simple implementation)
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }
}
