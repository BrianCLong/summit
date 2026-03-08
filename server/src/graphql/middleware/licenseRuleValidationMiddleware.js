"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.licenseRuleValidationMiddleware = licenseRuleValidationMiddleware;
const graphql_1 = require("graphql");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const CLASSIFICATION_CLEARANCE = {
    public: 0,
    internal: 1,
    confidential: 2,
    secret: 3,
    'top-secret': 4,
};
function normalizeClearance(user) {
    if (!user)
        return 0;
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
function deriveRequirements(args, info) {
    const dataClassification = String(args?.dataClassification || args?.classification || args?.securityLevel || 'internal').toLowerCase();
    const requiredPermissions = new Set([
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
    const requiredClearance = CLASSIFICATION_CLEARANCE[dataClassification] ?? CLASSIFICATION_CLEARANCE.internal;
    return {
        requiredClearance,
        requiredPermissions: [...requiredPermissions],
        requiredNeedToKnow: needToKnowTags,
        operation: `${info.parentType.name}.${info.fieldName}`,
        dataClassification,
    };
}
function evaluateLicenseRules(user, args, info) {
    const requirements = deriveRequirements(args, info);
    const reasons = [];
    const licenseStatus = (user.licenseStatus || user.license_status || 'ACTIVE').toUpperCase();
    if (licenseStatus !== 'ACTIVE') {
        reasons.push(`License status ${licenseStatus} does not permit data access`);
    }
    const userPermissions = new Set([...(user.permissions || []), ...(user.roles || [])]);
    if (requirements.requiredPermissions.length > 0 &&
        !requirements.requiredPermissions.some((perm) => userPermissions.has(perm))) {
        reasons.push(`Missing required data access permission(s): ${requirements.requiredPermissions.join(', ')}`);
    }
    const userNeedToKnow = new Set([...(user.needToKnowTags || []), ...(user.missionTags || [])]);
    if (requirements.requiredNeedToKnow.length > 0 &&
        !requirements.requiredNeedToKnow.every((tag) => userNeedToKnow.has(tag))) {
        reasons.push(`Need-to-know tags required: ${requirements.requiredNeedToKnow.join(', ')}`);
    }
    const userClearance = normalizeClearance(user);
    if (userClearance < requirements.requiredClearance) {
        reasons.push(`Insufficient clearance level: ${userClearance} < ${requirements.requiredClearance}`);
    }
    return {
        allowed: reasons.length === 0,
        reasons,
        requiredClearance: requirements.requiredClearance,
        requiredPermissions: requirements.requiredPermissions,
        requiredNeedToKnow: requirements.requiredNeedToKnow,
    };
}
async function licenseRuleValidationMiddleware(resolve, parent, args, context, info) {
    const user = context.user;
    if (!user) {
        throw new graphql_1.GraphQLError('Authentication required', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    const decision = evaluateLicenseRules(user, args, info);
    if (!decision.allowed) {
        logger_js_1.default.warn({
            userId: user.id,
            operation: `${info.operation.operation}.${info.fieldName}`,
            reasons: decision.reasons,
            requiredPermissions: decision.requiredPermissions,
            requiredClearance: decision.requiredClearance,
            requiredNeedToKnow: decision.requiredNeedToKnow,
        }, 'GraphQL license rule validation denied access');
        throw new graphql_1.GraphQLError('License rules denied access to this resolver', {
            extensions: {
                code: 'FORBIDDEN',
                reasons: decision.reasons,
            },
        });
    }
    return resolve(parent, args, context, info);
}
exports.default = licenseRuleValidationMiddleware;
