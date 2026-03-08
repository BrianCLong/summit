"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainVocabulary = exports.glossaryMappings = exports.defaultSystemsOfRecord = exports.boundedContexts = exports.canonicalNouns = exports.identifiersSchema = exports.identifierSchema = exports.canonicalFeatures = exports.canonicalModules = void 0;
exports.validateIdentifiers = validateIdentifiers;
exports.resolveSystemOfRecord = resolveSystemOfRecord;
const zod_1 = require("zod");
exports.canonicalModules = [
    'navigation-shell',
    'identity-and-accounts',
    'billing-entitlements',
    'data-spine',
    'admin-governance',
    'cross-sell-discovery',
    'integration-hub',
    'core-workflows',
];
exports.canonicalFeatures = [
    'auth-flows',
    'rbac-abac',
    'scim',
    'metering',
    'proration',
    'audit-logging',
    'feature-flags',
    'cross-module-search',
    'command-palette',
    'onboarding-checklists',
    'data-quality-gates',
];
const idRegex = /^[a-zA-Z0-9_-]{3,128}$/;
exports.identifierSchema = zod_1.z.string().regex(idRegex, 'identifier must be 3-128 characters');
exports.identifiersSchema = zod_1.z.object({
    tenantId: exports.identifierSchema,
    accountId: exports.identifierSchema,
    orgId: exports.identifierSchema,
    userId: exports.identifierSchema,
    serviceAccountId: exports.identifierSchema,
    workspaceId: exports.identifierSchema,
    teamId: exports.identifierSchema,
    roleId: exports.identifierSchema,
    planId: exports.identifierSchema,
    entitlementId: exports.identifierSchema,
    resourceId: exports.identifierSchema,
    eventId: exports.identifierSchema,
});
exports.canonicalNouns = [
    'tenant',
    'account',
    'user',
    'role',
    'group',
    'workspace',
    'module',
    'feature',
    'plan',
    'entitlement',
    'usage-meter',
    'invoice',
    'audit-entry',
    'event',
    'connector',
    'job',
    'flag',
];
exports.boundedContexts = [
    'identity',
    'billing',
    'data-spine',
    'navigation',
    'admin-governance',
    'cross-sell',
    'application',
];
exports.defaultSystemsOfRecord = [
    {
        context: 'identity',
        owns: ['user', 'group', 'role', 'workspace', 'tenant'],
        interfaces: ['identity-and-accounts', 'navigation-shell', 'admin-governance'],
    },
    {
        context: 'billing',
        owns: ['plan', 'entitlement', 'usage-meter', 'invoice'],
        interfaces: ['billing-entitlements', 'integration-hub'],
    },
    {
        context: 'data-spine',
        owns: ['event', 'audit-entry', 'connector'],
        interfaces: ['data-spine', 'integration-hub', 'core-workflows'],
    },
    {
        context: 'navigation',
        owns: ['module', 'feature', 'flag'],
        interfaces: ['navigation-shell', 'core-workflows'],
    },
    {
        context: 'admin-governance',
        owns: ['job', 'audit-entry', 'flag'],
        interfaces: ['admin-governance', 'integration-hub'],
    },
];
exports.glossaryMappings = [
    { canonical: 'workspace', aliases: ['project', 'team-space'] },
    { canonical: 'usage-meter', aliases: ['meter', 'counter'] },
    { canonical: 'connector', aliases: ['integration', 'adapter'] },
];
exports.domainVocabulary = {
    modules: exports.canonicalModules,
    features: exports.canonicalFeatures,
    nouns: exports.canonicalNouns,
    contexts: exports.boundedContexts,
    systemsOfRecord: exports.defaultSystemsOfRecord,
    glossary: exports.glossaryMappings,
};
function validateIdentifiers(input) {
    return exports.identifiersSchema.parse(input);
}
function resolveSystemOfRecord(noun) {
    return exports.defaultSystemsOfRecord.find((sor) => sor.owns.includes(noun));
}
