export function mapProvenance(claims: any[]): any {
  return claims.map(c => ({ ...c, mapped: true }));
}
