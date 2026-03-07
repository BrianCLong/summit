export type SchemaValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateAgainstSchema(_payload: unknown, _schemaPath: string): SchemaValidationResult {
  return { ok: true, errors: [] };
}
