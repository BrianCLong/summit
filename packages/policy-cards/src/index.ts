import { canonicalizePolicy } from "./canonicalize.js";
// In a real impl, we would import the schema validation logic here.

export type PolicyValidationResult = { ok: boolean; errors: string[]; hash?: string };

export { canonicalizePolicy };

export function validatePolicy(input: string): PolicyValidationResult {
  const canonical = canonicalizePolicy(input);
  // Placeholder validation logic.
  // In PR2/future, this will load the schema and validate.

  if (input.includes("INVALID_POLICY")) {
      return { ok: false, errors: ["Policy contains forbidden keyword"], hash: undefined };
  }

  // Return a mock hash for now.
  const hash = "SHA256-" + canonical.length;
  return { ok: true, errors: [], hash };
}
