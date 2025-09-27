export interface CreateRequestPayload {
  requester: string;
  tool: string;
  purpose: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface RequestRecord {
  id: string;
  requester: string;
  tool: string;
  purpose: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'denied';
  approvals: Record<string, string>;
  denials: Record<string, string>;
  tokenId?: string;
}

export interface TokenRecord {
  id: string;
  requestId: string;
  parentId?: string;
  scopes: string[];
  expiresAt: string;
  issuedAt: string;
  secret: string;
}

export interface AttenuatePayload {
  scopes?: string[];
  expiresAt?: string;
}

export class QsetClient {
  constructor(private readonly baseUrl: string, private readonly approverKey?: string) {}

  async createRequest(payload: CreateRequestPayload): Promise<RequestRecord> {
    return this.post<RequestRecord>('/requests', payload);
  }

  async getRequest(id: string): Promise<RequestRecord> {
    return this.get<RequestRecord>(`/requests/${id}`);
  }

  async approveRequest(id: string, approverKey?: string): Promise<RequestRecord> {
    return this.post<RequestRecord>(`/requests/${id}/approve`, undefined, approverKey);
  }

  async denyRequest(id: string, approverKey?: string): Promise<RequestRecord> {
    return this.post<RequestRecord>(`/requests/${id}/deny`, undefined, approverKey);
  }

  async mintToken(id: string, approverKey?: string): Promise<TokenRecord> {
    return this.post<TokenRecord>(`/requests/${id}/mint`, undefined, approverKey);
  }

  async attenuateToken(id: string, payload: AttenuatePayload, approverKey?: string): Promise<TokenRecord> {
    return this.post<TokenRecord>(`/tokens/${id}/attenuate`, payload, approverKey);
  }

  async getLedgerPublicKey(): Promise<string> {
    const response = await this.get<{ publicKey: string }>('/ledger/public-key');
    return response.publicKey;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(this.baseUrl + path, {
      headers: this.headers(),
    });
    if (!response.ok) {
      throw this.error(response);
    }
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body?: unknown, approverKey?: string): Promise<T> {
    const headers = this.headers(approverKey);
    const response = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw this.error(response);
    }
    return (await response.json()) as T;
  }

  private headers(approverKey?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const key = approverKey ?? this.approverKey;
    if (key) {
      headers['X-Approver-Key'] = key;
    }
    return headers;
  }

  private error(response: Response): Error {
    return new Error(`QSET request failed: ${response.status}`);
  }
}
