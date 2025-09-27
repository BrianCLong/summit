import { log } from './audit';
import {
  authorize,
  PolicyDecision,
  RequestContext,
  ResourceContext,
  SubjectContext,
} from './policy';

export interface SCIMTenantExtension {
  tenantId: string;
  defaultRole: string;
  purposeTags: string[];
}

export interface SCIMUser {
  id: string;
  userName: string;
  active: boolean;
  emails?: { value: string; primary?: boolean }[];
  groups?: { value: string }[];
  schemas: string[];
  'urn:ietf:params:scim:schemas:extension:intelgraph:1.0:tenant': SCIMTenantExtension;
}

export interface ProvisioningResult extends PolicyDecision {
  userId: string;
  tenantId: string;
}

const ALLOWED_PURPOSES = new Set(['investigation', 'fraud', 'audit', 'support']);

function deriveSubject(scimUser: SCIMUser): SubjectContext {
  const extension =
    scimUser['urn:ietf:params:scim:schemas:extension:intelgraph:1.0:tenant'];

  const roles = new Set<string>();
  if (extension?.defaultRole) {
    roles.add(extension.defaultRole);
  }
  for (const group of scimUser.groups || []) {
    if (group.value) {
      roles.add(group.value.replace('tenant:', '').split(':').pop() || '');
    }
  }

  return {
    id: scimUser.id || scimUser.userName,
    tenantId: extension?.tenantId,
    roles: Array.from(roles).filter(Boolean),
    assurance: scimUser.active ? 'loa2' : 'loa1',
    purposeTags: extension?.purposeTags ?? [],
  };
}

function ensurePurposeTags(purposeTags: string[]): string[] {
  const cleaned = new Set<string>();
  for (const tag of purposeTags) {
    if (!tag) continue;
    cleaned.add(tag.toLowerCase());
  }

  if (cleaned.size === 0) {
    cleaned.add('investigation');
  }

  for (const tag of cleaned) {
    if (!ALLOWED_PURPOSES.has(tag)) {
      throw new Error(`unsupported_purpose_tag:${tag}`);
    }
  }

  return Array.from(cleaned);
}

export async function processProvisioning(
  scimUser: SCIMUser,
  action: 'create' | 'update' | 'delete',
): Promise<ProvisioningResult> {
  const extension =
    scimUser['urn:ietf:params:scim:schemas:extension:intelgraph:1.0:tenant'];

  if (!extension?.tenantId) {
    throw new Error('missing_tenant_id');
  }

  const subject = deriveSubject(scimUser);
  subject.purposeTags = ensurePurposeTags(subject.purposeTags || []);

  const request: RequestContext = {
    action: `identity:${action}`,
    purposeTag: subject.purposeTags[0],
    legalBasis: 'contract',
    fields: ['userName', 'roles', 'purposeTags'],
    justification: 'scim_provisioning_flow',
  };

  const resource: ResourceContext = {
    id: scimUser.id || scimUser.userName,
    tenantId: extension.tenantId,
    type: 'identity_profile',
    classification: 'confidential',
    containsPii: true,
    purposeTags: subject.purposeTags,
    retentionDays: 30,
  };

  const decision = await authorize(subject, resource, request);

  await log({
    subject: subject.id,
    action: request.action,
    resource: resource.id,
    tenantId: resource.tenantId,
    allowed: decision.allow,
    reason: decision.allow ? 'scim_allow' : 'scim_policy_deny',
  });

  return { ...decision, userId: subject.id, tenantId: resource.tenantId };
}
