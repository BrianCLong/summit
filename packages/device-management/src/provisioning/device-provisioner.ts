/**
 * Device Provisioner
 * Handles device provisioning, credential generation, and onboarding
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { DeviceAuthManager } from '@intelgraph/iot-platform';
import { DeviceRegistry } from '../lifecycle/device-registry.js';
import {
  DeviceProvisioningRequest,
  DeviceProvisioningResponse,
  DeviceLifecycleState,
} from '../types.js';

const logger = pino({ name: 'device-provisioner' });

export interface ProvisioningConfig {
  mqttEndpoint?: string;
  httpsEndpoint?: string;
  websocketEndpoint?: string;
  tokenExpiresIn?: string;
}

export class DeviceProvisioner {
  constructor(
    private registry: DeviceRegistry,
    private authManager: DeviceAuthManager,
    private config: ProvisioningConfig = {}
  ) {}

  /**
   * Provision a new device
   */
  async provisionDevice(request: DeviceProvisioningRequest): Promise<DeviceProvisioningResponse> {
    logger.info(
      {
        name: request.name,
        type: request.type,
        serialNumber: request.serialNumber,
      },
      'Starting device provisioning'
    );

    // Generate device ID if not provided
    const deviceId = request.deviceId ?? uuidv4();

    // Register device in registry
    const device = await this.registry.registerDevice({
      name: request.name,
      type: request.type,
      manufacturer: request.manufacturer,
      model: request.model,
      serialNumber: request.serialNumber,
      tags: [],
      groups: [],
      metadata: request.metadata ?? {},
    });

    // Generate credentials
    const apiKey = this.authManager.generateApiKey();
    const clientId = `client-${deviceId}`;

    // Register device with auth manager
    await this.authManager.registerDevice(
      deviceId,
      {
        deviceId,
        clientId,
        apiKey,
        publicKey: request.publicKey,
      },
      request.metadata
    );

    // Generate JWT token
    const token = await this.authManager.generateDeviceToken(
      deviceId,
      ['telemetry:publish', 'telemetry:subscribe', 'config:read'],
      this.config.tokenExpiresIn ?? '30d'
    );

    // Update device state to active
    await this.registry.updateDeviceState(device.id, DeviceLifecycleState.ACTIVE);

    const response: DeviceProvisioningResponse = {
      device,
      credentials: {
        clientId,
        apiKey,
        token,
      },
      endpoints: {
        mqtt: this.config.mqttEndpoint,
        https: this.config.httpsEndpoint,
        websocket: this.config.websocketEndpoint,
      },
    };

    logger.info(
      {
        deviceId,
        name: request.name,
      },
      'Device provisioned successfully'
    );

    return response;
  }

  /**
   * Provision device with certificate
   */
  async provisionDeviceWithCertificate(
    request: DeviceProvisioningRequest & { certificate: string; privateKey: string }
  ): Promise<DeviceProvisioningResponse> {
    logger.info(
      {
        name: request.name,
        type: request.type,
      },
      'Starting certificate-based device provisioning'
    );

    const deviceId = request.deviceId ?? uuidv4();

    // Register device
    const device = await this.registry.registerDevice({
      name: request.name,
      type: request.type,
      manufacturer: request.manufacturer,
      model: request.model,
      serialNumber: request.serialNumber,
      tags: [],
      groups: [],
      metadata: request.metadata ?? {},
    });

    const clientId = `client-${deviceId}`;

    // Register with certificate
    await this.authManager.registerDevice(
      deviceId,
      {
        deviceId,
        clientId,
        certificate: request.certificate,
        privateKey: request.privateKey,
      },
      request.metadata
    );

    // Generate token
    const token = await this.authManager.generateDeviceToken(
      deviceId,
      ['telemetry:publish', 'telemetry:subscribe', 'config:read'],
      this.config.tokenExpiresIn ?? '30d'
    );

    // Activate device
    await this.registry.updateDeviceState(device.id, DeviceLifecycleState.ACTIVE);

    const response: DeviceProvisioningResponse = {
      device,
      credentials: {
        clientId,
        certificate: request.certificate,
        privateKey: request.privateKey,
        token,
      },
      endpoints: {
        mqtt: this.config.mqttEndpoint,
        https: this.config.httpsEndpoint,
        websocket: this.config.websocketEndpoint,
      },
    };

    logger.info(
      {
        deviceId,
        name: request.name,
      },
      'Device provisioned with certificate successfully'
    );

    return response;
  }

  /**
   * Deprovision device
   */
  async deprovisionDevice(deviceId: string): Promise<void> {
    logger.info({ deviceId }, 'Deprovisioning device');

    // Decommission in registry
    await this.registry.decommissionDevice(deviceId);

    // Revoke credentials
    this.authManager.revokeDevice(deviceId);

    logger.info({ deviceId }, 'Device deprovisioned successfully');
  }

  /**
   * Refresh device credentials
   */
  async refreshCredentials(deviceId: string): Promise<{ token: string; apiKey: string }> {
    logger.info({ deviceId }, 'Refreshing device credentials');

    if (!this.authManager.isDeviceRegistered(deviceId)) {
      throw new Error(`Device ${deviceId} not registered`);
    }

    // Generate new API key
    const apiKey = this.authManager.generateApiKey();

    // Generate new token
    const token = await this.authManager.generateDeviceToken(
      deviceId,
      ['telemetry:publish', 'telemetry:subscribe', 'config:read'],
      this.config.tokenExpiresIn ?? '30d'
    );

    logger.info({ deviceId }, 'Device credentials refreshed');

    return { token, apiKey };
  }

  /**
   * Bulk provision devices
   */
  async bulkProvision(
    requests: DeviceProvisioningRequest[]
  ): Promise<DeviceProvisioningResponse[]> {
    logger.info({ count: requests.length }, 'Starting bulk device provisioning');

    const responses: DeviceProvisioningResponse[] = [];

    for (const request of requests) {
      try {
        const response = await this.provisionDevice(request);
        responses.push(response);
      } catch (error) {
        logger.error({ error, request }, 'Failed to provision device in bulk operation');
      }
    }

    logger.info(
      {
        requested: requests.length,
        provisioned: responses.length,
        failed: requests.length - responses.length,
      },
      'Bulk provisioning completed'
    );

    return responses;
  }
}
