import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define Types
export interface OsintLicense {
  name: string;
  url?: string;
}

export interface OsintProvenance {
  source: string;
  method: 'scrape' | 'api' | 'manual' | 'purchase';
}

export interface OsintPrivacy {
  has_pii: boolean;
  retention_policy?: 'transient' | 'standard' | 'restricted';
}

export interface OsintAsset {
  asset_id: string;
  license: OsintLicense;
  provenance: OsintProvenance;
  privacy: OsintPrivacy;
  shareability: 'public' | 'internal' | 'restricted';
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Load Schema
const schemaPath = path.resolve(__dirname, '../../.github/policies/osint/osint-policy.schema.json');
let schema: any;
try {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  schema = JSON.parse(schemaContent);
} catch (e) {
  console.warn('Could not load OSINT policy schema from default path. Validation requires schema file.');
}

export function validateOsintAsset(asset: any, customSchemaPath?: string): ValidationResult {
  const ajv = new Ajv({ allErrors: true });

  let currentSchema = schema;
  if (customSchemaPath) {
    try {
        const content = fs.readFileSync(customSchemaPath, 'utf-8');
        currentSchema = JSON.parse(content);
    } catch (e) {
        return { valid: false, errors: [`Could not load schema from ${customSchemaPath}`] };
    }
  }

  if (!currentSchema) {
    return { valid: false, errors: ['Schema not loaded'] };
  }

  const validate = ajv.compile(currentSchema);
  const valid = validate(asset);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors?.map(err => `${err.instancePath} ${err.message}`)
    };
  }

  // Additional Logic Checks (if any not covered by schema)
  // Example: If shareability is public, license must be compatible (simple check)
  if (asset.shareability === 'public' && asset.license?.name === 'Proprietary') {
     return { valid: false, errors: ['Public assets cannot have Proprietary license'] };
  }

  return { valid: true };
}
