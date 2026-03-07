export function reviewTouchedPaths(touchedPaths: string[], allowlist: string[]) {
  const violations = touchedPaths.filter(
    (p) => !allowlist.some((prefix) => p.startsWith(prefix))
  );

  return {
    passed: violations.length === 0,
    violations,
    warnings: [],
    touched_paths: touchedPaths,
    blast_radius: violations.length > 0 ? "high" : "low"
  };
}
