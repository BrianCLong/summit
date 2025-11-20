# IoT and Sensor Data Integration Platform Guide

## Overview

The IntelGraph IoT Platform provides comprehensive device management, sensor data ingestion, edge computing, and real-time analytics for integrating physical sensor networks and IoT devices at enterprise scale.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Getting Started](#getting-started)
4. [Device Management](#device-management)
5. [Protocol Support](#protocol-support)
6. [Sensor Data Ingestion](#sensor-data-ingestion)
7. [Edge Computing](#edge-computing)
8. [Time-Series Storage](#time-series-storage)
9. [Analytics](#analytics)
10. [Industrial IoT](#industrial-iot)
11. [Security](#security)
12. [API Reference](#api-reference)

## Architecture

The IoT platform is built as a microservices architecture with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│                        IoT Devices                               │
│  (Sensors, Gateways, Edge Devices, Industrial Equipment)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────┐
    │   Protocol Adapters  │    │   Edge Computing     │
    │  MQTT, CoAP, HTTP,   │    │  Local Processing    │
    │  WebSocket, etc.     │    │  ML Inference        │
    └──────────────────────┘    └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │     IoT Gateway          │
                │  Data Routing & Auth     │
                └──────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────┐
│   Device     │    │  Data Ingestion  │    │ Analytics  │
│   Registry   │    │    Pipeline      │    │ & Alerts   │
└──────────────┘    └──────────────────┘    └────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  TimescaleDB     │
                    │  Time-Series DB  │
                    └──────────────────┘
```

## Core Components

### Packages

- **@intelgraph/iot-platform** - Core IoT platform with protocol adapters
- **@intelgraph/device-management** - Device lifecycle, provisioning, and OTA updates
- **@intelgraph/sensor-data** - Sensor data ingestion and streaming
- **@intelgraph/edge-computing** - Edge runtime and local processing
- **@intelgraph/time-series** - TimescaleDB integration for time-series storage
- **@intelgraph/iot-analytics** - Anomaly detection and predictive maintenance
- **@intelgraph/industrial-iot** - SCADA, PLC, and MES integration

### Services

- **iot-gateway** - Main IoT gateway service (port 8080)
- **device-registry** - Device registry microservice (port 8081)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build all IoT packages
pnpm --filter "@intelgraph/iot-*" build
pnpm --filter "@intelgraph/device-management" build
pnpm --filter "@intelgraph/sensor-data" build
pnpm --filter "@intelgraph/time-series" build
pnpm --filter "@intelgraph/edge-computing" build
```

### Configuration

Create a `.env` file for the IoT Gateway:

```env
# Server
IOT_GATEWAY_PORT=8080
NODE_ENV=production

# Security
JWT_SECRET=your-secret-key-here

# Endpoints
MQTT_ENDPOINT=mqtt://localhost:1883
HTTPS_ENDPOINT=https://iot.example.com
WS_ENDPOINT=wss://iot.example.com/ws

# TimescaleDB
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DB=iot
TIMESCALE_USER=postgres
TIMESCALE_PASSWORD=your-password
TIMESCALE_SSL=false

# Data Ingestion
BATCH_SIZE=100
BATCH_TIMEOUT=5000
```

### Starting Services

```bash
# Start IoT Gateway
cd services/iot-gateway
pnpm dev

# Start Device Registry (separate terminal)
cd services/device-registry
pnpm dev
```

## Device Management

### Device Provisioning

Provision a new device:

```typescript
import { DeviceProvisioner, DeviceType } from '@intelgraph/device-management';
import { DeviceAuthManager } from '@intelgraph/iot-platform';

const authManager = new DeviceAuthManager('secret-key');
const registry = new DeviceRegistry();
const provisioner = new DeviceProvisioner(registry, authManager, {
  mqttEndpoint: 'mqtt://localhost:1883',
  httpsEndpoint: 'https://iot.example.com',
  websocketEndpoint: 'wss://iot.example.com/ws',
});

const response = await provisioner.provisionDevice({
  name: 'Temperature Sensor 001',
  type: DeviceType.SENSOR,
  manufacturer: 'Acme Corp',
  model: 'TMP-100',
  serialNumber: 'SN123456',
});

console.log('Device ID:', response.device.id);
console.log('API Key:', response.credentials.apiKey);
console.log('Token:', response.credentials.token);
```

### Device Lifecycle

Manage device lifecycle states:

```typescript
import { DeviceLifecycleState } from '@intelgraph/device-management';

// Activate device
await registry.updateDeviceState(deviceId, DeviceLifecycleState.ACTIVE);

// Suspend device
await registry.updateDeviceState(deviceId, DeviceLifecycleState.SUSPENDED);

// Decommission device
await registry.decommissionDevice(deviceId);
```

### Over-the-Air (OTA) Updates

Manage firmware updates:

```typescript
import { OTAUpdateManager } from '@intelgraph/device-management';

const otaManager = new OTAUpdateManager(registry);

// Register firmware update
const update = await otaManager.registerFirmwareUpdate({
  version: '2.0.0',
  deviceType: DeviceType.SENSOR,
  firmwareUrl: 'https://cdn.example.com/firmware/v2.0.0.bin',
  checksum: 'sha256-hash-here',
  checksumAlgorithm: 'sha256',
  size: 1024000,
  releasedAt: new Date(),
  isMandatory: false,
  rolloutPercentage: 25, // Gradual rollout
});

// Schedule update for device
await otaManager.scheduleUpdate(deviceId, update.id);

// Monitor update status
const status = otaManager.getCurrentUpdate(deviceId);
console.log('Update progress:', status?.progress);
```

## Protocol Support

### MQTT

Connect device using MQTT:

```typescript
import { MQTTAdapter, IoTProtocol, QoSLevel } from '@intelgraph/iot-platform';

const adapter = new MQTTAdapter();

await adapter.connect({
  protocol: IoTProtocol.MQTT,
  host: 'localhost',
  port: 1883,
  secure: false,
  credentials: {
    deviceId: 'device-001',
    clientId: 'client-001',
    username: 'device',
    password: 'secret',
  },
  keepAlive: 60,
  clean: true,
});

// Subscribe to commands
await adapter.subscribe('devices/device-001/commands', QoSLevel.AT_LEAST_ONCE);

// Publish telemetry
await adapter.publish(
  'devices/device-001/telemetry',
  JSON.stringify({ temperature: 22.5, humidity: 65 }),
  QoSLevel.AT_LEAST_ONCE
);

// Handle messages
adapter.on('message', (message) => {
  console.log('Received:', message.topic, message.payload);
});
```

### WebSocket

Connect using WebSocket:

```typescript
import { WebSocketAdapter } from '@intelgraph/iot-platform';

const wsAdapter = new WebSocketAdapter();

await wsAdapter.connect({
  protocol: IoTProtocol.WEBSOCKET,
  host: 'iot.example.com',
  port: 443,
  secure: true,
  credentials: {
    deviceId: 'device-001',
    clientId: 'client-001',
    token: 'jwt-token-here',
  },
});
```

### HTTP/HTTPS

Use HTTP for request/response patterns:

```typescript
import { HTTPAdapter } from '@intelgraph/iot-platform';

const httpAdapter = new HTTPAdapter();

await httpAdapter.connect({
  protocol: IoTProtocol.HTTPS,
  host: 'iot.example.com',
  port: 443,
  secure: true,
  credentials: {
    deviceId: 'device-001',
    clientId: 'client-001',
    apiKey: 'api-key-here',
  },
});

// Publish data
await httpAdapter.publish('telemetry', JSON.stringify({ temp: 23.5 }));
```

## Sensor Data Ingestion

### High-Throughput Ingestion

Process sensor data at scale:

```typescript
import {
  DataIngestionPipeline,
  SensorType,
  RangeValidator,
  TimestampValidator,
} from '@intelgraph/sensor-data';

const pipeline = new DataIngestionPipeline({
  batchSize: 100,
  batchTimeout: 5000,
  compression: true,
  validation: true,
});

// Add validators
pipeline.addValidator(new RangeValidator(-40, 85)); // Temperature range
pipeline.addValidator(new TimestampValidator());

// Ingest reading
await pipeline.ingest({
  id: '12345',
  deviceId: 'device-001',
  sensorId: 'temp-001',
  sensorType: SensorType.TEMPERATURE,
  timestamp: new Date(),
  value: 22.5,
  unit: 'celsius',
  quality: 0.95,
});

// Handle batches
pipeline.on('batch:ready', async ({ dataPoints }) => {
  // Store in database
  await timeSeriesDB.write(dataPoints);
});

// Get statistics
const stats = pipeline.getStats();
console.log('Ingested:', stats.ingested, 'Invalid:', stats.invalid);
```

### Real-Time Streaming

Stream sensor data in real-time:

```typescript
import { SensorStreamManager } from '@intelgraph/sensor-data';

const streamManager = new SensorStreamManager();

// Register stream
streamManager.registerStream({
  deviceId: 'device-001',
  sensorId: 'temp-001',
  sensorType: SensorType.TEMPERATURE,
  samplingRate: 1, // 1 Hz
  active: true,
});

// Subscribe to stream
const unsubscribe = streamManager.subscribe('device-001', 'temp-001', (reading) => {
  console.log('Temperature:', reading.value, reading.unit);
});

// Publish to stream
streamManager.publishReading({
  id: '12345',
  deviceId: 'device-001',
  sensorId: 'temp-001',
  sensorType: SensorType.TEMPERATURE,
  timestamp: new Date(),
  value: 22.5,
});
```

## Edge Computing

### Edge Runtime

Run processing logic on edge devices:

```typescript
import { EdgeRuntime, EdgeRule } from '@intelgraph/edge-computing';

const runtime = new EdgeRuntime();

// Define edge rule
const rule: EdgeRule = {
  id: 'high-temp-alert',
  name: 'High Temperature Alert',
  enabled: true,
  condition: (reading) => {
    return typeof reading.value === 'number' && reading.value > 30;
  },
  action: async (reading) => {
    console.log('⚠️ High temperature detected:', reading.value);
    // Trigger local alarm, send alert, etc.
  },
};

runtime.addRule(rule);

// Process readings
await runtime.processReading({
  id: '12345',
  deviceId: 'device-001',
  sensorId: 'temp-001',
  sensorType: SensorType.TEMPERATURE,
  timestamp: new Date(),
  value: 35.2, // Will trigger rule
});

// Offline support
runtime.setOnlineStatus(false);
runtime.queueOffline(reading); // Queue for sync when online
```

## Time-Series Storage

### TimescaleDB Integration

Store and query time-series data:

```typescript
import { TimescaleDBAdapter } from '@intelgraph/time-series';

const db = new TimescaleDBAdapter({
  host: 'localhost',
  port: 5432,
  database: 'iot',
  user: 'postgres',
  password: 'password',
  ssl: false,
});

await db.initialize();

// Write data points
await db.write([
  {
    timestamp: new Date(),
    deviceId: 'device-001',
    sensorId: 'temp-001',
    fields: { value: 22.5, quality: 0.95 },
    tags: { sensorType: 'temperature', unit: 'celsius' },
  },
]);

// Query data
const results = await db.query({
  deviceId: 'device-001',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  endTime: new Date(),
  limit: 1000,
});

// Apply retention policy
await db.applyRetentionPolicy({
  tableName: 'sensor_data',
  retentionPeriod: '90 days',
  compressionAfter: '7 days',
});

// Create continuous aggregates for downsampling
await db.createContinuousAggregate(5); // 5-minute intervals
```

## Analytics

### Anomaly Detection

Detect anomalies in real-time:

```typescript
import { AnomalyDetector } from '@intelgraph/iot-analytics';

const detector = new AnomalyDetector();

// Configure thresholds
detector.setThreshold({
  deviceId: 'device-001',
  sensorId: 'temp-001',
  min: -10,
  max: 40,
  enabled: true,
});

// Analyze reading
const anomaly = await detector.analyze({
  id: '12345',
  deviceId: 'device-001',
  sensorId: 'temp-001',
  sensorType: SensorType.TEMPERATURE,
  timestamp: new Date(),
  value: 45.2, // Exceeds threshold
});

if (anomaly) {
  console.log('Anomaly detected:', anomaly.severity);
  console.log('Description:', anomaly.description);
  console.log('Confidence:', anomaly.confidence);
}

// Listen for alerts
detector.on('anomaly:detected', (alert) => {
  console.log('⚠️ Alert:', alert.severity, alert.description);
});
```

### Predictive Maintenance

Predict equipment failures:

```typescript
import { MaintenancePredictor } from '@intelgraph/iot-analytics';

const predictor = new MaintenancePredictor();

// Analyze device health
const health = await predictor.analyzeHealth(deviceId, recentReadings);

console.log('Health score:', health.score);
console.log('Trend:', health.trend);
console.log('Factors:', health.factors);

// Generate prediction
const prediction = await predictor.predict(deviceId, recentReadings);

if (prediction) {
  console.log('Prediction:', prediction.predictionType);
  console.log('Time to event:', prediction.estimatedTimeToEvent / (24 * 60 * 60 * 1000), 'days');
  console.log('Recommended actions:', prediction.recommendedActions);
}
```

## Industrial IoT

### SCADA Integration

Connect to SCADA systems:

```typescript
import { SCADAConnector } from '@intelgraph/industrial-iot';

const scada = new SCADAConnector();

// Register SCADA system
scada.registerSystem({
  id: 'scada-001',
  name: 'Factory SCADA',
  host: 'scada.factory.local',
  port: 502,
  protocol: 'modbus',
  connected: false,
});

// Connect
await scada.connect('scada-001');

// Register tags
scada.registerTag({
  id: 'pressure-001',
  name: 'Line 1 Pressure',
  type: 'analog',
  value: 0,
  quality: 'good',
  timestamp: new Date(),
  unit: 'PSI',
});

// Subscribe to tag changes
scada.subscribeToTag('pressure-001', (tag) => {
  console.log('Pressure:', tag.value, tag.unit);
  if (tag.alarmState !== 'normal') {
    console.log('⚠️ Alarm:', tag.alarmState);
  }
});

// Write to tag
await scada.writeTag('scada-001', 'setpoint-001', 100);
```

## Security

### Device Authentication

Secure device authentication:

```typescript
import { DeviceAuthManager } from '@intelgraph/iot-platform';

const authManager = new DeviceAuthManager('jwt-secret');

// Register device
await authManager.registerDevice(
  'device-001',
  {
    deviceId: 'device-001',
    clientId: 'client-001',
    apiKey: authManager.generateApiKey(),
  }
);

// Generate JWT token
const token = await authManager.generateDeviceToken(
  'device-001',
  ['telemetry:publish', 'telemetry:subscribe'],
  '30d'
);

// Verify token
const payload = await authManager.verifyDeviceToken(token);
console.log('Device ID:', payload.deviceId);
console.log('Scopes:', payload.scopes);

// Authenticate with API key
const isValid = authManager.authenticateWithApiKey('device-001', apiKey);
```

### Certificate-Based Authentication

Use X.509 certificates:

```typescript
// Provision device with certificate
const response = await provisioner.provisionDeviceWithCertificate({
  name: 'Secure Device 001',
  type: DeviceType.SENSOR,
  certificate: certificatePEM,
  privateKey: privateKeyPEM,
});

// Authenticate
const isValid = authManager.authenticateWithCertificate(deviceId, certificatePEM);
```

## API Reference

### REST API Endpoints

#### Device Provisioning

```
POST /api/devices/provision
Body: {
  "name": "Device Name",
  "type": "sensor",
  "manufacturer": "Acme",
  "model": "TMP-100",
  "serialNumber": "SN123"
}
```

#### Telemetry Ingestion

```
POST /api/telemetry
Body: {
  "deviceId": "device-001",
  "sensorId": "temp-001",
  "sensorType": "temperature",
  "value": 22.5,
  "unit": "celsius"
}
```

#### Analytics

```
GET /api/analytics/stats
GET /api/analytics/anomalies?limit=100
GET /api/devices/:deviceId/predictions
```

## Best Practices

1. **Security**: Always use TLS/SSL for production deployments
2. **Scaling**: Use load balancers for IoT Gateway instances
3. **Data Retention**: Configure appropriate retention policies for time-series data
4. **Monitoring**: Set up alerts for anomalies and device health
5. **Edge Processing**: Process data locally when possible to reduce bandwidth
6. **Batching**: Use batch ingestion for high-volume sensors
7. **Compression**: Enable compression for time-series data
8. **Testing**: Test OTA updates on small device cohorts first

## Troubleshooting

### Device Connection Issues

- Check device credentials (API key, token, certificate)
- Verify network connectivity and firewall rules
- Check protocol adapter configuration
- Review device logs for authentication errors

### Data Ingestion Issues

- Monitor ingestion pipeline statistics
- Check validator configurations
- Verify TimescaleDB connectivity
- Review batch sizes and timeouts

### Performance Optimization

- Enable compression in TimescaleDB
- Create appropriate indexes
- Use continuous aggregates for downsampling
- Configure retention policies
- Scale IoT Gateway horizontally

## Support

For issues and questions:
- GitHub: https://github.com/intelgraph/platform
- Documentation: https://docs.intelgraph.com/iot
- Community: https://community.intelgraph.com
