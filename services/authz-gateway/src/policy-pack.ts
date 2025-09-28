export interface PolicyPack {
  groupRoleMap: Record<string, string[]>;
  purposeAllowList: Record<string, string[]>;
}

export const POLICY_PACK_V0: PolicyPack = {
  groupRoleMap: {
    'COS:Analyst': ['reader'],
    'COS:Investigator': ['reader', 'writer'],
    'COS:Lead': ['reader', 'writer'],
    'COS:Admin': ['admin', 'writer', 'reader'],
    'COS:Audit': ['auditor'],
  },
  purposeAllowList: {
    reader: ['investigation', 'threat-intel', 'fraud', 'training', 'demo'],
    writer: ['investigation', 'fraud'],
    admin: ['investigation', 'threat-intel', 'fraud', 'audit'],
    auditor: ['audit'],
  },
};

export function rolesForGroups(groups: string[]): string[] {
  const roles = new Set<string>();
  for (const group of groups) {
    const mapped = POLICY_PACK_V0.groupRoleMap[group];
    if (mapped) {
      for (const role of mapped) {
        roles.add(role);
      }
    }
  }
  return Array.from(roles);
}

export function isPurposeAllowed(roles: string[], purpose: string): boolean {
  if (!purpose) {
    return false;
  }
  for (const role of roles) {
    const allowed = POLICY_PACK_V0.purposeAllowList[role];
    if (allowed && allowed.includes(purpose)) {
      return true;
    }
  }
  return false;
}
