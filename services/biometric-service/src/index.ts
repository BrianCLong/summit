/**
 * Biometric Service
 *
 * Core service for biometric processing, enrollment, verification,
 * identification, and watchlist screening.
 */

import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import {
  BiometricPerson,
  BiometricTemplate,
  MatchRequest,
  BiometricSearch,
  BiometricAuditEvent
} from '@intelgraph/biometrics';
import {
  FaceProfile,
  FaceDetection,
  FaceEncoding
} from '@intelgraph/facial-recognition';
import {
  ScreeningRequest,
  ScreeningResult,
  Alert
} from '@intelgraph/watchlist-screening';
import {
  IdentityRecord,
  FusionResult
} from '@intelgraph/identity-resolution';

// ============================================================================
// Configuration
// ============================================================================

interface ServiceConfig {
  port: number;
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
  };
  security: {
    enableEncryption: boolean;
    enableAudit: boolean;
    retentionDays: number;
  };
  processing: {
    maxConcurrent: number;
    timeout: number;
  };
}

const config: ServiceConfig = {
  port: parseInt(process.env.BIOMETRIC_SERVICE_PORT || '8080', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'biometrics',
    user: process.env.DB_USER || 'biometric_user',
    password: process.env.DB_PASSWORD || ''
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },
  security: {
    enableEncryption: process.env.ENABLE_ENCRYPTION === 'true',
    enableAudit: process.env.ENABLE_AUDIT !== 'false',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10)
  },
  processing: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '10', 10),
    timeout: parseInt(process.env.PROCESSING_TIMEOUT || '30000', 10)
  }
};

// ============================================================================
// Database and Cache Connections
// ============================================================================

const pool = new Pool(config.database);
const redis = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port
  }
});

// ============================================================================
// Service Class
// ============================================================================

