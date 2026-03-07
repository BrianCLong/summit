import Ajv from "ajv";
import addFormats from "ajv-formats";
import { registerCogGeoSchemas } from "../schemas/registerCogGeoSchemas.js";

// We'll mock the write set envelope for now to avoid dealing with the external package if it doesn't exist
const mockWriteSetEnvelope = {
  "$id": "https://schemas.summit.dev/writeset/WriteSetEnvelope.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WriteSetEnvelopeMock",
  "type": "object",
  "additionalProperties": true
};

export function createWriteSetValidatorWithCogGeo() {
  const ajv = new Ajv.default({ allErrors: true, strict: false });
  // Type assertion for ajv-formats since its types can be wonky
  (addFormats as any)(ajv);

  // Register mock schema
  ajv.addSchema(mockWriteSetEnvelope);

  // Register CogGeo schemas + envelope extension
  registerCogGeoSchemas(ajv as any);

  const validate = ajv.getSchema(mockWriteSetEnvelope.$id) ?? ajv.compile(mockWriteSetEnvelope);

  return { ajv, validate };
}
