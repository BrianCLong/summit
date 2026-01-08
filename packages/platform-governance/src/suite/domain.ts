import { z } from "zod";

export const canonicalModules = [
  "navigation-shell",
  "identity-and-accounts",
  "billing-entitlements",
  "data-spine",
  "admin-governance",
  "cross-sell-discovery",
  "integration-hub",
  "core-workflows",
] as const;

export type CanonicalModule = (typeof canonicalModules)[number];

export const canonicalFeatures = [
  "auth-flows",
  "rbac-abac",
  "scim",
  "metering",
  "proration",
  "audit-logging",
  "feature-flags",
  "cross-module-search",
  "command-palette",
  "onboarding-checklists",
  "data-quality-gates",
] as const;

export type CanonicalFeature = (typeof canonicalFeatures)[number];

const idRegex = /^[a-zA-Z0-9_-]{3,128}$/;

export const identifierSchema = z.string().regex(idRegex, "identifier must be 3-128 characters");

export const identifiersSchema = z.object({
  tenantId: identifierSchema,
  accountId: identifierSchema,
  orgId: identifierSchema,
  userId: identifierSchema,
  serviceAccountId: identifierSchema,
  workspaceId: identifierSchema,
  teamId: identifierSchema,
  roleId: identifierSchema,
  planId: identifierSchema,
  entitlementId: identifierSchema,
  resourceId: identifierSchema,
  eventId: identifierSchema,
});

export type Identifiers = z.infer<typeof identifiersSchema>;

export const canonicalNouns = [
  "tenant",
  "account",
  "user",
  "role",
  "group",
  "workspace",
  "module",
  "feature",
  "plan",
  "entitlement",
  "usage-meter",
  "invoice",
  "audit-entry",
  "event",
  "connector",
  "job",
  "flag",
] as const;

export type CanonicalNoun = (typeof canonicalNouns)[number];

export const boundedContexts = [
  "identity",
  "billing",
  "data-spine",
  "navigation",
  "admin-governance",
  "cross-sell",
  "application",
] as const;

export type BoundedContext = (typeof boundedContexts)[number];

export interface SystemOfRecord {
  context: BoundedContext;
  owns: CanonicalNoun[];
  interfaces: CanonicalModule[];
}

export const defaultSystemsOfRecord: SystemOfRecord[] = [
  {
    context: "identity",
    owns: ["user", "group", "role", "workspace", "tenant"],
    interfaces: ["identity-and-accounts", "navigation-shell", "admin-governance"],
  },
  {
    context: "billing",
    owns: ["plan", "entitlement", "usage-meter", "invoice"],
    interfaces: ["billing-entitlements", "integration-hub"],
  },
  {
    context: "data-spine",
    owns: ["event", "audit-entry", "connector"],
    interfaces: ["data-spine", "integration-hub", "core-workflows"],
  },
  {
    context: "navigation",
    owns: ["module", "feature", "flag"],
    interfaces: ["navigation-shell", "core-workflows"],
  },
  {
    context: "admin-governance",
    owns: ["job", "audit-entry", "flag"],
    interfaces: ["admin-governance", "integration-hub"],
  },
];

export interface GlossaryMapping {
  canonical: CanonicalNoun;
  aliases: string[];
}

export const glossaryMappings: GlossaryMapping[] = [
  { canonical: "workspace", aliases: ["project", "team-space"] },
  { canonical: "usage-meter", aliases: ["meter", "counter"] },
  { canonical: "connector", aliases: ["integration", "adapter"] },
];

export interface DomainVocabulary {
  modules: readonly CanonicalModule[];
  features: readonly CanonicalFeature[];
  nouns: readonly CanonicalNoun[];
  contexts: readonly BoundedContext[];
  systemsOfRecord: SystemOfRecord[];
  glossary: GlossaryMapping[];
}

export const domainVocabulary: DomainVocabulary = {
  modules: canonicalModules,
  features: canonicalFeatures,
  nouns: canonicalNouns,
  contexts: boundedContexts,
  systemsOfRecord: defaultSystemsOfRecord,
  glossary: glossaryMappings,
};

export function validateIdentifiers(input: unknown): Identifiers {
  return identifiersSchema.parse(input);
}

export function resolveSystemOfRecord(noun: CanonicalNoun): SystemOfRecord | undefined {
  return defaultSystemsOfRecord.find((sor) => sor.owns.includes(noun));
}
