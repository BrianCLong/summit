export function riskyDelta(prev: any, next: any) {
  const added = next.packages.filter(
    (p: any) => !prev.packages.some((q: any) => q.purl === p.purl),
  );
  return added.filter(
    (p: any) =>
      p.license?.match(/GPL|AGPL/i) || p.vuln?.severity === 'critical',
  );
}
