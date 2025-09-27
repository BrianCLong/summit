import axios from 'axios';

const DEFAULT_POLICY_PATH =
  process.env.OPA_POLICY_PATH || '/v1/data/summit/tenant_abac/decision';

function opaUrl() {
  const base = process.env.OPA_URL || 'http://localhost:8181';
  return `${base}${DEFAULT_POLICY_PATH}`;
}

export interface SubjectContext {
  id: string;
  tenantId: string;
  roles: string[];
  assurance: string;
  purposeTags?: string[];
}

export interface ResourceContext {
  id: string;
  tenantId: string;
  type: string;
  classification?: string;
  containsPii?: boolean;
  purposeTags?: string[];
  retentionDays?: number | null;
}

export interface RequestContext {
  action: string;
  purposeTag: string;
  legalBasis: string;
  fields?: string[];
  justification?: string;
}

export interface PolicyDecision {
  allow: boolean;
  denied_reasons?: Record<string, unknown>;
  obligations?: Record<string, unknown>[];
}

export async function authorize(
  subject: SubjectContext,
  resource: ResourceContext,
  request: RequestContext,
): Promise<PolicyDecision> {
  try {
    const res = await axios.post(opaUrl(), {
      input: {
        subject: {
          id: subject.id,
          tenant_id: subject.tenantId,
          roles: subject.roles,
          assurance: subject.assurance,
          purpose_tags: subject.purposeTags || [],
        },
        resource: {
          id: resource.id,
          tenant_id: resource.tenantId,
          type: resource.type,
          classification: resource.classification,
          contains_pii: resource.containsPii || false,
          purpose_tags: resource.purposeTags || [],
          retention_days: resource.retentionDays,
        },
        request: {
          action: request.action,
          purpose_tag: request.purposeTag,
          legal_basis: request.legalBasis,
          fields: request.fields,
          justification: request.justification,
        },
      },
    });

    const result: PolicyDecision = res.data?.result ?? {
      allow: false,
      denied_reasons: { missing_result: true },
    };

    return result;
  } catch (error) {
    return {
      allow: false,
      denied_reasons: {
        opa_error: true,
        message:
          error instanceof Error ? error.message : 'OPA evaluation failed',
      },
    };
  }
}

export async function simulate(
  input: Record<string, unknown>,
): Promise<PolicyDecision> {
  try {
    const res = await axios.post(opaUrl(), { input });
    return res.data?.result as PolicyDecision;
  } catch (error) {
    return {
      allow: false,
      denied_reasons: {
        opa_error: true,
        message:
          error instanceof Error ? error.message : 'OPA simulation failed',
      },
    };
  }
}
