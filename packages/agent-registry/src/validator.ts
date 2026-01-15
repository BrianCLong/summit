import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// We will load the schema from the root schemas directory at runtime or compile time
// For this implementation, we assume the schema is passed or loaded from a known location
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, "../../../schemas/agent_spec_v1.schema.json");

export class AgentSpecValidator {
  private ajv: Ajv;
  private validate: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.loadSchema();
  }

  private loadSchema() {
    try {
        const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        const schema = JSON.parse(schemaContent);
        this.validate = this.ajv.compile(schema);
    } catch (error) {
        // Fallback for when running in different contexts (e.g. from root vs package)
        // In a real build we might embed the schema or have a better resolution strategy
        console.warn(`Could not load schema from ${SCHEMA_PATH}, validation might fail setup.`);
        throw error;
    }
  }

  public validateSpec(spec: any): { valid: boolean; errors: string[] } {
    const valid = this.validate(spec);
    if (!valid) {
      return {
        valid: false,
        errors: this.validate.errors?.map((e: any) => `${e.instancePath} ${e.message}`) || ["Unknown error"],
      };
    }
    return { valid: true, errors: [] };
  }
}
