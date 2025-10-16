import { Request, Response, NextFunction } from 'express';
import { GraphQLError } from 'graphql';
import baseLogger from '../config/logger';
import { trace } from '@opentelemetry/api';
import { PolicyDecision } from '../conductor/governance/opa-integration.js'; // Import PolicyDecision

const logger = baseLogger.child({ name: 'contextBindingMiddleware' });

export interface RequestContext {
  tenantId: string;
  purpose: string;
  legalBasis: string;
  sensitivity: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
      policyDecision?: PolicyDecision; // Add this line
    }
  }
}

export function contextBindingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const tenantId = req.headers['x-tenant-id'] as string;
  const purpose = req.headers['x-purpose'] as string;
  const legalBasis = req.headers['x-legal-basis'] as string;
  const sensitivity = req.headers['x-sensitivity'] as string;

  if (!tenantId || !purpose || !legalBasis || !sensitivity) {
    logger.warn('Missing required context headers', {
      tenantId,
      purpose,
      legalBasis,
      sensitivity,
    });
    return res.status(400).json({
      error: 'Bad Request',
      message:
        'Missing required context headers: X-Tenant-Id, X-Purpose, X-Legal-Basis, X-Sensitivity',
    });
  }

  const context: RequestContext = {
    tenantId,
    purpose,
    legalBasis,
    sensitivity,
  };

  req.context = context;

  // Echo context in traces
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes({
      'app.tenant_id': context.tenantId,
      'app.purpose': context.purpose,
      'app.legal_basis': context.legalBasis,
      'app.sensitivity': context.sensitivity,
    });
  }

  logger.debug('Request context bound', context);

  next();
}
