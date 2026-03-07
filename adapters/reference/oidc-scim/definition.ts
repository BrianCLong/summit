import type { ReferenceAdapterDefinition } from "../types";

export const oidcScimAdapter: ReferenceAdapterDefinition = {
  manifest: {
    name: "oidc-scim",
    title: "OIDC + SCIM Bridge",
    version: "0.1.0",
    description:
      "Reference adapter that maps OpenID Connect identities into SCIM resources for lifecycle operations.",
    maintainer: "Platform Reference Team",
    tags: ["identity", "sso", "provisioning"],
  },
  configSchema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["issuerUrl", "clientId", "clientSecret", "scimBaseUrl", "scimToken"],
    additionalProperties: false,
    properties: {
      issuerUrl: { type: "string", format: "uri" },
      clientId: { type: "string", minLength: 3 },
      clientSecret: { type: "string", minLength: 8 },
      scopes: {
        type: "array",
        items: { type: "string" },
        default: ["openid", "profile", "email"],
        minItems: 1,
      },
      scimBaseUrl: { type: "string", format: "uri" },
      scimToken: { type: "string", minLength: 16 },
      provisioningMode: {
        type: "string",
        enum: ["push", "pull"],
        default: "push",
      },
      deprovision: {
        type: "object",
        additionalProperties: false,
        properties: {
          mode: { type: "string", enum: ["soft", "hard"], default: "soft" },
          gracePeriodHours: { type: "number", minimum: 0, maximum: 720, default: 72 },
        },
        default: {},
      },
      filter: {
        type: "object",
        additionalProperties: false,
        properties: {
          includeDeactivated: { type: "boolean", default: false },
          userTypes: { type: "array", items: { type: "string" } },
        },
        default: {},
      },
    },
  },
  capabilities: [
    {
      id: "auth.oidc",
      title: "OIDC identity federation",
      description: "Performs OIDC discovery and token exchange for downstream provisioning.",
      inputs: ["authorization_code", "client_credentials"],
      outputs: ["id_token", "access_token", "refresh_token"],
      configUses: ["issuerUrl", "clientId", "clientSecret", "scopes"],
      guarantees: {
        auth: "OIDC-compliant token exchange",
        slaMsP99: 1200,
      },
    },
    {
      id: "provision.scim",
      title: "SCIM user+group provisioning",
      description: "Creates and updates users and groups in a downstream SCIM directory.",
      inputs: ["user_profile", "group_memberships"],
      outputs: ["scim_user", "scim_group"],
      configUses: ["scimBaseUrl", "scimToken", "provisioningMode"],
      guarantees: {
        slaMsP99: 1500,
        durability: "at-least-once upsert with idempotent keys",
      },
    },
    {
      id: "deprovision.scim",
      title: "SCIM deprovisioning",
      description: "Disables or deletes SCIM resources based on configuration.",
      inputs: ["user_profile"],
      outputs: ["scim_user"],
      configUses: ["deprovision"],
      guarantees: {
        slaMsP99: 2000,
      },
    },
  ],
  fixtures: {
    config: {
      issuerUrl: "https://login.example.com",
      clientId: "reference-summit",
      clientSecret: "demo-client-secret",
      scopes: ["openid", "profile", "email", "offline_access"],
      scimBaseUrl: "https://directory.example.com/scim/v2",
      scimToken: "demo-scim-pat-0000000000000000",
      provisioningMode: "push",
      deprovision: {
        mode: "soft",
        gracePeriodHours: 48,
      },
      filter: {
        includeDeactivated: false,
        userTypes: ["employee", "contractor"],
      },
    },
    samples: {
      userCreate: {
        userName: "ada.lovelace@example.com",
        name: { givenName: "Ada", familyName: "Lovelace" },
        active: true,
        emails: [{ value: "ada.lovelace@example.com", primary: true }],
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      },
      groupMemberships: {
        group: "engineering",
        members: ["ada.lovelace@example.com", "alan.turing@example.com"],
      },
    },
  },
};

export default oidcScimAdapter;
