export interface DecisionRequest {
  tenantId: string;
  actorId: string;
  kind: 'FlowStart' | 'ToolInvoke' | 'JobStart';
  resource: string;
  context?: Record<string, any>;
}

export interface DecisionResponse {
  decision: 'allow' | 'deny';
  reasons: string[];
  policyVersion: string;
  auditEventId: string;
}

export interface CompanyOSClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class CompanyOSClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(options: CompanyOSClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.COMPANYOS_BASE_URL || 'http://localhost:3000';
    this.apiKey = options.apiKey || process.env.COMPANYOS_API_KEY;
  }

  async decide(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/pdp/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`companyOS PDP call failed: ${response.statusText}`);
      }

      return await response.json() as DecisionResponse;
    } catch (error) {
      console.warn('companyOS PDP unreachable or error occurred:', error instanceof Error ? error.message : error);
      return {
        decision: 'allow',
        reasons: ['companyOS unreachable - fail-open advisory mode'],
        policyVersion: 'unknown',
        auditEventId: `fallback-${Date.now()}`,
      };
    }
  }
}
