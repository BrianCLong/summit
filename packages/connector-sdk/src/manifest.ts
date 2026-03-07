import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ConnectorManifest } from "./types.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const manifestSchemaPath = path.resolve(process.cwd(), "schemas/connectors/connector-manifest.schema.json");
const manifestSchema = JSON.parse(fs.readFileSync(manifestSchemaPath, "utf8"));
const validate = ajv.compile(manifestSchema);

export function loadManifest(filePath: string): ConnectorManifest {
  const raw = YAML.parse(fs.readFileSync(filePath, "utf8"));
  const ok = validate(raw);
  if (!ok) {
    const errors = (validate.errors ?? []).map(e => `${e.instancePath} ${e.message}`).join("; ");
    throw new Error(`Invalid connector manifest at ${filePath}: ${errors}`);
  }
  return raw as ConnectorManifest;
}
