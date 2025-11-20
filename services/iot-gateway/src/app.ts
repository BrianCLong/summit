/**
 * IoT Gateway Application
 * Core application logic for IoT gateway
 */

import pino from 'pino';
import { DeviceAuthManager } from '@intelgraph/iot-platform';
import { DeviceRegistry, DeviceProvisioner, OTAUpdateManager } from '@intelgraph/device-management';
import { DataIngestionPipeline, SensorStreamManager } from '@intelgraph/sensor-data';
import { TimescaleDBAdapter } from '@intelgraph/time-series';
import { AnomalyDetector, MaintenancePredictor } from '@intelgraph/iot-analytics';

const logger = pino({ name: 'iot-gateway-app' });

export class IoTGatewayApp {
  // Core components
  public authManager: DeviceAuthManager;
  public deviceRegistry: DeviceRegistry;
  public deviceProvisioner: DeviceProvisioner;
  public otaManager: OTAUpdateManager;

  // Data processing
  public ingestionPipeline: DataIngestionPipeline;
  public streamManager: SensorStreamManager;

  // Storage
  public timeSeriesDB?: TimescaleDBAdapter;

  // Analytics
  public anomalyDetector: AnomalyDetector;
  public maintenancePredictor: MaintenancePredictor;

  constructor() {
    // Initialize core components
    this.authManager = new DeviceAuthManager(process.env.JWT_SECRET);
    this.deviceRegistry = new DeviceRegistry();
    this.deviceProvisioner = new DeviceProvisioner(
      this.deviceRegistry,
      this.authManager,
      {
        mqttEndpoint: process.env.MQTT_ENDPOINT,
        httpsEndpoint: process.env.HTTPS_ENDPOINT,
        websocketEndpoint: process.env.WS_ENDPOINT,
      }
    );
    this.otaManager = new OTAUpdateManager(this.deviceRegistry);

    // Initialize data processing
    this.ingestionPipeline = new DataIngestionPipeline({
      batchSize: parseInt(process.env.BATCH_SIZE ?? '100'),
      batchTimeout: parseInt(process.env.BATCH_TIMEOUT ?? '5000'),
      validation: true,
    });
    this.streamManager = new SensorStreamManager();

    // Initialize analytics
    this.anomalyDetector = new AnomalyDetector();
    this.maintenancePredictor = new MaintenancePredictor();

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    logger.info('Initializing IoT Gateway');

    // Initialize TimescaleDB if configured
    if (process.env.TIMESCALE_HOST) {
      this.timeSeriesDB = new TimescaleDBAdapter({
        host: process.env.TIMESCALE_HOST,
        port: parseInt(process.env.TIMESCALE_PORT ?? '5432'),
        database: process.env.TIMESCALE_DB ?? 'iot',
        user: process.env.TIMESCALE_USER ?? 'postgres',
        password: process.env.TIMESCALE_PASSWORD ?? '',
        ssl: process.env.TIMESCALE_SSL === 'true',
      });

      await this.timeSeriesDB.initialize();
      logger.info('TimescaleDB initialized');
    }

    logger.info('IoT Gateway initialized successfully');
  }

  private setupEventHandlers(): void {
    // Handle ingested sensor data
    this.ingestionPipeline.on('batch:ready', async ({ dataPoints, readings }) => {
      // Store in time-series database
      if (this.timeSeriesDB) {
        try {
          await this.timeSeriesDB.write(dataPoints);
          logger.debug({ count: dataPoints.length }, 'Batch written to TimescaleDB');
        } catch (error) {
          logger.error({ error }, 'Failed to write batch to TimescaleDB');
        }
      }

      // Analyze for anomalies
      for (const reading of readings) {
        try {
          const anomaly = await this.anomalyDetector.analyze(reading);
          if (anomaly) {
            logger.warn({ anomaly }, 'Anomaly detected in sensor reading');
          }
        } catch (error) {
          logger.error({ error }, 'Anomaly detection failed');
        }
      }
    });

    // Handle device lifecycle events
    this.deviceRegistry.on('device:registered', (device) => {
      logger.info({ deviceId: device.id, name: device.name }, 'New device registered');
    });

    this.deviceRegistry.on('device:decommissioned', (device) => {
      logger.info({ deviceId: device.id }, 'Device decommissioned');
    });

    // Handle OTA update events
    this.otaManager.on('update:completed', (status) => {
      logger.info(
        { deviceId: status.deviceId, version: status.targetVersion },
        'OTA update completed'
      );
    });

    this.otaManager.on('update:failed', (status) => {
      logger.error(
        { deviceId: status.deviceId, error: status.error },
        'OTA update failed'
      );
    });

    // Handle anomaly alerts
    this.anomalyDetector.on('anomaly:detected', (alert) => {
      logger.warn(
        {
          deviceId: alert.deviceId,
          sensorId: alert.sensorId,
          severity: alert.severity,
        },
        'Anomaly alert triggered'
      );
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down IoT Gateway');

    // Flush ingestion pipeline
    await this.ingestionPipeline.stop();

    // Close database connections
    if (this.timeSeriesDB) {
      await this.timeSeriesDB.close();
    }

    logger.info('IoT Gateway shut down successfully');
  }
}