class BiometricService {
  /**
   * Enroll a new person with biometric data
   */
  async enrollPerson(data: {
    templates: BiometricTemplate[];
    metadata?: Record<string, unknown>;
  }): Promise<BiometricPerson> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const personId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert person record
      await client.query(
        `INSERT INTO biometric_persons (person_id, status, enrollment_date, last_update, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [personId, 'ACTIVE', now, now, JSON.stringify(data.metadata || {})]
      );

      // Insert biometric templates
      for (const template of data.templates) {
        await client.query(
          `INSERT INTO biometric_templates (
            template_id, person_id, modality, format, data, quality_score,
            quality_data, capture_date, source, device_id, position,
            compressed, encrypted, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            template.id,
            personId,
            template.modality,
            template.format,
            template.data,
            template.quality.score,
            JSON.stringify(template.quality),
            template.captureDate,
            template.source,
            template.deviceId,
            template.position,
            template.compressed,
            template.encrypted,
            JSON.stringify(template.metadata || {})
          ]
        );
      }

      await client.query('COMMIT');

      // Log audit event
      await this.logAuditEvent({
        eventType: 'ENROLLMENT',
        personId,
        operation: 'enroll_person',
        result: 'SUCCESS'
      });

      return {
        personId,
        templates: data.templates,
        enrollmentDate: now,
        lastUpdate: now,
        status: 'ACTIVE',
        metadata: data.metadata
      } as BiometricPerson;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform 1:1 biometric verification
   */
  async verifyBiometric(request: MatchRequest): Promise<boolean> {
    // Implementation would integrate with biometric matching algorithms
    // This is a placeholder structure
    console.log('Verification request:', request.requestId);

    await this.logAuditEvent({
      eventType: 'VERIFICATION',
      operation: 'verify_biometric',
      result: 'SUCCESS'
    });

    return true;
  }

  /**
   * Perform 1:N biometric identification
   */
  async identifyBiometric(search: BiometricSearch): Promise<any[]> {
    // Implementation would integrate with biometric search algorithms
    console.log('Identification search:', search.searchId);

    await this.logAuditEvent({
      eventType: 'IDENTIFICATION',
      operation: 'identify_biometric',
      result: 'SUCCESS'
    });

    return [];
  }

  /**
   * Screen against watchlists
   */
  async screenWatchlists(request: ScreeningRequest): Promise<ScreeningResult> {
    const client = await pool.connect();
    try {
      // Query watchlists
      const watchlistsResult = await client.query(
        `SELECT * FROM watchlists WHERE active = true`
      );

      // Perform screening (placeholder logic)
      const result: ScreeningResult = {
        resultId: crypto.randomUUID(),
        requestId: request.requestId,
        status: 'NO_MATCH',
        matches: [],
        riskScore: 0,
        riskLevel: 'NONE',
        recommendation: 'CLEAR',
        processingTime: 100,
        timestamp: new Date().toISOString()
      };

      // Store result
      await client.query(
        `INSERT INTO screening_results (
          result_id, request_id, status, matches, risk_score,
          risk_level, recommendation, processing_time, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          result.resultId,
          result.requestId,
          result.status,
          JSON.stringify(result.matches),
          result.riskScore,
          result.riskLevel,
          result.recommendation,
          result.processingTime,
          JSON.stringify({})
        ]
      );

      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Get person by ID
   */
  async getPerson(personId: string): Promise<BiometricPerson | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM biometric_persons WHERE person_id = $1`,
        [personId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Get templates
      const templatesResult = await client.query(
        `SELECT * FROM biometric_templates WHERE person_id = $1`,
        [personId]
      );

      return {
        personId: row.person_id,
        templates: templatesResult.rows.map(t => ({
          id: t.template_id,
          modality: t.modality,
          format: t.format,
          data: t.data,
          quality: t.quality_data,
          captureDate: t.capture_date,
          source: t.source,
          deviceId: t.device_id,
          position: t.position,
          compressed: t.compressed,
          encrypted: t.encrypted,
          metadata: t.metadata
        })),
        enrollmentDate: row.enrollment_date,
        lastUpdate: row.last_update,
        status: row.status,
        riskScore: row.risk_score,
        metadata: row.metadata
      } as BiometricPerson;
    } finally {
      client.release();
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: Partial<BiometricAuditEvent>): Promise<void> {
    if (!config.security.enableAudit) {
      return;
    }

    const client = await pool.connect();
    try {
      const eventId = crypto.randomUUID();
      const now = new Date().toISOString();
      const retentionExpiry = new Date(
        Date.now() + config.security.retentionDays * 24 * 60 * 60 * 1000
      ).toISOString();

      await client.query(
        `INSERT INTO biometric_audit_events (
          event_id, event_type, person_id, user_id, user_role,
          operation, modalities, result, details, ip_address,
          location, timestamp, retention_expiry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          eventId,
          event.eventType,
          event.personId || null,
          'system', // Would be actual user ID
          'system',
          event.operation,
          event.modalities || [],
          event.result,
          JSON.stringify(event.details || {}),
          null,
          null,
          now,
          retentionExpiry
        ]
      );
    } finally {
      client.release();
    }
  }
}

// ============================================================================
// Express API
// ============================================================================

const app = express();
const service = new BiometricService();

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Enroll person
app.post('/api/v1/enroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.enrollPerson(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Verify biometric
app.post('/api/v1/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.verifyBiometric(req.body);
    res.json({ verified: result });
  } catch (error) {
    next(error);
  }
});

// Identify biometric
app.post('/api/v1/identify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.identifyBiometric(req.body);
    res.json({ candidates: result });
  } catch (error) {
    next(error);
  }
});

// Screen watchlists
app.post('/api/v1/screen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.screenWatchlists(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get person
app.get('/api/v1/persons/:personId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getPerson(req.params.personId);
    if (!result) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// Service Startup
// ============================================================================

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    console.log('Connected to Redis');

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL');

    // Start server
    app.listen(config.port, () => {
      console.log(`Biometric service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await redis.quit();
  await pool.end();
  process.exit(0);
});

// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { BiometricService, config };
