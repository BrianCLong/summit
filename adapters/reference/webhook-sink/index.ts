import { AdapterDefinition, AdapterRequest, AdapterResponse } from "@intelgraph/adapter-sdk";

export const definition: AdapterDefinition = {
  name: "reference-webhook-sink",
  version: "0.1.0",
  capabilities: ["webhook"],
  requiredPermissions: ["adapter:webhook:emit"],
  lifecycle: {
    run: async (
      request: AdapterRequest<{ message: string }>
    ): Promise<AdapterResponse<{ delivered: boolean }>> => {
      // Stub: real implementation would POST to the configured endpoint.
      return {
        result: { delivered: true },
        durationMs: 0,
        retries: 0,
      };
    },
  },
};
