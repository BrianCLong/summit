export function mapClaimsToAttributes(claims: any) {
  const roles: string[] = [];
  const groups: string[] = claims.groups || [];
  if (groups.includes('IntelGraph-Analyst')) roles.push('analyst');
  if (groups.includes('IntelGraph-Admin')) roles.push('admin');
  return { roles, attrs: { dept: claims.department, clearance: claims.clearance } };
}
