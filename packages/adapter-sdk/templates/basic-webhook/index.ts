import { AdapterDefinition, AdapterRequest, AdapterResponse } from "@intelgraph/adapter-sdk";

export const definition: AdapterDefinition = {
  name: "webhook-sink",
  version: "0.1.0",
  capabilities: ["webhook"],
  requiredPermissions: ["adapter:webhook:emit"],
  lifecycle: {
    run: async (
      request: AdapterRequest<{ message: string }>
    ): Promise<AdapterResponse<{ delivered: boolean }>> => {
      // placeholder: a real implementation would POST to an external endpoint
      return {
        result: { delivered: true },
        durationMs: 0,
        retries: 0,
      };
    },
  },
};
