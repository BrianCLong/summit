import path from 'path';

export function validateArtifactId(artifactId: string | undefined | null): boolean {
  if (!artifactId) return true;

  // Ensure it is a simple filename with no path components
  return path.basename(artifactId) === artifactId;
}
