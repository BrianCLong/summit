import fetch from 'node-fetch';

export interface BedrockKnowledgeBaseQuery {
  queryText: string;
  topK: number;
  filters?: Record<string, unknown>;
}

export interface BedrockKnowledgeBaseResult {
  id: string;
  content: string;
  score: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface BedrockKnowledgeBaseResponse {
  results: BedrockKnowledgeBaseResult[];
}

export interface BedrockKnowledgeBaseTransport {
  retrieve(
    knowledgeBaseId: string,
    query: BedrockKnowledgeBaseQuery,
  ): Promise<BedrockKnowledgeBaseResponse>;
}

export interface BedrockKnowledgeBaseClientConfig {
  knowledgeBaseId: string;
  endpoint?: string;
  apiKey?: string;
  transport?: BedrockKnowledgeBaseTransport;
}

const redact = (value: string) => {
  if (!value) return value;
  return value.length <= 6
    ? '***'
    : `${value.slice(0, 2)}***${value.slice(-2)}`;
};

export class BedrockKnowledgeBaseClient {
  constructor(private readonly config: BedrockKnowledgeBaseClientConfig) {}

  async retrieve(query: BedrockKnowledgeBaseQuery): Promise<BedrockKnowledgeBaseResponse> {
    if (this.config.transport) {
      return this.config.transport.retrieve(this.config.knowledgeBaseId, query);
    }

    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error(
        'Bedrock Knowledge Base transport is not configured. Provide endpoint and apiKey or a transport implementation.',
      );
    }

    const response = await fetch(`${this.config.endpoint}/knowledge-bases/${this.config.knowledgeBaseId}/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        query: query.queryText,
        topK: query.topK,
        filters: query.filters ?? {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Bedrock Knowledge Base request failed (${response.status}): ${redact(errorText)}`,
      );
    }

    const payload = (await response.json()) as BedrockKnowledgeBaseResponse;
    return payload;
  }
}
