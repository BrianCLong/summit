import { AdapterDefinition, AdapterRequest, AdapterResponse } from "@intelgraph/adapter-sdk";

export const definition: AdapterDefinition = {
  name: "reference-s3-storage",
  version: "0.1.0",
  capabilities: ["export"],
  requiredPermissions: ["adapter:storage:write"],
  claims: ["storage:s3"],
  lifecycle: {
    run: async (
      request: AdapterRequest<{ objectKey: string; payload: unknown }>
    ): Promise<AdapterResponse<{ stored: boolean }>> => {
      // Stub: real implementation would PUT to S3-compatible storage.
      return {
        result: { stored: true },
        durationMs: 0,
        retries: 0,
      };
    },
  },
};
