import { InfraArtifact } from "./registry";
import { FLAGS } from "./flags";

export function validateArtifact(artifact: InfraArtifact): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!artifact.name) {
    errors.push("Missing name");
  }

  if (!artifact.version) {
    errors.push("Missing version");
  }

  if (!artifact.owner || !artifact.owner.team) {
    errors.push("Missing owner or team");
  }

  if (FLAGS.INFRA_POLICY_ENFORCE) {
    if (!artifact.policy_profile) {
      errors.push("Unknown or missing policy profile");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
