import { canonicalizeJson } from "../utils/canonical-json";

export function checkSchemaEquality(schema1: any, schema2: any): boolean {
  // Use canonical serialization instead of JSON.stringify
  return canonicalizeJson(schema1) === canonicalizeJson(schema2);
}
