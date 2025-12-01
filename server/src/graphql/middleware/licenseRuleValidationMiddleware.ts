import { GraphQLResolveInfo, GraphQLError } from 'graphql';
import logger from '../../utils/logger.js';

interface LicenseAwareUser {
  id?: string;
  email?: string;
  permissions?: string[];
  roles?: string[];
  licenseStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | string;
  license_status?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | string;
  clearanceLevel?: number;
  clearance_level?: number;
  clearanceLevels?: Array<string | number>;
  missionTags?: string[];
  needToKnowTags?: string[];
}

interface LicenseAwareContext {
  user?: LicenseAwareUser;
  request?: { ip?: string; headers?: Record<string, string> };
  reasonForAccess?: string;
}

interface LicenseRuleDecision {
  allowed: boolean;
  reasons: string[];
  requiredClearance: number;
  requiredPermissions: string[];
  requiredNeedToKnow: string[];
}

const CLASSIFICATION_CLEARANCE: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
  'top-secret': 4,
};

function normalizeClearance(user?: LicenseAwareUser): number {
  if (!user) return 0;

  if (typeof user.clearanceLevel === 'number') {
    return user.clearanceLevel;
  }

  if (typeof user.clearance_level === 'number') {
    return user.clearance_level;
  }

  if (Array.isArray(user.clearanceLevels) && user.clearanceLevels.length > 0) {
    const last = user.clearanceLevels[user.clearanceLevels.length - 1];
    const numeric = Number(last);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return 1; // Default to low clearance when not specified
}

function deriveRequirements(args: any, info: GraphQLResolveInfo) {
  const dataClassification = String(
    args?.dataClassification || args?.classification || args?.securityLevel || 'internal',
  ).toLowerCase();

  const requiredPermissions = new Set<string>([
    ...(Array.isArray(args?.requiredPermissions) ? args.requiredPermissions : []),
    ...(Array.isArray(args?.permissions) ? args.permissions : []),
  ]);

  // Optionally allow resolvers to pass explicit permission hints
  if (args?.accessScope) {
    requiredPermissions.add(String(args.accessScope));
  }

  const needToKnowTags = Array.isArray(args?.needToKnowTags)
    ? args.needToKnowTags
    : Array.isArray(args?.missionTags)
      ? args.missionTags
      : [];

  const requiredClearance =
    CLASSIFICATION_CLEARANCE[dataClassification] ?? CLASSIFICATION_CLEARANCE.internal;

  return {
    requiredClearance,
    requiredPermissions: [...requiredPermissions],
    requiredNeedToKnow: needToKnowTags,
    operation: `${info.parentType.name}.${info.fieldName}`,
    dataClassification,
  };
}

function evaluateLicenseRules(
  user: LicenseAwareUser,
  args: any,
  info: GraphQLResolveInfo,
): LicenseRuleDecision {
  const requirements = deriveRequirements(args, info);
  const reasons: string[] = [];

  const licenseStatus = (user.licenseStatus || user.license_status || 'ACTIVE').toUpperCase();
  if (licenseStatus !== 'ACTIVE') {
    reasons.push(`License status ${licenseStatus} does not permit data access`);
  }

  const userPermissions = new Set([...(user.permissions || []), ...(user.roles || [])]);
  if (
    requirements.requiredPermissions.length > 0 &&
    !requirements.requiredPermissions.some((perm) => userPermissions.has(perm))
  ) {
    reasons.push(
      `Missing required data access permission(s): ${requirements.requiredPermissions.join(', ')}`,
    );
  }

  const userNeedToKnow = new Set([...(user.needToKnowTags || []), ...(user.missionTags || [])]);
  if (
    requirements.requiredNeedToKnow.length > 0 &&
    !requirements.requiredNeedToKnow.every((tag) => userNeedToKnow.has(tag))
  ) {
    reasons.push(
      `Need-to-know tags required: ${requirements.requiredNeedToKnow.join(', ')}`,
    );
  }

  const userClearance = normalizeClearance(user);
  if (userClearance < requirements.requiredClearance) {
    reasons.push(
      `Insufficient clearance level: ${userClearance} < ${requirements.requiredClearance}`,
    );
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    requiredClearance: requirements.requiredClearance,
    requiredPermissions: requirements.requiredPermissions,
    requiredNeedToKnow: requirements.requiredNeedToKnow,
  };
}

export async function licenseRuleValidationMiddleware(
  resolve: any,
  parent: any,
  args: any,
  context: LicenseAwareContext,
  info: GraphQLResolveInfo,
) {
  const user = context.user;

  if (!user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const decision = evaluateLicenseRules(user, args, info);

  if (!decision.allowed) {
    logger.warn(
      {
        userId: user.id,
        operation: `${info.operation.operation}.${info.fieldName}`,
        reasons: decision.reasons,
        requiredPermissions: decision.requiredPermissions,
        requiredClearance: decision.requiredClearance,
        requiredNeedToKnow: decision.requiredNeedToKnow,
      },
      'GraphQL license rule validation denied access',
    );

    throw new GraphQLError('License rules denied access to this resolver', {
      extensions: {
        code: 'FORBIDDEN',
        reasons: decision.reasons,
      },
    });
  }

  return resolve(parent, args, context, info);
}

export default licenseRuleValidationMiddleware;
