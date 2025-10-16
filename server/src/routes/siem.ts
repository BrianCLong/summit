/**
 * SIEM Management API Routes
 * 
 * REST endpoints for managing SIEM integrations, providers, and event monitoring.
 */

import { Router, Request, Response } from 'express';
import { siemService } from '../services/SIEMService.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/withAuthAndPolicy.js';
import logger from '../utils/logger.js';
import { AppError } from '../lib/errors.js';
import { param, body, query, validationResult } from 'express-validator';

const router = Router();

// Apply authentication to all SIEM routes
router.use(authMiddleware);

/**
 * GET /api/siem/providers
 * List all SIEM providers
 */
router.get('/providers',
  rbacMiddleware(['admin', 'security_officer']),
  async (req: Request, res: Response) => {
    try {
      const providers = siemService.listProviders();
      
      // Filter sensitive information for response
      const filteredProviders = providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        config: {
          url: provider.config.url ? '[CONFIGURED]' : '[NOT CONFIGURED]',
          timeout: provider.config.timeout,
          retryAttempts: provider.config.retryAttempts
        },
        rateLimits: provider.rateLimits,
        filterCount: provider.filters.length
      }));

      res.json({
        success: true,
        data: filteredProviders,
        meta: {
          total: providers.length,
          enabled: providers.filter(p => p.enabled).length,
          types: [...new Set(providers.map(p => p.type))]
        }
      });
    } catch (error) {
      logger.error('Failed to list SIEM providers', {
        component: 'SIEMRoutes',
        error: (err as Error).message,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to retrieve SIEM providers', 500);
    }
  }
);

/**
 * GET /api/siem/providers/:id
 * Get specific SIEM provider details
 */
router.get('/providers/:id',
  rbacMiddleware(['admin', 'security_officer']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid provider ID', 400, 'VALIDATION_ERROR');
      }

      const status = siemService.getProviderStatus(req.params.id);
      if (!status.provider) {
        throw new AppError('SIEM provider not found', 404);
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to get SIEM provider', {
        component: 'SIEMRoutes',
        error: err.message,
        providerId: req.params.id,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to retrieve SIEM provider', 500);
    }
  }
);

/**
 * PUT /api/siem/providers/:id
 * Update SIEM provider configuration
 */
router.put('/providers/:id',
  rbacMiddleware(['admin']),
  param('id').isString().notEmpty(),
  body('enabled').isBoolean().optional(),
  body('config').isObject().optional(),
  body('rateLimits').isObject().optional(),
  body('filters').isArray().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array()
        });
      }

      const providerId = req.params.id;
      const updates = req.body;

      // Validate provider exists
      const currentStatus = siemService.getProviderStatus(providerId);
      if (!currentStatus.provider) {
        throw new AppError('SIEM provider not found', 404);
      }

      const success = siemService.updateProvider(providerId, updates);
      if (!success) {
        throw new AppError('Failed to update SIEM provider', 500);
      }

      logger.info('SIEM provider updated', {
        component: 'SIEMRoutes',
        providerId,
        updatedBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
        changes: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'SIEM provider updated successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to update SIEM provider', {
        component: 'SIEMRoutes',
        error: err.message,
        providerId: req.params.id,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to update SIEM provider', 500);
    }
  }
);

/**
 * POST /api/siem/providers/:id/test
 * Test SIEM provider connectivity
 */
router.post('/providers/:id/test',
  rbacMiddleware(['admin', 'security_officer']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid provider ID', 400, 'VALIDATION_ERROR');
      }

      const providerId = req.params.id;
      
      logger.info('Testing SIEM provider connectivity', {
        component: 'SIEMRoutes',
        providerId,
        testedBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId
      });

      const testResult = await siemService.testProvider(providerId);
      
      res.json({
        success: true,
        data: {
          providerId,
          connected: testResult,
          testedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('SIEM provider test failed', {
        component: 'SIEMRoutes',
        error: err.message,
        providerId: req.params.id,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to test SIEM provider', 500);
    }
  }
);

/**
 * POST /api/siem/events
 * Manually send event to SIEM systems
 */
router.post('/events',
  rbacMiddleware(['admin', 'security_officer', 'analyst']),
  body('eventType').isString().notEmpty(),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('source').isString().notEmpty(),
  body('message').isString().notEmpty(),
  body('details').isObject().optional(),
  body('tags').isArray().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array()
        });
      }

      const event = {
        timestamp: new Date(),
        eventType: req.body.eventType,
        severity: req.body.severity,
        source: req.body.source,
        message: req.body.message,
        details: req.body.details || {},
        userId: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        tags: req.body.tags || ['manual'],
        rawData: {
          createdBy: (req as any).user?.id,
          createdAt: new Date(),
          manual: true
        }
      };

      await siemService.sendEvent(event);

      logger.info('Manual SIEM event sent', {
        component: 'SIEMRoutes',
        eventType: event.eventType,
        severity: event.severity,
        sentBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId
      });

      res.json({
        success: true,
        message: 'Event sent to SIEM systems',
        data: {
          eventId: `manual-${Date.now()}`,
          timestamp: event.timestamp,
          eventType: event.eventType,
          severity: event.severity
        }
      });
    } catch (error) {
      logger.error('Failed to send manual SIEM event', {
        component: 'SIEMRoutes',
        error: err.message,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to send SIEM event', 500);
    }
  }
);

/**
 * GET /api/siem/status
 * Get overall SIEM integration status
 */
