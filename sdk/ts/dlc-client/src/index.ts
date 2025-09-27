export type RowScope =
  | { kind: "all" }
  | { kind: "explicit"; rows: string[] };

export interface LeaseSpec {
  datasetId: string;
  purposes: string[];
  rowScope: RowScope;
  expiry: string;
  revocationHook?: string;
}

export interface LeaseRecord {
  id: string;
  spec: LeaseSpecWire;
  parent?: string | null;
  issued_at: string;
  revoked_at?: string | null;
  closed_at?: string | null;
  accesses: AccessLogEntry[];
  receipt?: ComplianceReceipt | null;
}

export interface LeaseSpecWire {
  dataset_id: string;
  purposes: string[];
  row_scope: RowScope;
  expiry: string;
  revocation_hook?: string | null;
}

export interface AccessLogEntry {
  lease_id: string;
  dataset_id: string;
  row_id: string;
  accessed_at: string;
}

export interface ComplianceReceipt {
  lease_id: string;
  dataset_id: string;
  purposes: string[];
  accessed_rows: string[];
  total_accesses: number;
  opened_at: string;
  closed_at: string;
}

export interface DlcClientOptions {
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export class DlcClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly headers: Record<string, string>;

  constructor(baseUrl: string, options: DlcClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchFn = options.fetch ?? fetch;
    this.headers = {
      "content-type": "application/json",
      ...options.headers,
    };
  }

  async createLease(spec: LeaseSpec): Promise<LeaseRecord> {
    return this.request<LeaseRecord>("/leases", {
      method: "POST",
      body: JSON.stringify(toWireSpec(spec)),
    });
  }

  async attenuate(parentId: string, spec: LeaseSpec): Promise<LeaseRecord> {
    return this.request<LeaseRecord>(`/leases/${parentId}/attenuate`, {
      method: "POST",
      body: JSON.stringify(toWireSpec(spec)),
    });
  }

  async recordAccess(leaseId: string, rowId: string): Promise<AccessLogEntry> {
    return this.request<AccessLogEntry>(`/leases/${leaseId}/access`, {
      method: "POST",
      body: JSON.stringify({ row_id: rowId }),
    });
  }

  async closeLease(leaseId: string): Promise<ComplianceReceipt> {
    return this.request<ComplianceReceipt>(`/leases/${leaseId}/close`, {
      method: "POST",
    });
  }

  async revokeLease(leaseId: string, reason?: string): Promise<void> {
    await this.request<void>(`/leases/${leaseId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async listLeases(): Promise<LeaseRecord[]> {
    return this.request<LeaseRecord[]>("/leases", { method: "GET" });
  }

  async getLease(leaseId: string): Promise<LeaseRecord> {
    return this.request<LeaseRecord>(`/leases/${leaseId}`, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: this.headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new HttpError(response.status, text || response.statusText, text);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

function toWireSpec(spec: LeaseSpec): LeaseSpecWire {
  return {
    dataset_id: spec.datasetId,
    purposes: spec.purposes,
    row_scope: spec.rowScope,
    expiry: spec.expiry,
    revocation_hook: spec.revocationHook ?? null,
  };
}
