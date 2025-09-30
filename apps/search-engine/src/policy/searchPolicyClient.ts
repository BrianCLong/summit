import type { AdvancedSearchInput, AuthContext, SearchPolicyEvaluationRequest } from '../graphql/resolvers';

export interface SearchPolicyDecision {
  allow: boolean;
  reason?: string;
}

export class SearchPolicyClient {
  private readonly baseUrl: string;
  private readonly policyPath: string;
  private readonly failOpen: boolean;

  constructor() {
    this.baseUrl = (process.env.OPA_URL || 'http://localhost:8181/v1/data').replace(/\/$/, '');
    this.policyPath = (process.env.OPA_SEARCH_POLICY_PATH || 'search/filters').replace(/^\//, '');
    this.failOpen = process.env.OPA_FAIL_OPEN === 'true';
  }

  async allowFilters(request: SearchPolicyEvaluationRequest): Promise<SearchPolicyDecision> {
    const payload = this.buildInput(request.filters, request.tenantId, request.auth);
    const url = `${this.baseUrl}/${this.policyPath}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: payload }),
      });

      if (!response.ok) {
        throw new Error(`OPA responded with status ${response.status}`);
      }

      const body = await response.json();
      const allow = Boolean(body.result?.allow ?? body.result === true);
      const reason = typeof body.result?.reason === 'string' ? body.result.reason : undefined;
      return { allow, reason };
    } catch (error) {
      if (this.failOpen) {
        return { allow: true, reason: (error as Error).message };
      }
      return { allow: false, reason: (error as Error).message };
    }
  }

  private buildInput(filters: AdvancedSearchInput, tenantId: string, auth?: AuthContext) {
    return {
      action: 'search',
      tenant_id: tenantId,
      filters: {
        tenant_id: filters.tenantId,
        node_types: filters.nodeTypes ?? [],
        statuses: filters.statuses ?? [],
        date_range: filters.dateRange
          ? {
              from: filters.dateRange.from ?? undefined,
              to: filters.dateRange.to ?? undefined,
            }
          : null,
        min_relevance: filters.minRelevance ?? null,
      },
      context: {
        tenant_id: auth?.tenantId ?? tenantId,
        user_id: auth?.userId,
        roles: auth?.roles ?? [],
        allowed_node_types: auth?.allowedNodeTypes ?? [],
      },
    };
  }
}

export const searchPolicyClient = new SearchPolicyClient();
