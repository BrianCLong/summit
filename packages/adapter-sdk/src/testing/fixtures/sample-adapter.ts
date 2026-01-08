import { AdapterContext, AdapterEvent, AdapterResponse, AdapterRuntime } from "../../types.js";

const adapter: AdapterRuntime = {
  metadata: {
    name: "sample-basic-webhook",
    version: "0.1.0",
    description: "Sample adapter used for contract harness validation",
    capabilities: ["webhook"],
  },
  async handleEvent(event: AdapterEvent, context: AdapterContext): Promise<AdapterResponse> {
    const payload = typeof event.payload === "object" && event.payload ? event.payload : {};
    const message = "Prepared webhook payload with contextual authentication headers";

    return {
      status: "ok",
      message,
      data: {
        target: (payload as { url?: string }).url ?? "https://example.test/webhook",
        method: (payload as { method?: string }).method ?? "POST",
        body: (payload as { body?: unknown }).body ?? { ping: true },
        headers: context.secrets?.authToken
          ? { Authorization: `Bearer ${context.secrets.authToken}` }
          : {},
      },
    };
  },
};

export default adapter;
