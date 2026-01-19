import {
  type PreflightObligation,
  type PreflightRequestContract
} from '../contracts/actions.js';

export { type PreflightObligation };

interface OpaSimulationResponse {
  result?: {
    allow?: boolean;
    allowed?: boolean;
    decision?: 'allow' | 'deny';
    reason?: string;
    obligations?: Array<Record<string, unknown>>;
    annotations?: Record<string, unknown>;
    redactions?: unknown;
  };
}

export interface PolicyDecisionResult {
  allow: boolean;
  reason?: string;
  obligations: PreflightObligation[];
  redactions: string[];
  raw: unknown;
}

export interface PolicySimulationService {
  simulate(input: PreflightRequestContract): Promise<PolicyDecisionResult>;
}

function normalizeObligations(
  result: OpaSimulationResponse['result']
): PreflightObligation[] {
  if (!result?.obligations || !Array.isArray(result.obligations)) {
    return [];
  }

  return result.obligations.map((obligation, index) => {
    const code =
      (typeof obligation.code === 'string' && obligation.code) ||
      (typeof obligation.type === 'string' && obligation.type) ||
      `obligation-${index + 1}`;
    const message =
      typeof obligation.message === 'string'
        ? obligation.message
        : typeof obligation.note === 'string'
          ? obligation.note
          : undefined;
    const targets = Array.isArray(obligation.targets)
      ? obligation.targets.filter((target) => typeof target === 'string')
      : Array.isArray(obligation.fields)
        ? obligation.fields.filter((field) => typeof field === 'string')
        : Array.isArray(obligation.redact)
          ? obligation.redact.filter((field) => typeof field === 'string')
          : undefined;

    return {
      code,
      message,
      targets
    };
  });
}

function normalizeRedactions(
  result: OpaSimulationResponse['result'],
  obligations: PreflightObligation[]
): string[] {
  const redactions = new Set<string>();
  const fromResult = Array.isArray(result?.redactions)
    ? result?.redactions
    : [];

  fromResult.forEach((item) => {
    if (typeof item === 'string') {
      redactions.add(item);
    }
  });

  obligations.forEach((obligation) => {
    if (obligation.code === 'redact' || obligation.code === 'mask') {
      obligation.targets?.forEach((target) => redactions.add(target));
    }
  });

  const annotations = result?.annotations;
  if (annotations && Array.isArray((annotations as any).redactions)) {
    (annotations as any).redactions
      .filter((value: unknown) => typeof value === 'string')
      .forEach((value: string) => redactions.add(value));
  }

  return [...redactions];
}

export class OpaPolicySimulationService implements PolicySimulationService {
  constructor(
    private readonly options: {
      endpoint?: string;
      fetchImpl?: typeof fetch;
    } = {}
  ) {}

  private get endpoint(): string {
    return (
      this.options.endpoint ||
      process.env.OPA_SIMULATION_ENDPOINT ||
      'http://localhost:8181/v1/data/actions/preflight'
    );
  }

  private get fetcher(): typeof fetch {
    return this.options.fetchImpl || fetch;
  }

  async simulate(input: PreflightRequestContract): Promise<PolicyDecisionResult> {
    const response = await this.fetcher(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input,
        simulate: true
      })
    });

    if (!response.ok) {
      throw new Error(
        `OPA simulation failed with status ${response.status} (${response.statusText})`
      );
    }

    const payload = (await response.json()) as OpaSimulationResponse;
    const result = payload.result || {};
    const obligations = normalizeObligations(payload.result);

    const allow =
      result.allow ??
      result.allowed ??
      (result.decision ? result.decision === 'allow' : false);

    return {
      allow: Boolean(allow),
      reason: result.reason,
      obligations,
      redactions: normalizeRedactions(payload.result, obligations),
      raw: payload
    };
  }
}
