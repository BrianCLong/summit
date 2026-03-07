import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type EvidenceValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateEvidencePayload(
  schema: object,
  payload: unknown,
): EvidenceValidationResult {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(payload);

  return {
    valid: Boolean(valid),
    errors: validate.errors?.map((error) => `${error.instancePath} ${error.message}`) ?? [],
  };
}
