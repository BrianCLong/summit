export type PolicyContext = {
  tenant: string;
  region?: string;
  purpose?: string;
  sensitivity?: string;
  overrides?: Record<string, unknown>;
};

type ChatMessage = { role: string; content: string };

export type SummitClientOptions = {
  apiKey?: string;
  endpoint?: string;
};

export class SummitClient {
  private apiKey?: string;
  private endpoint?: string;

  constructor(opts: SummitClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.endpoint = opts.endpoint ?? "local";
  }

  model(name: string, policy?: PolicyContext) {
    const endpoint = this.endpoint;
    const apiKey = this.apiKey;
    return {
      chat: async (params: { messages: ChatMessage[]; context?: unknown; policy?: PolicyContext }) => {
        const payload = {
          model: name,
          ...params,
          policy: params.policy ?? policy,
        };
        // Minimal mock transport for v0.1
        return {
          text: `[mock:${name}] ${params.messages.at(-1)?.content ?? ""}`,
          endpoint,
          policy: payload.policy,
          apiKey: apiKey ? "provided" : "not-set",
        };
      },
    };
  }

  rag = {
    knowledgeBase: ({ profile }: { profile: string }) => ({
      retrieve: async (query: string, opts: { k?: number } = {}) => ({
        query,
        profile,
        k: opts.k ?? 5,
        passages: [{ content: `Mock passage for '${query}'`, score: 1.0 }],
      }),
    }),
  };
}

