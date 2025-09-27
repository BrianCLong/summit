import { Buffer } from 'buffer';
import { hash } from 'blake3';

export interface TenantCommitment {
  commitments: string[];
}

export interface OverlapProofRequest {
  tenantA: TenantCommitment;
  tenantB: TenantCommitment;
  circuitHint?: string;
  redTeam?: boolean;
}

export interface RedTeamReport {
  success: boolean;
  message: string;
}

export interface OverlapProofResponse {
  overlap: boolean;
  proof: string;
  circuit: string;
  proofSize: number;
  redTeamReport?: RedTeamReport;
}

export function pedersenMiMCStubCommitment(selector: string, salt: string): string {
  const prefix = Buffer.from('pedersen-mimc-stub');
  const payload = Buffer.concat([prefix, Buffer.from(salt), Buffer.from(selector)]);
  const digest = hash(payload);
  return Buffer.from(digest).toString('hex');
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ZkTxClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string, fetchImpl?: FetchLike) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    const globalFetch = (globalThis as unknown as { fetch?: FetchLike }).fetch;
    this.fetchImpl = fetchImpl ?? globalFetch;
    if (!this.fetchImpl) {
      throw new Error('fetch implementation required for ZkTxClient');
    }
  }

  async overlapProof(request: OverlapProofRequest): Promise<OverlapProofResponse> {
    const payload: Record<string, unknown> = {
      tenant_a: {
        commitments: request.tenantA.commitments.slice(),
      },
      tenant_b: {
        commitments: request.tenantB.commitments.slice(),
      },
    };

    if (request.circuitHint) {
      payload.circuit_hint = request.circuitHint;
    }

    if (typeof request.redTeam === 'boolean') {
      payload.red_team = request.redTeam;
    }

    const response = await this.fetchImpl(`${this.baseUrl}/overlap-proof`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`zk-tx-svc error: ${message}`);
    }

    const result = await response.json();

    const redTeamReport = result.red_team_report
      ? {
          success: Boolean(result.red_team_report.success),
          message: String(result.red_team_report.message),
        }
      : undefined;

    return {
      overlap: Boolean(result.overlap),
      proof: String(result.proof),
      circuit: String(result.circuit),
      proofSize: Number(result.proof_size),
      redTeamReport,
    };
  }
}

export function buildTenantCommitment(selectors: string[], tenantLabel: string): TenantCommitment {
  const commitments = selectors.map((selector, index) =>
    pedersenMiMCStubCommitment(selector, `${tenantLabel}-${index}`),
  );
  return { commitments };
}
