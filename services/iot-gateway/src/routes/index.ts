/**
 * IoT Gateway Routes
 */

import { Express, Request, Response } from 'express';
import { IoTGatewayApp } from '../app.js';

export function setupRoutes(app: Express, gateway: IoTGatewayApp) {
  // Device provisioning
  app.post('/api/devices/provision', async (req: Request, res: Response) => {
    try {
      const response = await gateway.deviceProvisioner.provisionDevice(req.body);
      res.status(201).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // List devices
  app.get('/api/devices', async (req: Request, res: Response) => {
    const devices = gateway.deviceRegistry.listDevices();
    res.json({ devices, total: devices.length });
  });

  // Get device details
  app.get('/api/devices/:deviceId', async (req: Request, res: Response) => {
    const device = gateway.deviceRegistry.getDevice(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  });

  // Ingest sensor data
  app.post('/api/telemetry', async (req: Request, res: Response) => {
    try {
      const { deviceId, sensorId, sensorType, value, unit, timestamp } = req.body;

      const reading = {
        id: `${Date.now()}-${Math.random()}`,
        deviceId,
        sensorId,
        sensorType,
        value,
        unit,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      };

      await gateway.ingestionPipeline.ingest(reading);

      res.status(202).json({ status: 'accepted', readingId: reading.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get device health metrics
  app.get('/api/devices/:deviceId/health', async (req: Request, res: Response) => {
    const metrics = gateway.deviceRegistry.getHealthMetrics(req.params.deviceId);
    if (!metrics) {
      return res.status(404).json({ error: 'No health metrics found' });
    }
    res.json(metrics);
  });

  // Get analytics statistics
  app.get('/api/analytics/stats', async (req: Request, res: Response) => {
    const stats = {
      ingestion: gateway.ingestionPipeline.getStats(),
      streams: gateway.streamManager.getStreamStats(),
      devices: {
        total: gateway.deviceRegistry.getDeviceCount(),
        byState: {
          active: gateway.deviceRegistry.getDevicesByState('active').length,
          inactive: gateway.deviceRegistry.getDevicesByState('inactive').length,
        },
      },
    };
    res.json(stats);
  });

  // Get anomaly alerts
  app.get('/api/analytics/anomalies', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const alerts = gateway.anomalyDetector.getRecentAlerts(limit);
    res.json({ alerts, total: alerts.length });
  });

  // Schedule OTA update
  app.post('/api/devices/:deviceId/update', async (req: Request, res: Response) => {
    try {
      const { updateId } = req.body;
      const status = await gateway.otaManager.scheduleUpdate(req.params.deviceId, updateId);
      res.status(202).json(status);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get device predictions
  app.get('/api/devices/:deviceId/predictions', async (req: Request, res: Response) => {
    const predictions = gateway.maintenancePredictor.getDevicePredictions(req.params.deviceId);
    res.json({ predictions, total: predictions.length });
  });
}
