export type SupportPolicyRule = {
  id: string;
  description: string;
  allowedRoles: string[];
  requiredPermissions: string[];
  requireJustification: boolean;
};

export const SUPPORT_IMPERSONATION_POLICY: SupportPolicyRule = {
  id: 'support-impersonation-v1',
  description: 'Allow support impersonation only for approved roles with explicit justification.',
  allowedRoles: ['ADMIN'],
  requiredPermissions: ['support:impersonate'],
  requireJustification: true,
};

export const SUPPORT_HEALTH_BUNDLE_POLICY: SupportPolicyRule = {
  id: 'support-tenant-health-bundle-v1',
  description: 'Allow tenant health bundle export for approved roles with explicit justification.',
  allowedRoles: ['ADMIN'],
  requiredPermissions: ['support:health:export'],
  requireJustification: true,
};

export const SUPPORT_BUNDLE_POLICY: SupportPolicyRule = {
  id: 'support-bundle-generate-v1',
  description: 'Allow support bundle generation for approved roles with explicit justification.',
  allowedRoles: ['ADMIN'],
  requiredPermissions: ['support:bundle:generate'],
  requireJustification: true,
};

export const SUPPORT_POLICIES = {
  impersonation: SUPPORT_IMPERSONATION_POLICY,
  tenantHealthBundle: SUPPORT_HEALTH_BUNDLE_POLICY,
  supportBundle: SUPPORT_BUNDLE_POLICY,
};

export const isRoleAllowed = (
  role: string | null | undefined,
  allowedRoles: string[],
): boolean => {
  if (!role) return false;
  return allowedRoles.some(
    (allowed) => allowed.toUpperCase() === role.toUpperCase(),
  );
};
