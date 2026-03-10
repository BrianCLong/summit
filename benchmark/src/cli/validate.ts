import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemasDir = path.join(__dirname, '../schemas');

export function loadSchema(schemaName: string) {
  const schemaPath = path.join(schemasDir, schemaName);
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

// Ensure compile is only called once per schema
export function validate(data: any, schemaName: string) {
  const schema = loadSchema(schemaName);

  // Try to get existing compiled schema, or compile it if it doesn't exist
  let validateFn = ajv.getSchema(schema.$id);
  if (!validateFn) {
    ajv.addSchema(schema);
    validateFn = ajv.getSchema(schema.$id);
  }

  if (!validateFn) {
      throw new Error(`Failed to compile or retrieve schema ${schemaName}`);
  }

  const valid = validateFn(data);
  if (!valid) {
    return { valid: false, errors: validateFn.errors };
  }
  return { valid: true };
}