router.get('/status',
  rbacMiddleware(['admin', 'security_officer', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const providers = siemService.listProviders();
      const enabledProviders = providers.filter(p => p.enabled);
      
      const statusSummary = {
        enabled: enabledProviders.length > 0,
        totalProviders: providers.length,
        enabledProviders: enabledProviders.length,
        providerStatus: enabledProviders.map(provider => {
          const status = siemService.getProviderStatus(provider.id);
          return {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            healthy: status.circuitBreaker?.state !== 'OPEN',
            bufferSize: status.buffer?.size || 0,
            lastActivity: status.buffer?.lastFlush
          };
        }),
        healthySystems: enabledProviders.filter(provider => {
          const status = siemService.getProviderStatus(provider.id);
          return status.circuitBreaker?.state !== 'OPEN';
        }).length
      };

      res.json({
        success: true,
        data: statusSummary
      });
    } catch (error) {
      logger.error('Failed to get SIEM status', {
        component: 'SIEMRoutes',
        error: err.message,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to retrieve SIEM status', 500);
    }
  }
);

/**
 * GET /api/siem/metrics
 * Get SIEM metrics and statistics
 */
router.get('/metrics',
  rbacMiddleware(['admin', 'security_officer']),
  query('timeRange').isIn(['1h', '24h', '7d', '30d']).optional(),
  query('provider').isString().optional(),
  async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || '24h';
      const providerFilter = req.query.provider as string;

      // In a real implementation, this would query actual metrics from monitoring systems
      const mockMetrics = {
        timeRange,
        provider: providerFilter || 'all',
        eventsSent: {
          total: 45672,
          successful: 45123,
          failed: 549,
          successRate: 98.8
        },
        eventsByType: {
          'authentication_failed': 1234,
          'authentication_success': 12456,
          'data_access': 8934,
          'privilege_escalation': 456,
          'suspicious_activity': 789,
          'request_anomaly': 234
        },
        eventsBySeverity: {
          'low': 35000,
          'medium': 8000,
          'high': 2500,
          'critical': 172
        },
        providerMetrics: siemService.listProviders()
          .filter(p => p.enabled && (!providerFilter || p.id === providerFilter))
          .map(provider => {
            const status = siemService.getProviderStatus(provider.id);
            return {
              id: provider.id,
              name: provider.name,
              type: provider.type,
              eventsSent: Math.floor(Math.random() * 10000) + 5000,
              failures: Math.floor(Math.random() * 100),
              averageLatency: Math.floor(Math.random() * 500) + 100,
              circuitBreakerState: status.circuitBreaker?.state || 'CLOSED',
              bufferSize: status.buffer?.size || 0
            };
          }),
        alerts: [
          {
            time: new Date(Date.now() - 3600000).toISOString(),
            message: 'High number of failed authentication attempts',
            severity: 'high',
            count: 45
          },
          {
            time: new Date(Date.now() - 7200000).toISOString(),
            message: 'Suspicious activity patterns detected',
            severity: 'medium',
            count: 12
          }
        ]
      };

      res.json({
        success: true,
        data: mockMetrics
      });
    } catch (error) {
      logger.error('Failed to get SIEM metrics', {
        component: 'SIEMRoutes',
        error: err.message,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to retrieve SIEM metrics', 500);
    }
  }
);

/**
 * POST /api/siem/alerts
 * Create security alert
 */
router.post('/alerts',
  rbacMiddleware(['admin', 'security_officer', 'analyst']),
  body('title').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('category').isString().optional(),
  body('indicators').isArray().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array()
        });
      }

      const alert = {
        title: req.body.title,
        description: req.body.description,
        severity: req.body.severity,
        category: req.body.category || 'security',
        indicators: req.body.indicators || [],
        createdBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId
      };

      // Create SIEM event for the alert
      const event = {
        timestamp: new Date(),
        eventType: 'security_alert',
        severity: alert.severity,
        source: 'intelgraph_manual_alert',
        message: `Security alert: ${alert.title}`,
        details: {
          title: alert.title,
          description: alert.description,
          category: alert.category,
          indicators: alert.indicators,
          alertId: `alert-${Date.now()}`
        },
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        tags: ['security', 'alert', 'manual']
      };

      await siemService.sendEvent(event);

      logger.info('Security alert created and sent to SIEM', {
        component: 'SIEMRoutes',
        alertTitle: alert.title,
        severity: alert.severity,
        createdBy: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId
      });

      res.json({
        success: true,
        message: 'Security alert created and sent to SIEM systems',
        data: {
          alertId: event.details.alertId,
          timestamp: event.timestamp,
          severity: event.severity
        }
      });
    } catch (error) {
      logger.error('Failed to create security alert', {
        component: 'SIEMRoutes',
        error: err.message,
        userId: (req as any).user?.id
      });
      throw new AppError('Failed to create security alert', 500);
    }
  }
);

/**
 * GET /api/siem/health
 * SIEM service health check
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const providers = siemService.listProviders();
      const enabledProviders = providers.filter(p => p.enabled);
      
      const healthyProviders = enabledProviders.filter(provider => {
        const status = siemService.getProviderStatus(provider.id);
        return status.circuitBreaker?.state !== 'OPEN';
      });

      const health = {
        status: healthyProviders.length === enabledProviders.length ? 'healthy' : 'degraded',
        timestamp: new Date(),
        providers: {
          total: providers.length,
          enabled: enabledProviders.length,
          healthy: healthyProviders.length,
          unhealthy: enabledProviders.length - healthyProviders.length
        },
        details: enabledProviders.map(provider => {
          const status = siemService.getProviderStatus(provider.id);
          return {
            id: provider.id,
            name: provider.name,
            healthy: status.circuitBreaker?.state !== 'OPEN',
            bufferSize: status.buffer?.size || 0
          };
        })
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      logger.error('SIEM health check failed', {
        component: 'SIEMRoutes',
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'SIEM service health check failed'
      });
    }
  }
);

export default router;