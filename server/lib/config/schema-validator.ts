import Ajv, { ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';
import { SecretManager, SecretManagerOptions } from '../secrets/secret-manager';

export class SchemaValidator {
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();
  private secretManager: SecretManager;

  constructor(secretManager = new SecretManager()) {
    this.ajv = new Ajv({ allErrors: true });
    this.secretManager = secretManager;
    this.loadSchemas();
  }

  configureSecrets(options: SecretManagerOptions) {
    this.secretManager.updateOptions(options);
  }

  private loadSchemas() {
    const schemaDir = path.join(__dirname, '../../../config/schemas');
    const schemaFiles = fs.readdirSync(schemaDir).filter(file => file.endsWith('.schema.json'));
    for (const file of schemaFiles) {
      const schemaName = path.basename(file, '.schema.json');
      const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf-8'));
      this.schemas.set(schemaName, schema);
      this.ajv.addSchema(schema, schemaName);
    }
  }

  public validate(config: any, schemaName: string): any {
    const interpolatedConfig = this.interpolate(config);
    const resolvedConfig = this.secretManager.resolveConfig(interpolatedConfig);

    const validate = this.ajv.getSchema(schemaName);
    if (!validate) {
      throw new Error(`Schema ${schemaName} not found.`);
    }

    if (!validate(resolvedConfig)) {
      throw new Error(this.formatErrors(validate.errors));
    }

    return resolvedConfig;
  }

  private interpolate(config: any): any {
    const configString = JSON.stringify(config);
    const interpolatedString = configString.replace(/\${(.*?)}/g, (_, envVar) => {
      const value = process.env[envVar];
      if (value === undefined) {
        throw new Error(`Environment variable ${envVar} not set.`);
      }
      return value;
    });
    return JSON.parse(interpolatedString);
  }

  private formatErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors) {
      return 'Unknown validation error';
    }
    return errors.map(error => `  - ${error.instancePath} ${error.message}`).join('\n');
  }
}

export const validator = new SchemaValidator();
