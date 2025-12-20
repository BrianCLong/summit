import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'crypto';
import type {
  DecisionRequest,
  DecisionResponse,
  RarlClientOptions,
  SignedSnapshot,
  SnapshotData
} from './types';

function assertFetch(fetchImpl?: typeof fetch): asserts fetchImpl {
  if (!fetchImpl) {
    throw new Error('fetch is not available; provide fetchImpl in options');
  }
}

export class RarlClient {
  private readonly baseUrl: string;
  private readonly fetchImpl?: typeof fetch;

  constructor(options: RarlClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? (globalThis as any).fetch;
  }

  async requestDecision(payload: DecisionRequest): Promise<DecisionResponse['decision']> {
    const fetchImpl = this.fetchImpl;
    assertFetch(fetchImpl);

    const response = await fetchImpl(`${this.baseUrl}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`RARL decision rejected: ${response.status} ${text}`);
    }

    const body: DecisionResponse = await response.json();
    return body.decision;
  }

  async getSnapshot(tenantId: string): Promise<SignedSnapshot> {
    const fetchImpl = this.fetchImpl;
    assertFetch(fetchImpl);

    const response = await fetchImpl(`${this.baseUrl}/snapshot/${tenantId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`RARL snapshot request failed: ${response.status} ${text}`);
    }

    return (await response.json()) as SignedSnapshot;
  }

  static verifySnapshot(secret: string, signed: SignedSnapshot): boolean {
    return verifySnapshot(secret, signed.snapshot, signed.signature);
  }
}

export function verifySnapshot(secret: string, snapshot: SnapshotData, signature: string): boolean {
  const payload = Buffer.from(JSON.stringify(snapshot));
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest();
  const actual = Buffer.from(signature, 'base64');
  if (expected.length !== actual.length) {
    return false;
  }
  return nodeTimingSafeEqual(expected, actual);
}
