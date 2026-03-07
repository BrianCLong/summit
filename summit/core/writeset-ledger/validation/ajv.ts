import Ajv from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import claimSchema from "../schemas/claim.schema.json";
import provenanceSchema from "../schemas/provenance.schema.json";
import writesetSchema from "../schemas/writeset.schema.json";

export interface SchemaValidationIssue {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
  params?: Record<string, unknown>;
}

export interface SchemaValidationResult<T = unknown> {
  ok: boolean;
  data?: T;
  issues: SchemaValidationIssue[];
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

addFormats(ajv);

ajv.addSchema(claimSchema, "claim.schema.json");
ajv.addSchema(provenanceSchema, "provenance.schema.json");
ajv.addSchema(writesetSchema, "writeset.schema.json");

function mapErrors(errors: ErrorObject[] | null | undefined): SchemaValidationIssue[] {
  if (!errors?.length) return [];
  return errors.map((err) => ({
    instancePath: err.instancePath || "/",
    schemaPath: err.schemaPath,
    keyword: err.keyword,
    message: err.message ?? "Schema validation error",
    params: err.params as Record<string, unknown>,
  }));
}

export function getValidator(schemaId: "claim.schema.json" | "provenance.schema.json" | "writeset.schema.json"): ValidateFunction {
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    throw new Error(`AJV validator not found for schema: ${schemaId}`);
  }
  return validator;
}

export function validateAgainstSchema<T = unknown>(
  schemaId: "claim.schema.json" | "provenance.schema.json" | "writeset.schema.json",
  payload: unknown,
): SchemaValidationResult<T> {
  const validator = getValidator(schemaId);
  const ok = validator(payload);
  return {
    ok: Boolean(ok),
    data: ok ? (payload as T) : undefined,
    issues: mapErrors(validator.errors),
  };
}
