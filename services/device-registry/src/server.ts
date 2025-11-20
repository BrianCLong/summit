/**
 * Device Registry Service
 * Microservice for device registration and management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config } from 'dotenv';
import { DeviceRegistry } from '@intelgraph/device-management';
import { DeviceAuthManager } from '@intelgraph/iot-platform';

config();

const logger = pino({ name: 'device-registry' });
const app = express();
const port = process.env.DEVICE_REGISTRY_PORT || 8081;

// Initialize components
const deviceRegistry = new DeviceRegistry();
const authManager = new DeviceAuthManager(process.env.JWT_SECRET);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.post('/api/registry/devices', async (req, res) => {
  try {
    const device = await deviceRegistry.registerDevice(req.body);
    res.status(201).json(device);
  } catch (error: any) {
    logger.error({ error }, 'Device registration failed');
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/registry/devices', async (req, res) => {
  const devices = deviceRegistry.listDevices();
  res.json({ devices, total: devices.length });
});

app.get('/api/registry/devices/:deviceId', async (req, res) => {
  const device = deviceRegistry.getDevice(req.params.deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

app.put('/api/registry/devices/:deviceId/state', async (req, res) => {
  try {
    const { state } = req.body;
    const device = await deviceRegistry.updateDeviceState(req.params.deviceId, state);
    res.json(device);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/registry/groups', async (req, res) => {
  try {
    const { name, description, deviceIds } = req.body;
    const group = await deviceRegistry.createGroup(name, description, deviceIds);
    res.status(201).json(group);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/registry/groups', async (req, res) => {
  const groups = deviceRegistry.listGroups();
  res.json({ groups, total: groups.length });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'device-registry',
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ error: err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  logger.info({ port }, 'Device Registry service started');
});
