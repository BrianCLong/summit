import type { Request, Response, NextFunction } from 'express';
import type { JWTPayload } from 'jose';
import pino from 'pino';
import { authorize } from './policy';
import { log } from './audit';
import { sessionManager } from './session';
import { breakGlassManager } from './break-glass';
import { enrichDecision } from './decision-record';
import type { AttributeService } from './attribute-service';
import type {
  AuthorizationInput,
  DecisionObligation,
  ResourceAttributes,
  SubjectAttributes,
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
  const tenantId = String(req.headers['x-tenant-id'] || subject.tenantId);
  const residency = String(
    req.headers['x-resource-residency'] || subject.residency,
  );
  const classification = String(
    req.headers['x-resource-classification'] || subject.clearance,
  );
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
      const { payload } = await sessionManager.validate(token, { consume: true });
      if (options.requiredAcr && payload.acr !== options.requiredAcr) {
        return res
          .status(401)
          .set('WWW-Authenticate', `acr=${options.requiredAcr}`)
          .json({ error: 'step_up_required' });
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
            payload.breakGlass
              ? {
                  breakGlass: payload.breakGlass as AuthorizationInput['context']['breakGlass'],
                }
              : {},
          ),
        };
        const decision = await authorize(input);
        const enrichedDecision = enrichDecision(decision, input);
        await log({
          subject: String(payload.sub || ''),
          action: options.action,
          resource: JSON.stringify(resource),
          tenantId: subject.tenantId,
          allowed: enrichedDecision.allowed,
          reason: enrichedDecision.reason,
          decisionId: enrichedDecision.decisionId,
          policyVersion: enrichedDecision.policyVersion,
          inputsHash: enrichedDecision.inputsHash,
          breakGlass: (payload as { breakGlass?: unknown }).breakGlass as
            | undefined
            | AuthorizationInput['context']['breakGlass'],
        });
        if (payload.breakGlass) {
          breakGlassManager.recordUsage(String(payload.sid || ''), {
            action: options.action,
            resource: resource.id,
            tenantId: subject.tenantId,
            allowed: enrichedDecision.allowed,
          });
        }
        if (!enrichedDecision.allowed) {
          if (enrichedDecision.obligations.length > 0) {
            req.obligations = enrichedDecision.obligations;
            return res
              .status(401)
              .set('WWW-Authenticate', 'acr=loa2 step-up=webauthn')
              .json({
                error: 'step_up_required',
                obligations: enrichedDecision.obligations,
                reason: enrichedDecision.reason,
              });
          }
          return res
            .status(403)
            .json({ error: 'forbidden', reason: enrichedDecision.reason });
        }
        req.obligations = enrichedDecision.obligations;
      }

      req.user = payload;
      req.subjectAttributes = subject;
      req.resourceAttributes = resource;
      res.locals.tenantId = subject.tenantId;
      res.locals.resourceId = resource.id;
      res.locals.action = options.action;
      return next();
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'session_expired') {
        return res.status(401).json({ error: 'session_expired' });
      }
      if (message === 'session_not_found') {
        return res.status(401).json({ error: 'invalid_session' });
      }
      if (process.env.NODE_ENV !== 'test') {
        logger.error({ err: error }, 'Authorization error');
      }
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
