/**
 * IntelGraph GA-Core Streaming Ingest Routes
 * Committee Requirements: PII redaction, real-time processing, observability integration
 */

import express from 'express';
import { requireAuthority, requireReasonForAccess } from '../middleware/authority.js';
import StreamingIngestWorker from '../services/streaming/ingest-worker.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const ingestWorker = StreamingIngestWorker.getInstance();

// Committee requirement: All streaming operations require reason for access
router.use(requireReasonForAccess);

// Main ingest endpoint for streaming data
router.post('/ingest',
  requireAuthority('streaming_ingest', ['data_ingestion']),
  async (req, res) => {
    const span = otelService.getCurrentSpan();
    
    try {
      const {
        source,
        data_type,
        raw_data,
        priority = 5,
        metadata = {},
        correlation_id
      } = req.body;

      // Validate required fields
      if (!source || !data_type || !raw_data) {
        otelService.addSpanAttributes({
          'streaming.validation_error': true,
          'streaming.missing_fields': ['source', 'data_type', 'raw_data'].filter(field => !req.body[field])
        });

        return res.status(400).json({
          success: false,
          error: 'Source, data_type, and raw_data are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const validDataTypes = ['event', 'entity', 'relationship', 'document', 'metric'];
      if (!validDataTypes.includes(data_type)) {
        otelService.addSpanAttributes({
          'streaming.validation_error': true,
          'streaming.invalid_data_type': data_type
        });

        return res.status(400).json({
          success: false,
          error: `Invalid data_type. Must be one of: ${validDataTypes.join(', ')}`,
          valid_types: validDataTypes,
          code: 'INVALID_DATA_TYPE'
        });
      }

      const user = req.user as any;

      // Committee requirement: OTEL tracing for streaming operations
      const messageId = await otelService.traceStreamingOperation(
        'message_ingest',
        1,
        span
      )(async () => {
        return await ingestWorker.ingestMessage({
          source,
          timestamp: new Date(),
          data_type,
          raw_data,
          priority: Math.min(Math.max(priority, 1), 10),
          metadata: {
            ...metadata,
            user_id: user.id,
            clearance_level: user.clearance_level,
            reason_for_access: req.reason_for_access?.reason,
            ingestion_timestamp: new Date().toISOString()
          },
          correlation_id
        });
      });

      otelService.addSpanAttributes({
        'streaming.message_id': messageId,
        'streaming.source': source,
        'streaming.data_type': data_type,
        'streaming.priority': priority,
        'streaming.user_id': user.id
      });

      logger.info({
        message: 'Message queued for streaming ingest',
        message_id: messageId,
        source,
        data_type,
        user_id: user.id,
        queue_size: ingestWorker.getQueueSize()
      });

      res.status(202).json({
        success: true,
        message_id: messageId,
        status: 'queued',
        queue_position: ingestWorker.getQueueSize(),
        message: 'Message queued for streaming processing'
      });

    } catch (error) {
      otelService.addSpanAttributes({
        'streaming.ingest_error': true,
        'streaming.error': error instanceof Error ? error.message : String(error)
      });

      logger.error({
        message: 'Streaming ingest failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Streaming ingest failed',
        code: 'INGEST_ERROR'
      });
    }
  }
);

// Batch ingest endpoint
router.post('/ingest/batch',
  requireAuthority('streaming_ingest', ['batch_ingestion']),
  async (req, res) => {
    const span = otelService.getCurrentSpan();
    
    try {
      const { messages = [] } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required for batch ingestion',
          code: 'MISSING_MESSAGES'
        });
      }

      if (messages.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 messages allowed per batch',
          code: 'BATCH_SIZE_EXCEEDED'
        });
      }

      const user = req.user as any;
      const messageIds: string[] = [];
      const errors: any[] = [];

      // Committee requirement: OTEL tracing for batch operations
      await otelService.traceStreamingOperation(
        'batch_ingest',
        messages.length,
        span
      )(async () => {
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          
          try {
            // Validate each message
            if (!message.source || !message.data_type || !message.raw_data) {
              errors.push({
                index: i,
                error: 'Missing required fields: source, data_type, raw_data'
              });
              continue;
            }

            const messageId = await ingestWorker.ingestMessage({
              source: message.source,
              timestamp: new Date(message.timestamp || Date.now()),
              data_type: message.data_type,
              raw_data: message.raw_data,
              priority: Math.min(Math.max(message.priority || 5, 1), 10),
              metadata: {
                ...message.metadata,
                batch_index: i,
                batch_id: crypto.randomUUID(),
                user_id: user.id,
                clearance_level: user.clearance_level
              },
              correlation_id: message.correlation_id
            });

            messageIds.push(messageId);

          } catch (error) {
            errors.push({
              index: i,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });

      otelService.addSpanAttributes({
        'streaming.batch_size': messages.length,
        'streaming.successful_ingests': messageIds.length,
        'streaming.failed_ingests': errors.length,
        'streaming.queue_size_after': ingestWorker.getQueueSize()
      });

      logger.info({
        message: 'Batch ingest completed',
        batch_size: messages.length,
        successful: messageIds.length,
        errors: errors.length,
        user_id: user.id
      });

      res.status(202).json({
        success: true,
        batch_summary: {
          total_messages: messages.length,
          successful_ingests: messageIds.length,
          failed_ingests: errors.length,
          message_ids: messageIds,
          errors: errors.length > 0 ? errors : undefined
        },
        queue_size: ingestWorker.getQueueSize(),
        message: `Batch processing queued: ${messageIds.length}/${messages.length} messages successfully queued`
      });

    } catch (error) {
      otelService.addSpanAttributes({
        'streaming.batch_error': true,
        'streaming.error': error instanceof Error ? error.message : String(error)
      });

      logger.error({
        message: 'Batch ingest failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Batch ingest failed',
        code: 'BATCH_INGEST_ERROR'
      });
    }
  }
);

// Get streaming worker metrics
router.get('/metrics',
  requireAuthority('streaming_ingest', ['metrics_access']),
  async (req, res) => {
    try {
      const metrics = ingestWorker.getMetrics();
      
      otelService.addSpanAttributes({
        'streaming.metrics.queue_size': metrics.queue_size,
        'streaming.metrics.worker_status': metrics.worker_status,
        'streaming.metrics.messages_processed': metrics.messages_processed
      });

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString(),
        message: 'Streaming worker metrics retrieved'
      });

    } catch (error) {
      logger.error({
        message: 'Failed to retrieve streaming metrics',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve streaming metrics',
        code: 'METRICS_ERROR'
      });
    }
  }
);

