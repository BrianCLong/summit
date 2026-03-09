import { canonicalizeJson } from '../utils/canonical-json';

export interface DeterminismCheckResult {
  isDeterministic: boolean;
  violations: string[];
}

export function checkArtifactDeterminism(artifact: any): DeterminismCheckResult {
  const violations: string[] = [];

  // Convert to canonical JSON string
  const jsonStr = canonicalizeJson(artifact);

  // Check for timestamps (basic regex for common ISO formats or unix timestamps)
  const timestampRegex = /"timestamp"\s*:\s*("\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?"|\d{13})/g;
  if (timestampRegex.test(jsonStr)) {
    violations.push("Found timestamp in artifact");
  }

  // Check for non-deterministic IDs like UUIDs
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  if (uuidRegex.test(jsonStr)) {
    violations.push("Found non-deterministic ID (UUID) in artifact");
  }

  // Stable ordering is guaranteed by canonicalizeJson
  // We can verify this by checking if canonicalizeJson(artifact) == canonicalizeJson(JSON.parse(JSON.stringify(artifact)))
  // But that's always true for our implementation.

  return {
    isDeterministic: violations.length === 0,
    violations
  };
}
