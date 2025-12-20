import axios, { AxiosInstance } from 'axios';
import nacl from 'tweetnacl';
import { createHash, createHmac, randomInt } from 'crypto';

const DEFAULT_BLOOM_M = 2048;
const DEFAULT_BLOOM_K = 3;

function laplaceNoise(scale: number): number {
  const u = (randomInt(1_000_000) + 0.5) / 1_000_000;
  const sign = u - 0.5 >= 0 ? 1 : -1;
  const magnitude = Math.log(Math.max(1 - 2 * Math.abs(u - 0.5), 1e-12));
  return -scale * sign * magnitude;
}

export interface NoisyAggregate {
  noisy_sum: number;
  noisy_count: number;
}

export interface SessionResult {
  mode: 'intersection' | 'aggregate';
  [key: string]: unknown;
}

export class SimpleBloom {
  private bits: Uint8Array;
  constructor(public readonly m = DEFAULT_BLOOM_M, public readonly k = DEFAULT_BLOOM_K) {
    this.bits = new Uint8Array(Math.ceil(m / 8));
  }

  insert(value: Uint8Array): void {
    for (let i = 0; i < this.k; i += 1) {
      const hash = computeHash(value, i);
      const index = Number(hash % BigInt(this.m));
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bits[byteIndex] |= 1 << bitIndex;
    }
  }

  encode(): { m: number; k: number; bits: string } {
    return {
      m: this.m,
      k: this.k,
      bits: Buffer.from(this.bits).toString('base64'),
    };
  }
}

function computeHash(value: Uint8Array, salt: number): bigint {
  const h = createHash('sha256');
  h.update(value);
  h.update(Buffer.from([salt]));
  return BigInt('0x' + h.digest('hex'));
}

export class SafeJoinParticipant {
  private readonly secretKey: Uint8Array;
  readonly publicKeyB64: string;

  constructor() {
    const secret = nacl.randomBytes(32);
    this.secretKey = secret;
    const publicKey = nacl.scalarMult.base(secret);
    this.publicKeyB64 = Buffer.from(publicKey).toString('base64');
  }

  deriveSharedSecret(peerPublicKey: string): Uint8Array {
    const peer = Buffer.from(peerPublicKey, 'base64');
    return nacl.scalarMult(this.secretKey, peer);
  }

  hashTokens(sharedSecret: Uint8Array, keys: string[]): string[] {
    return keys.map((key) => {
      const mac = createHmac('sha256', Buffer.from(sharedSecret));
      mac.update(Buffer.from(key, 'utf8'));
      return mac.digest('base64');
    });
  }

  aggregatesWithNoise(tokens: string[], values: number[], epsilon: number): Record<string, NoisyAggregate> {
    const scale = 1 / Math.max(epsilon, 1e-6);
    const aggregates: Record<string, NoisyAggregate> = {};
    tokens.forEach((token, idx) => {
      const existing = aggregates[token] ?? { noisy_sum: 0, noisy_count: 0 };
      existing.noisy_sum += values[idx] + laplaceNoise(scale);
      existing.noisy_count += 1 + laplaceNoise(scale);
      aggregates[token] = existing;
    });
    return aggregates;
  }
}

export class SafeJoinClient {
  private readonly http: AxiosInstance;

  constructor(private readonly baseUrl: string, instance?: AxiosInstance) {
    this.http = instance ?? axios.create({ baseURL: baseUrl });
  }

  async createSession(mode: 'intersection_only' | 'aggregate', opts: { expectedParticipants?: number; epsilon?: number; faultProbability?: number } = {}): Promise<string> {
    const payload: Record<string, unknown> = {
      expected_participants: opts.expectedParticipants ?? 2,
      fault_probability: opts.faultProbability,
      mode: mode === 'aggregate'
        ? { mode: 'aggregate', epsilon: opts.epsilon ?? 1.0 }
        : { mode: 'intersection_only' },
    };
    const { data } = await this.http.post('/sessions', payload);
    return data.session_id as string;
  }

  async register(sessionId: string, participantId: string, publicKey: string): Promise<string | undefined> {
    const { data } = await this.http.post(`/sessions/${sessionId}/register`, {
      participant_id: participantId,
      public_key: publicKey,
    });
    return data.peer_public_key as string | undefined;
  }

  async waitForPeer(sessionId: string, participantId: string, timeoutMs = 30_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await this.http.get(`/sessions/${sessionId}/peer`, {
        params: { participant_id: participantId },
        validateStatus: () => true,
      });
      if (response.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      if (response.status >= 200 && response.status < 300) {
        return response.data.peer_public_key as string;
      }
      throw new Error(`peer lookup failed: ${response.status}`);
    }
    throw new Error('peer not available before timeout');
  }

  async upload(sessionId: string, payload: { participant_id: string; hashed_tokens: string[]; bloom_filter: ReturnType<SimpleBloom['encode']>; aggregates?: Record<string, NoisyAggregate> }): Promise<void> {
    await this.http.post(`/sessions/${sessionId}/upload`, payload);
  }

  async fetchResult(sessionId: string): Promise<SessionResult> {
    const { data } = await this.http.get(`/sessions/${sessionId}/result`);
    return data as SessionResult;
  }
}

export function preparePayload(participant: SafeJoinParticipant, peerPublicKey: string, records: Array<{ key: string; value: number }>, epsilon?: number): {
  tokens: string[];
  bloom: SimpleBloom;
  aggregates?: Record<string, NoisyAggregate>;
} {
  const secret = participant.deriveSharedSecret(peerPublicKey);
  const tokens = participant.hashTokens(secret, records.map((r) => r.key));
  const bloom = new SimpleBloom();
  tokens.forEach((token) => bloom.insert(Buffer.from(token, 'base64')));
  let aggregates: Record<string, NoisyAggregate> | undefined;
  if (epsilon !== undefined) {
    aggregates = participant.aggregatesWithNoise(tokens, records.map((r) => r.value), epsilon);
  }
  return { tokens, bloom, aggregates };
}
