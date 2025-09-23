/**
 * WebAuthn API Routes
 *
 * Express routes for WebAuthn registration, authentication,
 * and step-up authentication flows.
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { WebAuthnEnforcer } from '../auth/webauthn-enforcer';
import { requireAuth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import { logger } from '../utils/logger';

interface WebAuthnRouterOptions {
  webauthnEnforcer: WebAuthnEnforcer;
  enableRegistration: boolean;
  enableStepUp: boolean;
  maxCredentialsPerUser: number;
}

export function createWebAuthnRouter(options: WebAuthnRouterOptions): Router {
  const router = Router();
  const { webauthnEnforcer, enableRegistration, enableStepUp, maxCredentialsPerUser } = options;

  // Rate limiting for authentication endpoints
  const authRateLimit = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: 'Too many authentication attempts'
  });

  const stepUpRateLimit = rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 attempts per window
    message: 'Too many step-up attempts'
  });

  // Validation middleware
  const validateRegistrationStart = [
    body('username').isLength({ min: 1, max: 100 }).trim(),
    body('displayName').isLength({ min: 1, max: 200 }).trim(),
    body('nickname').optional().isLength({ max: 50 }).trim()
  ];

  const validateRegistrationFinish = [
    body('response').isObject(),
    body('nickname').optional().isLength({ max: 50 }).trim()
  ];

  const validateAuthenticationFinish = [
    body('response').isObject()
  ];

  const validateStepUpParams = [
    param('sessionId').isLength({ min: 1, max: 100 }).trim()
  ];

  // Helper function to handle validation errors
  const handleValidationErrors = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  };

  // Registration endpoints (if enabled)
  if (enableRegistration) {
    // Start WebAuthn registration
    router.post('/register/start',
      requireAuth,
      authRateLimit,
      validateRegistrationStart,
      handleValidationErrors,
      async (req: Request, res: Response) => {
        try {
          const { username, displayName } = req.body;
          const userId = req.user!.id;

          logger.info('WebAuthn registration started', {
            userId,
            username,
            ip: req.ip
          });

          const options = await webauthnEnforcer.generateRegistrationOptions({
            userId,
            username,
            displayName
          });

          res.json({
            success: true,
            options
          });

        } catch (error) {
          logger.error('WebAuthn registration start failed', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
          });

          res.status(500).json({
            error: 'Registration failed',
            message: 'Unable to start registration process'
          });
        }
      }
    );

    // Finish WebAuthn registration
    router.post('/register/finish',
      requireAuth,
      authRateLimit,
      validateRegistrationFinish,
      handleValidationErrors,
      async (req: Request, res: Response) => {
        try {
          const { response, nickname } = req.body;
          const userId = req.user!.id;

          logger.info('WebAuthn registration finishing', {
            userId,
            credentialId: response.id,
            ip: req.ip
          });

          const result = await webauthnEnforcer.verifyRegistrationResponse({
            userId,
            response,
            nickname
          });

          if (result.verified && result.credential) {
            logger.info('WebAuthn registration completed', {
              userId,
              credentialId: result.credential.id,
              deviceType: result.credential.deviceType,
              riskScore: result.credential.riskScore
            });

            res.json({
              success: true,
              credential: {
                id: result.credential.id,
                nickname: result.credential.nickname,
                deviceType: result.credential.deviceType,
                createdAt: result.credential.createdAt,
                riskScore: result.credential.riskScore
              }
            });
          } else {
            logger.warn('WebAuthn registration verification failed', {
              userId,
              ip: req.ip
            });

            res.status(400).json({
              error: 'Registration failed',
              message: 'Unable to verify registration response'
            });
          }

        } catch (error) {
          logger.error('WebAuthn registration finish failed', {
            error: error.message,
            userId: req.user?.id,
            ip: req.ip
          });

          res.status(500).json({
            error: 'Registration failed',
            message: 'Unable to complete registration'
          });
        }
      }
    );
  }

  // Step-up authentication endpoints (if enabled)
  if (enableStepUp) {
    // Get step-up authentication challenge
    router.get('/step-up/:sessionId/challenge',
      stepUpRateLimit,
      validateStepUpParams,
      handleValidationErrors,
      async (req: Request, res: Response) => {
        try {
          const { sessionId } = req.params;

          logger.info('Step-up challenge requested', {
            sessionId,
            ip: req.ip
          });

          const result = await webauthnEnforcer.generateStepUpAuthenticationOptions(sessionId);

          res.json({
            success: true,
            options: result.options,
            challengeId: result.challengeId
          });

        } catch (error) {
          logger.error('Step-up challenge generation failed', {
            error: error.message,
            sessionId: req.params.sessionId,
            ip: req.ip
          });

          res.status(400).json({
            error: 'Challenge generation failed',
            message: error.message
          });
        }
      }
    );

    // Verify step-up authentication response
    router.post('/step-up/:sessionId/verify',
      stepUpRateLimit,
      validateStepUpParams,
      validateAuthenticationFinish,
      handleValidationErrors,
      async (req: Request, res: Response) => {
        try {
          const { sessionId } = req.params;
          const { response, challengeId } = req.body;

          logger.info('Step-up verification requested', {
            sessionId,
            challengeId,
            credentialId: response.id,
            ip: req.ip
          });

          const result = await webauthnEnforcer.verifyStepUpAuthenticationResponse({
            sessionId,
            challengeId,
            response
          });

          if (result.verified) {
            // Check if step-up is now satisfied
            const satisfied = await webauthnEnforcer.isStepUpSatisfied(sessionId);

            logger.info('Step-up verification completed', {
              sessionId,
              challengeId,
              authLevel: result.authLevel,
              satisfied
            });

            res.json({
              success: true,
              verified: true,
              authLevel: result.authLevel,
              satisfied,
              message: satisfied ? 'Step-up authentication completed' : 'Additional authentication may be required'
            });
          } else {
            logger.warn('Step-up verification failed', {
              sessionId,
              challengeId,
              ip: req.ip
            });

            res.status(400).json({
              error: 'Verification failed',
              message: 'Unable to verify authentication response'
            });
          }

        } catch (error) {
          logger.error('Step-up verification failed', {
            error: error.message,
            sessionId: req.params.sessionId,
            ip: req.ip
          });

          res.status(500).json({
            error: 'Verification failed',
            message: 'Unable to process authentication response'
          });
        }
      }
    );

    // Check step-up session status
    router.get('/step-up/:sessionId/status',
      validateStepUpParams,
      handleValidationErrors,
      async (req: Request, res: Response) => {
        try {
          const { sessionId } = req.params;

          const satisfied = await webauthnEnforcer.isStepUpSatisfied(sessionId);

          res.json({
            success: true,
            sessionId,
            satisfied,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          logger.error('Step-up status check failed', {
            error: error.message,
            sessionId: req.params.sessionId,
            ip: req.ip
          });

          res.status(400).json({
            error: 'Status check failed',
            message: error.message
          });
        }
      }
    );
  }

  // Risk assessment endpoint (for testing/debugging)
  router.post('/assess-risk',
    requireAuth,
    rateLimiter({ windowMs: 60000, max: 30 }), // 30 requests per minute
    [
      body('operation').isLength({ min: 1, max: 100 }),
      body('context').optional().isObject()
    ],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const { operation, context = {} } = req.body;
        const userId = req.user!.id;
        const tenantId = req.user!.tenantId || req.headers['x-tenant-id'] as string;

        logger.info('Risk assessment requested', {
          userId,
          operation,
          ip: req.ip
        });

        const assessment = await webauthnEnforcer.assessRisk({
          userId,
          tenantId,
          operation,
          context: {
            ...context,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          }
        });

        res.json({
          success: true,
          assessment: {
            score: assessment.score,
            recommendation: assessment.recommendation,
            requiredAuthLevel: assessment.requiredAuthLevel,
            factors: assessment.factors.map(factor => ({
              type: factor.type,
              factor: factor.factor,
              score: factor.score,
              description: factor.description
            }))
          }
        });

      } catch (error) {
        logger.error('Risk assessment failed', {
          error: error.message,
          userId: req.user?.id,
          ip: req.ip
        });

        res.status(500).json({
          error: 'Risk assessment failed',
          message: 'Unable to assess risk'
        });
      }
    }
  );

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      service: 'webauthn',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        registration: enableRegistration,
        stepUp: enableStepUp
      }
    });
  });

  // Error handling middleware
  router.use((error: any, req: Request, res: Response, next: any) => {
    logger.error('WebAuthn route error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  });

  return router;
}