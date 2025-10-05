export type RecordStatus = 'pending' | 'completed' | 'failed' | 'expired';
export type VerificationStatus =
  | 'accepted'
  | 'duplicate'
  | 'conflict'
  | 'expired'
  | 'completed'
  | 'failed';

export interface IssueRequest {
  tenant: string;
  action: string;
  resource: string;
  ttlSeconds?: number;
  issuedBy?: string;
  metadata?: unknown;
}

export interface IssueResponse {
  idempotencyKey: string;
  expiresAt: string;
  status: RecordStatus;
}

export interface VerifyRequest {
  tenant: string;
  action: string;
  resource: string;
  idempotencyKey: string;
  fingerprint?: string;
  participant?: string;
  dedupeToken?: string;
}

export interface VerifyResponse {
  status: VerificationStatus;
  dedupeCount: number;
  expiresAt: string;
  lastSeen: string;
  conflictReason?: string;
  replayHint?: string;
  result?: unknown;
  journal: JournalEntry[];
}

export interface CompleteRequest {
  tenant: string;
  action: string;
  resource: string;
  idempotencyKey: string;
  participant?: string;
  success: boolean;
  result?: unknown;
  note?: string;
}

export interface CompleteResponse {
  status: RecordStatus;
  result?: unknown;
  journal: JournalEntry[];
}

export interface JournalEntry {
  timestamp: string;
  participant?: string;
  event: JournalEvent;
  note?: string;
  fingerprint?: string;
  dedupeCount: number;
  details?: unknown;
}

export type JournalEvent =
  | 'issued'
  | 'verified'
  | 'completed'
  | 'failed'
  | 'conflict'
  | 'expired';

export interface RecordView {
  status: RecordStatus;
  tenant: string;
  action: string;
  resource: string;
  fingerprint?: string;
  dedupeCount: number;
  createdAt: string;
  lastSeen: string;
  expiresAt: string;
  conflictReason?: string;
  result?: unknown;
  journal: JournalEntry[];
}

export class CsiksError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface CsiksClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

const jsonHeaders = { 'content-type': 'application/json' } as const;

export class CsiksClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CsiksClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.headers = { ...options.headers };
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async issueKey(request: IssueRequest): Promise<IssueResponse> {
    const response = await this.request('/keys/issue', {
      method: 'POST',
      body: JSON.stringify(toIssueWire(request)),
      headers: { ...jsonHeaders },
    });
    return fromIssueWire(await response.json());
  }

  async verifyKey(request: VerifyRequest): Promise<VerifyResponse> {
    const response = await this.request('/keys/verify', {
      method: 'POST',
      body: JSON.stringify(toVerifyWire(request)),
      headers: { ...jsonHeaders },
    });
    return fromVerifyWire(await response.json());
  }

  async completeKey(request: CompleteRequest): Promise<CompleteResponse> {
    const response = await this.request('/keys/complete', {
      method: 'POST',
      body: JSON.stringify(toCompleteWire(request)),
      headers: { ...jsonHeaders },
    });
    return fromCompleteWire(await response.json());
  }

  async getRecord(id: string): Promise<RecordView> {
    const response = await this.request(`/keys/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    return fromRecordWire(await response.json());
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) },
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      let details: unknown;
      try {
        details = await response.clone().json();
        if (details && typeof details === 'object' && 'error' in (details as Record<string, unknown>)) {
          message = (details as Record<string, string>).error ?? message;
        }
      } catch {
        // swallow json errors - we keep default message
      }
      throw new CsiksError(response.status, message, details);
    }

    return response;
  }
}

interface IssueWireRequest {
  tenant: string;
  action: string;
  resource: string;
  ttl_seconds?: number;
  issued_by?: string;
  metadata?: unknown;
}

interface IssueWireResponse {
  idempotency_key: string;
  expires_at: string;
  status: RecordStatus;
}

interface VerifyWireRequest {
  tenant: string;
  action: string;
  resource: string;
  idempotency_key: string;
  fingerprint?: string;
  participant?: string;
  dedupe_token?: string;
}

interface VerifyWireResponse {
  status: VerificationStatus;
  dedupe_count: number;
  expires_at: string;
  last_seen: string;
  conflict_reason?: string;
  replay_hint?: string;
  result?: unknown;
  journal: JournalWireEntry[];
}

interface CompleteWireRequest {
  tenant: string;
  action: string;
  resource: string;
  idempotency_key: string;
  participant?: string;
  success: boolean;
  result?: unknown;
  note?: string;
}

interface CompleteWireResponse {
  status: RecordStatus;
  result?: unknown;
  journal: JournalWireEntry[];
}

interface RecordWireView {
  status: RecordStatus;
  tenant: string;
  action: string;
  resource: string;
  fingerprint?: string;
  dedupe_count: number;
  created_at: string;
  last_seen: string;
  expires_at: string;
  conflict_reason?: string;
  result?: unknown;
  journal: JournalWireEntry[];
}

interface JournalWireEntry {
  timestamp: string;
  participant?: string;
  event: JournalEvent;
  note?: string;
  fingerprint?: string;
  dedupe_count: number;
  details?: unknown;
}

const toIssueWire = (req: IssueRequest): IssueWireRequest => ({
  tenant: req.tenant,
  action: req.action,
  resource: req.resource,
  ttl_seconds: req.ttlSeconds,
  issued_by: req.issuedBy,
  metadata: req.metadata,
});

const toVerifyWire = (req: VerifyRequest): VerifyWireRequest => ({
  tenant: req.tenant,
  action: req.action,
  resource: req.resource,
  idempotency_key: req.idempotencyKey,
  fingerprint: req.fingerprint,
  participant: req.participant,
  dedupe_token: req.dedupeToken,
});

const toCompleteWire = (req: CompleteRequest): CompleteWireRequest => ({
  tenant: req.tenant,
  action: req.action,
  resource: req.resource,
  idempotency_key: req.idempotencyKey,
  participant: req.participant,
  success: req.success,
  result: req.result,
  note: req.note,
});

const fromIssueWire = (res: IssueWireResponse): IssueResponse => ({
  idempotencyKey: res.idempotency_key,
  expiresAt: res.expires_at,
  status: res.status,
});

const fromVerifyWire = (res: VerifyWireResponse): VerifyResponse => ({
  status: res.status,
  dedupeCount: res.dedupe_count,
  expiresAt: res.expires_at,
  lastSeen: res.last_seen,
  conflictReason: res.conflict_reason,
  replayHint: res.replay_hint,
  result: res.result,
  journal: res.journal.map(fromJournalWire),
});

const fromCompleteWire = (res: CompleteWireResponse): CompleteResponse => ({
  status: res.status,
  result: res.result,
  journal: res.journal.map(fromJournalWire),
});

const fromRecordWire = (res: RecordWireView): RecordView => ({
  status: res.status,
  tenant: res.tenant,
  action: res.action,
  resource: res.resource,
  fingerprint: res.fingerprint,
  dedupeCount: res.dedupe_count,
  createdAt: res.created_at,
  lastSeen: res.last_seen,
  expiresAt: res.expires_at,
  conflictReason: res.conflict_reason,
  result: res.result,
  journal: res.journal.map(fromJournalWire),
});

const fromJournalWire = (entry: JournalWireEntry): JournalEntry => ({
  timestamp: entry.timestamp,
  participant: entry.participant,
  event: entry.event,
  note: entry.note,
  fingerprint: entry.fingerprint,
  dedupeCount: entry.dedupe_count,
  details: entry.details,
});
