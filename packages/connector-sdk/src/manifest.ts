import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { ConnectorManifest } from "./types";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

export class ManifestValidator {
  private ajv: Ajv;
  private manifestSchema: any;

  constructor(schemaPath?: string) {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);

    const defaultSchemaPath = path.join(
      __dirname,
      "../../../schemas/connectors/connector-manifest.schema.json"
    );
    const p = schemaPath || defaultSchemaPath;

    if (fs.existsSync(p)) {
      this.manifestSchema = JSON.parse(fs.readFileSync(p, "utf-8"));
      this.ajv.compile(this.manifestSchema);
    }
  }

  public validate(manifest: any): { valid: boolean; errors?: any } {
    if (!this.manifestSchema) {
      throw new Error("Schema not loaded");
    }
    const validate = this.ajv.getSchema(
      "https://summit.local/schemas/connectors/connector-manifest.schema.json"
    );
    if (!validate) {
      throw new Error("Schema not compiled");
    }

    const valid = validate(manifest);
    return {
      valid: valid as boolean,
      errors: validate.errors,
    };
  }

  public load(filePath: string): ConnectorManifest {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const manifest = yaml.load(fileContent) as any;

    const validation = this.validate(manifest);
    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${JSON.stringify(validation.errors, null, 2)}`);
    }

    return manifest as ConnectorManifest;
  }
}
