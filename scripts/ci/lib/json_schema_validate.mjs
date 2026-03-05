import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

export function validateSchema(schema, data) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid, errors: validate.errors };
}
