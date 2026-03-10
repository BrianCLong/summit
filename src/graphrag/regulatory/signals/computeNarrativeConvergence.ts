<<<<<<< HEAD
export function computeNarrativeConvergence(narratives: string[]): number {
  // Collapse duplicate narratives
  const unique = new Set(narratives);
  if (narratives.length === 0) return 0;
  return 1 - (unique.size / narratives.length);
=======
export function computeNarrativeConvergence(narratives: string[]) {
  return narratives.length > 0 ? 1 : 0;
>>>>>>> origin/main
}
