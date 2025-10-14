export interface ClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface DecisionRequest {
  subjectId: string;
  action: string;
  resourceId?: string;
  resource?: Record<string, unknown>;
  context?: { currentAcr?: string };
}

export interface DecisionObligation {
  type: string;
  required_acr?: string;
  mechanism?: string;
  [key: string]: unknown;
}

export interface DecisionResponse {
  allow: boolean;
  reason: string;
  obligations: DecisionObligation[];
}

export interface SubjectAttributesResponse<T = unknown> {
  data: T;
  schema: Record<string, string>;
}

function buildHeaders(options: ClientOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  return headers;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) {
    return promise;
  }
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('request_timeout')), timeoutMs);
    }),
  ]);
}

export class ABACClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs?: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  async isAllowed(request: DecisionRequest): Promise<DecisionResponse> {
    const response = await withTimeout(
      this.fetchImpl(`${this.baseUrl}/authorize`, {
        method: 'POST',
        headers: buildHeaders({ baseUrl: this.baseUrl, token: this.token }),
        body: JSON.stringify({
          subject: { id: request.subjectId },
          action: request.action,
          resource: request.resourceId
            ? { id: request.resourceId, ...(request.resource || {}) }
            : request.resource || {},
          context: request.context,
        }),
      }),
      this.timeoutMs,
    );
    if (!response.ok) {
      throw new Error(`authorize_failed_${response.status}`);
    }
    const payload = await response.json();
    return {
      allow: Boolean(payload.allow),
      reason: String(payload.reason || (payload.allow ? 'allow' : 'deny')),
      obligations: Array.isArray(payload.obligations) ? payload.obligations : [],
    };
  }

  async getSubjectAttributes<T = unknown>(
    subjectId: string,
    options: { refresh?: boolean } = {},
  ): Promise<SubjectAttributesResponse<T>> {
    const url = new URL(`${this.baseUrl}/subject/${subjectId}/attributes`);
    if (options.refresh) {
      url.searchParams.set('refresh', 'true');
    }
    const response = await withTimeout(
      this.fetchImpl(url.toString(), {
        method: 'GET',
        headers: buildHeaders({ baseUrl: this.baseUrl, token: this.token }),
      }),
      this.timeoutMs,
    );
    if (!response.ok) {
      throw new Error(`attributes_failed_${response.status}`);
    }
    return response.json();
  }
}
