import { AdapterDefinition, AdapterRequest, AdapterResponse } from "@intelgraph/adapter-sdk";

export const definition: AdapterDefinition = {
  name: "reference-oidc-scim",
  version: "0.1.0",
  capabilities: ["identity"],
  requiredPermissions: ["adapter:identity:sync"],
  claims: ["oidc", "scim"],
  lifecycle: {
    run: async (
      request: AdapterRequest<{ userId: string; action: "provision" | "deprovision" }>
    ): Promise<AdapterResponse<{ success: boolean }>> => {
      // Stub: real implementation would call SCIM APIs using OIDC tokens.
      return {
        result: { success: true },
        durationMs: 0,
        retries: 0,
      };
    },
  },
};
