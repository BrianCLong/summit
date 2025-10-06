export interface ProviderAttachment {
  mime: string;
  bytesB64: string;
}

export interface ProviderResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  citations?: Array<{ url: string; title?: string }>;
}
