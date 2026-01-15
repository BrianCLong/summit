import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SecretManager } from '../secrets/secret-manager';

export class SchemaValidator {
  private ajv: InstanceType<typeof Ajv>;
  private schemas: Map<string, string> = new Map();
  private secretManager?: SecretManager;

  constructor(secretManager?: SecretManager) {
    this.secretManager = secretManager;
    this.ajv = new Ajv2020({ allErrors: true, strict: false }) as InstanceType<typeof Ajv>;
    addFormats(this.ajv);
    this.loadSchemas();
  }

  private loadSchemas() {
    const schemaDir = path.resolve(process.cwd(), 'config/schema');
    if (!fs.existsSync(schemaDir)) {
      return;
    }

    const schemaFiles = fs
      .readdirSync(schemaDir)
      .filter((file: string) => file.match(/\.schema\.(json|ya?ml)$/));
    for (const file of schemaFiles) {
      const schemaName = path.basename(file).replace(/\.schema\.(json|ya?ml)$/i, '');
      const schemaPath = path.join(schemaDir, file);
      const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
      const schema = file.endsWith('.json') ? JSON.parse(rawSchema) : (yaml.load(rawSchema) as any);
      const schemaId = schema.$id || schemaName;
      this.schemas.set(schemaName, schemaId);
      this.ajv.addSchema(schema, schemaId);
    }
  }

  public validate<T>(config: unknown, schemaName: string): T {
    const interpolatedConfig = this.interpolate(config);
    const resolvedConfig = this.secretManager?.resolveConfig(interpolatedConfig) ?? this.resolveSecrets(interpolatedConfig);

    const validate = this.getValidator(schemaName);
    if (!validate) {
      throw new Error(`Schema ${schemaName} not found.`);
    }

    if (!validate(resolvedConfig)) {
      throw new Error(this.formatErrors(validate.errors));
    }

    return resolvedConfig as T;
  }

  private getValidator(schemaName: string): ValidateFunction | undefined {
    const schemaId = this.schemas.get(schemaName) ?? schemaName;
    return this.ajv.getSchema(schemaId) ?? this.ajv.getSchema(schemaName);
  }

  private interpolate(config: unknown): unknown {
    const configString = JSON.stringify(config);
    const interpolatedString = configString.replace(/\${(.*?)}/g, (_, envVar) => {
      const value = process.env[envVar];
      if (value === undefined) {
        throw new Error(`Environment variable ${envVar} not set.`);
      }
      return value;
    });
    return JSON.parse(interpolatedString) as unknown;
  }

  private resolveSecrets(config: unknown): unknown {
    const configString = JSON.stringify(config);
    const resolvedString = configString.replace(/"aws-ssm:(.*?)"/g, (_, secretPath) => {
      // In a real implementation, you would fetch this from AWS SSM.
      // For this example, we'll use a dummy value.
      console.log(`Resolving secret from AWS SSM: ${secretPath}`);
      return `"resolved-${secretPath.split('/').pop()}"`;
    });
    return JSON.parse(resolvedString) as unknown;
  }

  private formatErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors) {
      return 'Unknown validation error';
    }
    return errors.map(error => `  - ${error.instancePath} ${error.message}`).join('\n');
  }
}

export const validator = new SchemaValidator();
