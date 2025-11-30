import { jwtVerify, type JWTPayload } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { getPublicKey } from './keys';
import { authorize } from './policy';
import { log } from './audit';
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

function validateElevation(
  payload: JWTPayload,
  resource: ResourceAttributes,
  action: string,
  enforceContext: boolean,
): string | null {
  const elevation = (payload as { elevation?: ElevationGrant }).elevation;
  const sessionId = String((payload as { sid?: string }).sid || '');
  if (payload.acr !== 'loa2') {
    return enforceContext ? 'acr_insufficient' : null;
  }
  if (!elevation || !sessionId) {
    return 'elevation_provenance_missing';
  }
  if (elevation.sessionId !== sessionId) {
    return 'elevation_session_mismatch';
  }
  const expiresAt = Date.parse(elevation.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return 'elevation_expired';
  }
  if (enforceContext) {
    if (
      elevation.requestedAction &&
      elevation.requestedAction !== action
    ) {
      return 'elevation_action_mismatch';
    }
    if (elevation.resourceId && elevation.resourceId !== resource.id) {
      return 'elevation_resource_mismatch';
    }
    if (
      elevation.tenantId &&
      elevation.tenantId !== resource.tenantId
    ) {
      return 'elevation_tenant_mismatch';
    }
    if (
      elevation.classification &&
      elevation.classification !== resource.classification
    ) {
      return 'elevation_classification_mismatch';
    }
  }
  return null;
}

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
      const { payload } = await jwtVerify(token, getPublicKey());
      const subject = await attributeService.getSubjectAttributes(
        String(payload.sub || ''),
      );
      const resource = await buildResource(
        attributeService,
        req,
        subject,
        options.resourceIdHeader,
      );

      const protectedActions = attributeService.listProtectedActions();
      const enforceContextualElevation =
        options.requiredAcr === 'loa2' ||
        protectedActions.includes(options.action);
      const elevationStatus = validateElevation(
        payload,
        resource,
        options.action,
        enforceContextualElevation,
      );
      if (
        elevationStatus &&
        (payload.acr === 'loa2' || enforceContextualElevation)
      ) {
        return res
          .status(401)
          .set('WWW-Authenticate', 'acr=loa2 step-up=webauthn')
          .json({ error: 'step_up_required', reason: elevationStatus });
      }
      if (options.requiredAcr && payload.acr !== options.requiredAcr) {
        return res
          .status(401)
          .set('WWW-Authenticate', `acr=${options.requiredAcr}`)
          .json({ error: 'step_up_required' });
      }

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
      if (process.env.NODE_ENV !== 'test') {
        logger.error({ err: error }, 'Authorization error');
      }
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
