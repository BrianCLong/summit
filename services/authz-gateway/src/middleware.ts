import type { Request, Response, NextFunction } from 'express';
import type { JWTPayload } from 'jose';
import pino from 'pino';
import { authorize } from './policy';
import { log } from './audit';
import { sessionManager } from './session';
import type { AttributeService } from './attribute-service';
import type {
  AuthorizationInput,
  DecisionObligation,
  ResourceAttributes,
  SubjectAttributes,
  ElevationGrant,
} from './types';

interface Options {
  action: string;
  requiredAcr?: string;
  skipAuthorization?: boolean;
  resourceIdHeader?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  subjectAttributes?: SubjectAttributes;
  resourceAttributes?: ResourceAttributes;
  obligations?: DecisionObligation[];
}

async function buildResource(
  attributeService: AttributeService,
  req: Request,
  subject: SubjectAttributes,
  headerName?: string,
): Promise<ResourceAttributes> {
  const resourceIdHeader = headerName ?? 'x-resource-id';
  const resourceId = req.headers[resourceIdHeader];
  if (typeof resourceId === 'string' && resourceId.length > 0) {
    return attributeService.getResourceAttributes(resourceId);
  }
  const tenantHeader = req.headers['x-tenant-id'];
  const residencyHeader = req.headers['x-resource-residency'];
  const classificationHeader = req.headers['x-resource-classification'];
  const tenantId =
    tenantHeader === undefined ? subject.tenantId : String(tenantHeader);
  const residency =
    residencyHeader === undefined ? subject.residency : String(residencyHeader);
  const classification =
    classificationHeader === undefined
      ? subject.clearance
      : String(classificationHeader);
  const tagsHeader = req.headers['x-resource-tags'];
  const tags =
    typeof tagsHeader === 'string'
      ? tagsHeader
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  return {
    id: req.path,
    tenantId,
    residency,
    classification,
    tags,
  };
}

const logger = pino({ name: 'authz-require-auth' });

export function requireAuth(
  attributeService: AttributeService,
  options: Options,
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'missing_token' });
    }
    try {
      const token = auth.replace('Bearer ', '');
      const { payload } = await sessionManager.validate(token);
      if (options.requiredAcr && payload.acr !== options.requiredAcr) {
        return res
          .status(401)
          .set('WWW-Authenticate', `acr=${options.requiredAcr}`)
          .json({ error: 'step_up_required' });
      }
      const elevation = (payload as { elevation?: unknown }).elevation as
        | ElevationGrant
        | undefined;
      if (elevation) {
        if (
          elevation.sessionId &&
          elevation.sessionId !== String(payload.sid || '')
        ) {
          return res.status(401).json({ error: 'step_up_required' });
        }
        if (
          elevation.expiresAt &&
          new Date(elevation.expiresAt).getTime() < Date.now()
        ) {
          return res.status(401).json({ error: 'step_up_required' });
        }
      }
      const subject = await attributeService.getSubjectAttributes(
        String(payload.sub || ''),
      );
      const resource = await buildResource(
        attributeService,
        req,
        subject,
        options.resourceIdHeader,
      );

      if (!options.skipAuthorization) {
        const input: AuthorizationInput = {
          subject,
          resource,
          action: options.action,
          context: attributeService.getDecisionContext(
            String(payload.acr || 'loa1'),
          ),
        };
        const decision = await authorize(input);
        if (subject.tenantId !== resource.tenantId) {
          decision.allowed = false;
          decision.reason = 'tenant_mismatch';
        } else if (subject.residency !== resource.residency) {
          decision.allowed = false;
          decision.reason = 'residency_mismatch';
        }
        await log({
          subject: String(payload.sub || ''),
          action: options.action,
          resource: JSON.stringify(resource),
          tenantId: subject.tenantId,
          allowed: decision.allowed,
          reason: decision.reason,
        });
        if (!decision.allowed) {
          if (decision.obligations.length > 0) {
            req.obligations = decision.obligations;
            return res
              .status(401)
              .set('WWW-Authenticate', 'acr=loa2 step-up=webauthn')
              .json({
                error: 'step_up_required',
                obligations: decision.obligations,
                reason: decision.reason,
              });
          }
          return res
            .status(403)
            .json({ error: 'forbidden', reason: decision.reason });
        }
        req.obligations = decision.obligations;
      }

      req.user = payload;
      req.subjectAttributes = subject;
      req.resourceAttributes = resource;
      return next();
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'session_expired') {
        return res.status(401).json({ error: 'session_expired' });
      }
      if (message === 'session_not_found') {
        return res.status(401).json({ error: 'invalid_session' });
      }
      if (message === 'step_up_required') {
        return res.status(401).json({ error: 'step_up_required' });
      }
      if (process.env.NODE_ENV !== 'test') {
        logger.error({ err: error }, 'Authorization error');
      }
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