// Clear message queue (administrative)
router.post('/queue/clear',
  requireAuthority('streaming_ingest', ['queue_management']),
  async (req, res) => {
    try {
      const user = req.user as any;
      
      if (user.clearance_level < 4) {
        return res.status(403).json({
          success: false,
          error: 'Queue management requires administrative clearance (level 4+)',
          code: 'INSUFFICIENT_CLEARANCE'
        });
      }

      const queueSizeBefore = ingestWorker.getQueueSize();
      ingestWorker.clearQueue();

      otelService.addSpanAttributes({
        'streaming.queue_cleared': true,
        'streaming.messages_cleared': queueSizeBefore,
        'streaming.admin_user': user.id
      });

      logger.warn({
        message: 'Streaming queue cleared by administrator',
        user_id: user.id,
        messages_cleared: queueSizeBefore,
        clearance_level: user.clearance_level
      });

      res.json({
        success: true,
        messages_cleared: queueSizeBefore,
        queue_size_after: 0,
        message: 'Streaming queue cleared successfully'
      });

    } catch (error) {
      logger.error({
        message: 'Queue clear operation failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Queue clear operation failed',
        code: 'QUEUE_CLEAR_ERROR'
      });
    }
  }
);

// WebSocket endpoint for real-time streaming updates
router.get('/events/stream',
  requireAuthority('streaming_ingest', ['real_time_events']),
  async (req, res) => {
    try {
      const user = req.user as any;

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to streaming events',
        timestamp: new Date().toISOString(),
        user_id: user.id
      })}\n\n`);

      // Set up event listeners
      const onMessageProcessed = (processed: any) => {
        res.write(`data: ${JSON.stringify({
          type: 'message_processed',
          data: {
            message_id: processed.message_id,
            source: processed.source,
            data_type: processed.data_type,
            processing_time_ms: processed.processing_time_ms,
            confidence: processed.confidence
          },
          timestamp: new Date().toISOString()
        })}\n\n`);
      };

      const onQueueAlert = (alert: any) => {
        res.write(`data: ${JSON.stringify({
          type: 'queue_alert',
          data: alert,
          timestamp: new Date().toISOString()
        })}\n\n`);
      };

      ingestWorker.on('message_processed', onMessageProcessed);
      ingestWorker.on('queue_alert', onQueueAlert);

      // Clean up on client disconnect
      req.on('close', () => {
        ingestWorker.off('message_processed', onMessageProcessed);
        ingestWorker.off('queue_alert', onQueueAlert);
        
        logger.info({
          message: 'Client disconnected from streaming events',
          user_id: user.id
        });
      });

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          metrics: ingestWorker.getMetrics(),
          timestamp: new Date().toISOString()
        })}\n\n`);
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
      });

    } catch (error) {
      logger.error({
        message: 'Streaming events setup failed',
        error: error instanceof Error ? error.message : String(error),
        user_id: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Streaming events setup failed',
        code: 'STREAMING_EVENTS_ERROR'
      });
    }
  }
);

// Health check for streaming services
router.get('/health', async (req, res) => {
  try {
    const metrics = ingestWorker.getMetrics();
    const isHealthy = metrics.worker_status === 'healthy' || metrics.worker_status === 'degraded';
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      service: 'streaming-ingest',
      status: metrics.worker_status,
      timestamp: new Date().toISOString(),
      metrics: {
        queue_size: metrics.queue_size,
        messages_processed: metrics.messages_processed,
        messages_per_second: metrics.messages_per_second,
        pii_redactions_applied: metrics.pii_redactions_applied,
        errors_encountered: metrics.errors_encountered
      },
      features: {
        pii_redaction: true,
        batch_processing: true,
        real_time_events: true,
        otel_tracing: true
      }
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'streaming-ingest',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;