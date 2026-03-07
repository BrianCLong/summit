import {
  AdapterContext,
  AdapterEvent,
  AdapterResponse,
  AdapterRuntime,
} from "@intelgraph/adapter-sdk";

const adapter: AdapterRuntime = {
  metadata: {
    name: "basic-webhook-adapter",
    version: "0.1.0",
    description: "Example webhook adapter generated from the adapter-sdk template",
    capabilities: ["webhook"],
  },
  async handleEvent(event: AdapterEvent, context: AdapterContext): Promise<AdapterResponse> {
    const payload = event.payload as {
      url?: string;
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    };

    const targetUrl = payload.url ?? "https://example.test/webhook";
    const method = payload.method ?? "POST";
    const headers = {
      "Content-Type": "application/json",
      ...(payload.headers ?? {}),
      ...(context.secrets?.authToken
        ? { Authorization: `Bearer ${context.secrets.authToken}` }
        : {}),
    };

    return {
      status: "ok",
      message: "Webhook payload prepared",
      data: {
        url: targetUrl,
        method,
        headers,
        body: payload.body ?? { ping: true },
        metadata: {
          requestId: context.requestId,
          environment: context.environment ?? "local",
        },
      },
    };
  },
};

export default adapter;
