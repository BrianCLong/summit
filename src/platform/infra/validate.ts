import { InfraArtifact, InfraRegistry } from './registry';

export function validateArtifact(artifact: InfraArtifact): string[] {
  const errors: string[] = [];
  if (!artifact.name) {
    errors.push('Name is required');
  }
  if (!artifact.owner || !artifact.owner.team) {
    errors.push('Owner team is required');
  }
  if (!artifact.version) {
    errors.push('Version is required');
  }
  if (!artifact.kind || !['module', 'stack', 'consumption'].includes(artifact.kind)) {
    errors.push('Valid kind is required (module, stack, consumption)');
  }
  return errors;
}

export function validateRegistry(registry: InfraRegistry): string[] {
  const errors: string[] = [];
  if (registry.version !== 1) {
    errors.push('Registry version must be 1');
  }
  if (!registry.artifacts || !Array.isArray(registry.artifacts)) {
    errors.push('Registry must contain an array of artifacts');
  } else {
    for (const [index, artifact] of registry.artifacts.entries()) {
      const artifactErrors = validateArtifact(artifact);
      for (const err of artifactErrors) {
        errors.push(`Artifact at index ${index}: ${err}`);
      }
    }
  }
  return errors;
}
